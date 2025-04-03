import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { KenmeiManga } from "../api/kenmei/types";
import { AniListManga, MangaMatchResult } from "../api/anilist/types";
import { MangaMatchingPanel } from "../components/import/MangaMatchingPanel";
import { MangaSearchPanel } from "../components/import/MangaSearchPanel";
import { batchMatchManga } from "../api/matching/manga-search-service";
import { useAuth } from "../hooks/useAuth";
import { AlertCircle } from "lucide-react";
import {
  getKenmeiData,
  STORAGE_KEYS,
  storage,
  getSavedMatchResults,
  mergeMatchResults,
} from "../utils/storage";

// Add a global object to track matching process state
declare global {
  interface Window {
    activeAbortController?: AbortController;
    matchingProcessState?: {
      isRunning: boolean;
      progress: {
        current: number;
        total: number;
        currentTitle: string;
      };
      statusMessage: string;
      detailMessage: string | null;
      timeEstimate: {
        startTime: number;
        averageTimePerManga: number;
        estimatedRemainingSeconds: number;
      };
      lastUpdated: number;
    };
  }
}

// Define a type for API errors
interface ApiError {
  name?: string;
  message?: string;
  status?: number;
  statusText?: string;
  stack?: string;
  errors?: Array<{ message: string }>;
  [key: string]: unknown;
}

export function ReviewPage() {
  const navigate = useNavigate();
  const { authState } = useAuth();

  // State for manga data
  const [manga, setManga] = useState<KenmeiManga[]>([]);
  const [matchResults, setMatchResults] = useState<MangaMatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    currentTitle: string | undefined;
  }>({ current: 0, total: 0, currentTitle: "" });
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<ApiError | null>(null);
  const [rematchWarning, setRematchWarning] = useState<string | null>(null);
  const [isCacheClearing, setIsCacheClearing] = useState(false);
  const [cacheClearingCount, setCacheClearingCount] = useState(0);

  // State for manual search
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTarget, setSearchTarget] = useState<KenmeiManga | undefined>(
    undefined,
  );
  const [bypassCache, setBypassCache] = useState(false);
  const [freshSearch, setFreshSearch] = useState(false);

  // Add state for status filtering and rematching
  const [selectedStatuses, setSelectedStatuses] = useState({
    pending: true,
    skipped: true,
    conflict: false,
    matched: false,
    manual: false,
    unmatched: true, // Add new status for completely unmatched manga
  });
  const [showRematchOptions, setShowRematchOptions] = useState(false);

  // Add a new state for displaying additional matching status
  const [statusMessage, setStatusMessage] = useState(
    "Preparing to match manga...",
  );
  const [detailMessage, setDetailMessage] = useState<string | null>(null);

  // Add state for cancellation
  const [isCancelling, setIsCancelling] = useState(false);
  const cancelMatchingRef = useRef(false);

  // Flag to prevent multiple startMatching calls
  const matchingInitialized = useRef(false);

  // Add a state to track if component is initializing
  const [isInitializing, setIsInitializing] = useState(true);

  // Add state for time tracking
  const [timeEstimate, setTimeEstimate] = useState<{
    startTime: number;
    averageTimePerManga: number;
    estimatedRemainingSeconds: number;
  }>({
    startTime: 0,
    averageTimePerManga: 0,
    estimatedRemainingSeconds: 0,
  });

  // Add additional refs for stable time tracking
  const processingStartTimeRef = useRef<number>(0);
  const lastProcessedCountRef = useRef<number>(0);
  const processingTimesRef = useRef<number[]>([]);
  const lastTimeUpdateRef = useRef<number>(0);

  // Add a new state to track pending manga that haven't been processed yet
  const [pendingManga, setPendingManga] = useState<KenmeiManga[]>([]);

  /**
   * Calculate a more stable time estimate using recent processing times
   */
  const calculateTimeEstimate = (current: number, total: number) => {
    const now = Date.now();

    // Only update time estimate if we've made progress
    if (current <= lastProcessedCountRef.current) {
      return;
    }

    // Calculate time since last update
    const timeSinceLastUpdate = now - lastTimeUpdateRef.current;

    // Calculate items processed since last update
    const itemsProcessed = current - lastProcessedCountRef.current;

    // Only update if we've processed at least one item and time has passed
    if (itemsProcessed > 0 && timeSinceLastUpdate > 0) {
      // Calculate time per item for this batch
      const timePerItem = timeSinceLastUpdate / itemsProcessed;

      // Add to our processing times array (limit to last 10 values for a moving average)
      processingTimesRef.current.push(timePerItem);
      if (processingTimesRef.current.length > 10) {
        processingTimesRef.current.shift();
      }

      // Calculate average time per item from our collected samples
      const avgTimePerItem =
        processingTimesRef.current.reduce((sum, time) => sum + time, 0) /
        processingTimesRef.current.length;

      // Calculate remaining time based on average speed
      const remainingItems = total - current;
      const estimatedRemainingMs = avgTimePerItem * remainingItems;

      // Cap at 24 hours for sanity
      const maxTimeMs = 24 * 60 * 60 * 1000;
      const cappedEstimatedMs = Math.min(estimatedRemainingMs, maxTimeMs);

      // Update state with new estimate
      const newEstimate = {
        startTime: processingStartTimeRef.current,
        averageTimePerManga: avgTimePerItem,
        estimatedRemainingSeconds: Math.round(cappedEstimatedMs / 1000),
      };

      setTimeEstimate(newEstimate);

      // Update global tracking state
      if (window.matchingProcessState) {
        window.matchingProcessState.timeEstimate = newEstimate;
        window.matchingProcessState.lastUpdated = now;
      }

      // Update refs for next calculation
      lastProcessedCountRef.current = current;
      lastTimeUpdateRef.current = now;
    }
  };

  /**
   * Calculate pending manga that still need to be processed
   */
  const calculatePendingManga = (
    processedResults: MangaMatchResult[],
    allManga: KenmeiManga[],
  ) => {
    // Create a set of all processed manga IDs for faster lookup
    const processedIds = new Set(processedResults.map((r) => r.kenmeiManga.id));

    // Find manga that haven't been processed yet
    const pendingManga = allManga.filter((m) => !processedIds.has(m.id));

    if (pendingManga.length > 0) {
      console.log(
        `Found ${pendingManga.length} manga that still need to be processed`,
      );
    }

    return pendingManga;
  };

  // Initial data loading
  useEffect(() => {
    console.log("*** INITIALIZATION START ***");
    console.log("Initial states:", {
      isLoading,
      hasError: !!error,
      matchResultsLength: matchResults.length,
      pendingMangaLength: pendingManga.length,
      isMatchingInitialized: matchingInitialized.current,
    });

    // Check if there's an ongoing matching process
    if (window.matchingProcessState?.isRunning) {
      console.log("Detected running matching process, restoring state");

      // Restore the matching process state
      setIsLoading(true);
      setProgress({
        current: window.matchingProcessState.progress.current,
        total: window.matchingProcessState.progress.total,
        currentTitle: window.matchingProcessState.progress.currentTitle,
      });
      setStatusMessage(window.matchingProcessState.statusMessage);
      setDetailMessage(window.matchingProcessState.detailMessage);
      setTimeEstimate(window.matchingProcessState.timeEstimate);

      // Mark as initialized to prevent auto-starting
      matchingInitialized.current = true;
      setIsInitializing(false);
      return;
    }

    // Set initializing state to true
    setIsInitializing(true);

    // Skip if this effect has already been run
    if (matchingInitialized.current) {
      console.log(
        "Matching already initialized, skipping duplicate initialization",
      );
      setIsInitializing(false);
      return;
    }

    console.log("Initializing MatchingPage component...");

    // Get imported data from storage to have it available for calculations
    const importedData = getKenmeiData();
    const importedManga = importedData?.manga || [];

    if (importedManga.length > 0) {
      console.log(`Found ${importedManga.length} imported manga from storage`);
      // Store the imported manga data for later use
      setManga(importedManga);
    } else {
      console.log("No imported manga found in storage");
    }

    // First check for pending manga from a previously interrupted operation - MOVED UP before preloading service
    console.log("Checking for pending manga in storage...");
    const pendingMangaJson = storage.getItem(STORAGE_KEYS.PENDING_MANGA);
    if (pendingMangaJson) {
      try {
        const pendingManga = JSON.parse(pendingMangaJson) as KenmeiManga[];
        if (pendingManga.length > 0) {
          console.log(
            `Found ${pendingManga.length} pending manga from interrupted operation`,
          );
          setPendingManga(pendingManga);
          console.log("Setting pendingManga state with found pending manga");

          // Clear any error message since we're showing the resume notification instead
          setError(null);

          // End initialization when we've found pending manga
          setIsInitializing(false);
        } else {
          console.log("Pending manga list was empty");
        }
      } catch (e) {
        console.error("Failed to parse pending manga from storage:", e);
      }
    } else {
      console.log("No pending manga found in storage");
    }

    // Preload the cache service to ensure it's initialized
    import("../api/matching/manga-search-service").then((module) => {
      console.log("Preloaded manga search service");
      // Force cache sync
      if (module.cacheDebugger) {
        module.cacheDebugger.forceSyncCaches();
      }

      // Check if we have saved match results before starting a new matching process
      console.log("Checking for saved match results...");
      const savedResults = getSavedMatchResults();
      if (
        savedResults &&
        Array.isArray(savedResults) &&
        savedResults.length > 0
      ) {
        console.log(
          `Found ${savedResults.length} existing match results - loading from cache`,
        );

        // Check how many matches have already been reviewed
        const reviewedCount = savedResults.filter(
          (m) =>
            m.status === "matched" ||
            m.status === "manual" ||
            m.status === "skipped",
        ).length;

        console.log(
          `${reviewedCount} manga have already been reviewed (${Math.round((reviewedCount / savedResults.length) * 100)}% complete)`,
        );

        // If we don't have pending manga from storage but do have imported manga, calculate what might still need processing
        if (!pendingMangaJson && importedManga.length > 0) {
          console.log(
            "No pending manga in storage but we have imported manga - calculating unmatched manga",
          );
          const calculatedPendingManga = calculatePendingManga(
            savedResults,
            importedManga,
          );
          if (calculatedPendingManga.length > 0) {
            console.log(
              `Calculated ${calculatedPendingManga.length} manga that still need to be processed`,
            );
            savePendingManga(calculatedPendingManga);
            console.log(
              `Saved ${calculatedPendingManga.length} pending manga to storage for resume`,
            );
          } else {
            console.log("No pending manga found in calculation");
          }
        }

        // Mark as initialized
        matchingInitialized.current = true;
        // Set the saved results directly
        setMatchResults(savedResults);
        console.log("*** INITIALIZATION COMPLETE - Using saved results ***");
        return; // Skip further initialization
      } else {
        console.log("No saved match results found");
      }

      if (importedManga.length && !matchingInitialized.current) {
        console.log("Starting initial matching process with imported manga");
        matchingInitialized.current = true;

        // Start matching process automatically
        startMatching(importedManga);
      } else if (!importedManga.length) {
        // Redirect back to import page if no data
        console.log("No imported manga found, redirecting to import page");
        setError("No manga data found. Please import your data first.");

        // Delay redirect slightly to show the error
        setTimeout(() => {
          // Clear any pending manga data before redirecting
          savePendingManga([]);
          navigate({ to: "/import" });
        }, 2000);
      }

      // Make sure we mark initialization as complete
      setIsInitializing(false);
      console.log("*** INITIALIZATION COMPLETE ***");
    });

    // Cleanup function to ensure initialization state is reset
    return () => {
      setIsInitializing(false);
    };
  }, [navigate]);

  // Add a new effect to debug matchResults changes
  useEffect(() => {
    if (matchResults.length > 0) {
      console.log("matchResults updated - Current status counts:");
      const statusCounts = {
        matched: matchResults.filter((m) => m.status === "matched").length,
        pending: matchResults.filter((m) => m.status === "pending").length,
        conflict: matchResults.filter((m) => m.status === "conflict").length,
        manual: matchResults.filter((m) => m.status === "manual").length,
        skipped: matchResults.filter((m) => m.status === "skipped").length,
      };
      console.log("Status counts:", statusCounts);
    }
  }, [matchResults]);

  // Add debug effect for pendingManga
  useEffect(() => {
    console.log(
      `pendingManga state updated: ${pendingManga.length} manga pending`,
    );

    // When pending manga is updated and has items, we can end initialization state
    if (pendingManga.length > 0) {
      // Clear any error related to cancellation
      if (error && error.includes("Matching process was cancelled")) {
        setError(null);
      }
      setIsInitializing(false);
    }
  }, [pendingManga, error]);

  // Add an effect to ensure pendingManga persists on unmount if the process wasn't completed
  useEffect(() => {
    // Return cleanup function
    return () => {
      // If we have pending manga and we're not in a loading state (which means process is running)
      if (pendingManga.length > 0 && !isLoading) {
        console.log(
          `Component unmounting - ensuring ${pendingManga.length} pending manga are saved to storage`,
        );
        // Save the current pending manga to ensure it persists
        storage.setItem(
          STORAGE_KEYS.PENDING_MANGA,
          JSON.stringify(pendingManga),
        );
      }
    };
  }, [pendingManga, isLoading]);

  /**
   * Start the batch matching process
   */
  const startMatching = async (
    mangaList: KenmeiManga[],
    forceSearch: boolean = false,
  ) => {
    if (!mangaList.length) return;

    // Check if matching is already in progress globally
    if (window.matchingProcessState?.isRunning) {
      console.log(
        "Matching process is already running, using existing process",
      );

      // Just update our local state to match the global state
      setIsLoading(true);
      setProgress({
        current: window.matchingProcessState.progress.current,
        total: window.matchingProcessState.progress.total,
        currentTitle: window.matchingProcessState.progress.currentTitle,
      });
      setStatusMessage(window.matchingProcessState.statusMessage);
      setDetailMessage(window.matchingProcessState.detailMessage);

      return;
    }

    // Reset cancellation flag
    cancelMatchingRef.current = false;
    setIsCancelling(false);

    // Check if we have an access token
    if (!authState.accessToken) {
      setError(
        "You need to be authenticated with AniList to match manga. Please go to Settings and connect your AniList account.",
      );
      return;
    }

    // Set bypass cache flag if we're forcing a fresh search
    if (forceSearch) {
      setBypassCache(true);
      console.log("REMATCH: Bypassing cache for fresh search from AniList API");
    } else {
      setBypassCache(false);
      console.log("Using cached data if available");
    }

    setIsLoading(true);
    setError(null);
    setDetailedError(null);
    setProgress({ current: 0, total: mangaList.length, currentTitle: "" });
    setDetailMessage(null);

    // Reset time tracking state and refs
    processingStartTimeRef.current = Date.now();
    lastProcessedCountRef.current = 0;
    lastTimeUpdateRef.current = processingStartTimeRef.current;
    processingTimesRef.current = [];

    // Store the list of manga to process for potential resume
    setPendingManga(mangaList);

    // Initialize time tracking state
    setTimeEstimate({
      startTime: processingStartTimeRef.current,
      averageTimePerManga: 0,
      estimatedRemainingSeconds: 0,
    });

    // Initialize global tracking state
    window.matchingProcessState = {
      isRunning: true,
      progress: {
        current: 0,
        total: mangaList.length,
        currentTitle: "",
      },
      statusMessage: "Preparing to match manga...",
      detailMessage: null,
      timeEstimate: {
        startTime: processingStartTimeRef.current,
        averageTimePerManga: 0,
        estimatedRemainingSeconds: 0,
      },
      lastUpdated: Date.now(),
    };

    // Create a new AbortController and store it globally
    const abortController = new AbortController();
    window.activeAbortController = abortController;

    try {
      // Import from the manga search service to check cache status
      const { cacheDebugger } = await import(
        "../api/matching/manga-search-service"
      );

      // Check current cache status
      const cacheStatus = cacheDebugger.getCacheStatus();
      console.log("Cache status before matching:", cacheStatus);

      if (
        cacheStatus.inMemoryCache > 0 ||
        cacheStatus.localStorage.mangaCache > 0
      ) {
        // We have some cached data, report it
        const totalCachedItems =
          cacheStatus.inMemoryCache +
          (cacheStatus.localStorage.mangaCache > cacheStatus.inMemoryCache
            ? cacheStatus.localStorage.mangaCache - cacheStatus.inMemoryCache
            : 0);

        console.log(
          `Found ${totalCachedItems} cached manga entries that may help with matching`,
        );
        setStatusMessage(
          `Found ${totalCachedItems} cached manga entries from previous searches...`,
        );
      } else {
        setStatusMessage(
          "No cached data found, will perform fresh searches for all manga",
        );
      }

      // Force cache sync to ensure we have the latest data
      cacheDebugger.forceSyncCaches();

      // Count how many manga have known AniList IDs for more efficient fetching
      const withKnownIds = mangaList.filter(
        (manga) => manga.anilistId && Number.isInteger(manga.anilistId),
      ).length;

      if (withKnownIds > 0) {
        console.log(
          `Found ${withKnownIds} manga with known AniList IDs - will use batch fetching for these`,
        );
        setStatusMessage(
          `Found ${withKnownIds} manga with known AniList IDs - using efficient batch fetching`,
        );
      } else {
        setStatusMessage("Starting matching process...");
      }

      // Setup cancellation listener
      const handleCancellation = () => {
        if (cancelMatchingRef.current) {
          console.log(
            "Cancellation detected - immediately aborting all operations",
          );
          abortController.abort();
          throw new Error("Matching process was cancelled by user");
        }
      };

      // Process manga in batches
      const results = await batchMatchManga(
        mangaList,
        authState.accessToken,
        {
          batchSize: 5,
          searchPerPage: 10,
          maxSearchResults: 20,
          matchConfig: {
            confidenceThreshold: 75,
            preferEnglishTitles: true,
            useAlternativeTitles: true,
          },
          bypassCache: forceSearch, // Pass the forceSearch flag to bypass cache
        },
        (current, total, currentTitle) => {
          // Check for cancellation - immediately abort if cancelled
          handleCancellation();

          // Update progress
          setProgress({ current, total, currentTitle });

          // Update global tracking state
          if (window.matchingProcessState) {
            window.matchingProcessState.progress = {
              current,
              total,
              currentTitle: currentTitle || "",
            };
            window.matchingProcessState.lastUpdated = Date.now();
          }

          // Update status message to show we're doing fresh searches
          const completionPercent = Math.min(
            100,
            Math.round((current / total) * 100),
          );
          const statusMsg = `Fresh search for selected manga (${completionPercent}% complete)`;
          setStatusMessage(statusMsg);
          setDetailMessage(
            `Processing: ${Math.min(current, total)} of ${total}`,
          );

          // Update global tracking state with fresh search message
          if (window.matchingProcessState) {
            window.matchingProcessState.statusMessage = statusMsg;
            window.matchingProcessState.detailMessage = `Processing: ${Math.min(current, total)} of ${total}`;
          }

          calculateTimeEstimate(current, total);

          // Check if we're in the phase of batch fetching known IDs
          if (withKnownIds > 0 && current <= withKnownIds) {
            // We're likely processing the known IDs first
            console.log(
              `Processing manga with known IDs: ${current} of ${withKnownIds}`,
            );
            setStatusMessage(`Batch fetching manga with known IDs`);
            setDetailMessage(`${current} of ${withKnownIds}`);

            // Update global tracking state
            if (window.matchingProcessState) {
              window.matchingProcessState.statusMessage = `Batch fetching manga with known IDs`;
              window.matchingProcessState.detailMessage = `${current} of ${withKnownIds}`;
            }
          } else {
            const remainingItems = Math.max(0, total - current);
            const completionPercent = Math.min(
              100,
              Math.round((current / total) * 100),
            );
            setStatusMessage(`Matching manga (${completionPercent}% complete)`);
            setDetailMessage(
              `Processing: ${Math.min(current, total)} of ${total} (${remainingItems} remaining)`,
            );

            // Update global tracking state
            if (window.matchingProcessState) {
              window.matchingProcessState.statusMessage = `Matching manga (${completionPercent}% complete)`;
              window.matchingProcessState.detailMessage = `Processing: ${Math.min(current, total)} of ${total} (${remainingItems} remaining)`;
            }
          }
        },
        () => {
          // Improved cancellation check
          const isCancelled = cancelMatchingRef.current;
          if (isCancelled) {
            console.log(
              "Cancel flag detected, processing will stop after current operation",
            );
            // Signal abort to stop any API requests
            abortController.abort();
          }
          return isCancelled;
        },
        abortController.signal, // Pass the abort signal to the batch process
      );

      // If we were cancelled, handle partial results
      if (cancelMatchingRef.current) {
        console.log("Operation was cancelled - handling partial results");
        if (results.length > 0) {
          setMatchResults(results);

          // Save whatever results we have
          try {
            storage.setItem(
              STORAGE_KEYS.MATCH_RESULTS,
              JSON.stringify(results),
            );

            // Save the remaining manga that weren't processed yet
            const remainingManga = calculatePendingManga(results, mangaList);

            if (remainingManga.length > 0) {
              savePendingManga(remainingManga);
            }
          } catch (storageError) {
            console.error(
              "Failed to save partial match results to storage:",
              storageError,
            );
          }
        }
        setError(
          "Matching process was cancelled. You can resume from where you left off using the Resume button.",
        );
        return;
      }

      // Check cache status after matching
      const finalCacheStatus = cacheDebugger.getCacheStatus();
      console.log("Cache status after matching:", finalCacheStatus);
      console.log(
        `Cache growth: ${finalCacheStatus.inMemoryCache - cacheStatus.inMemoryCache} new entries`,
      );

      // After calculating results and before setting them in state/storage
      // First check if we should load existing results before starting new matching
      // If the page is first initializing, check if we have existing results
      if (
        window.location.pathname.includes("/matching") &&
        !cancelMatchingRef.current
      ) {
        const savedResults = getSavedMatchResults();
        if (
          savedResults &&
          Array.isArray(savedResults) &&
          savedResults.length > 0
        ) {
          console.log(
            `Found ${savedResults.length} existing match results - loading cached progress`,
          );

          // Check how many matches have already been reviewed
          const reviewedCount = savedResults.filter(
            (m) =>
              m.status === "matched" ||
              m.status === "manual" ||
              m.status === "skipped",
          ).length;

          console.log(
            `${reviewedCount} manga have already been reviewed (${Math.round((reviewedCount / savedResults.length) * 100)}% complete)`,
          );

          setMatchResults(savedResults);
          setIsLoading(false);
          return; // Skip the matching process since we're loading saved results
        }
      }

      // Then at the very end, after calculating results
      // Merge with existing results to preserve user progress
      const mergedResults = mergeMatchResults(results);

      // Update state with the merged results
      setMatchResults(mergedResults);

      // Save the merged results to storage
      try {
        storage.setItem(
          STORAGE_KEYS.MATCH_RESULTS,
          JSON.stringify(mergedResults),
        );
        console.log(
          `Saved merged match results with ${mergedResults.filter((m) => m.status !== "pending").length} preserved user reviews`,
        );

        // Clean up the pending manga data since process completed successfully
        storage.removeItem(STORAGE_KEYS.PENDING_MANGA);
        setPendingManga([]);
      } catch (storageError) {
        console.error("Failed to save match results to storage:", storageError);
      }
    } catch (err: unknown) {
      console.error("Matching error:", err);

      // Check if this was a cancellation
      if (cancelMatchingRef.current) {
        setError("Matching process was cancelled");
        return;
      }

      let errorMessage = "An error occurred during the matching process.";
      const apiError: ApiError = err as ApiError;

      // Extract more detailed error info
      if (apiError?.message) {
        errorMessage += ` Error: ${apiError.message}`;
      }

      // Handle network errors
      if (
        apiError?.name === "TypeError" &&
        apiError?.message?.includes("fetch")
      ) {
        errorMessage =
          "Failed to connect to AniList API. Please check your internet connection and try again.";
      }

      // Handle API errors
      if (apiError?.status) {
        if (apiError.status === 401 || apiError.status === 403) {
          errorMessage =
            "Authentication failed. Please reconnect your AniList account in Settings.";
        } else if (apiError.status === 429) {
          errorMessage =
            "Rate limit exceeded. Please wait a few minutes and try again.";
        } else if (apiError.status >= 500) {
          errorMessage = "AniList server error. Please try again later.";
        }
      }

      setError(errorMessage);
      setDetailedError(apiError);
    } finally {
      setIsLoading(false);
      setIsCancelling(false);
      cancelMatchingRef.current = false;

      // Clear fresh search flag
      setFreshSearch(false);

      // Clear global tracking state when process finishes
      if (window.matchingProcessState) {
        window.matchingProcessState.isRunning = false;
      }
    }
  };

  /**
   * Save pending manga to storage
   */
  const savePendingManga = (mangaList: KenmeiManga[]) => {
    try {
      if (mangaList.length > 0) {
        console.log(
          `Saving ${mangaList.length} unprocessed manga for potential resume`,
        );
        storage.setItem(STORAGE_KEYS.PENDING_MANGA, JSON.stringify(mangaList));
        setPendingManga(mangaList);
        console.log(
          `Successfully saved ${mangaList.length} pending manga to storage`,
        );
      } else {
        // Clear pending manga when empty
        console.log("Clearing pending manga from storage");
        storage.removeItem(STORAGE_KEYS.PENDING_MANGA);
        setPendingManga([]);
        console.log("Successfully cleared pending manga from storage");
      }
    } catch (error) {
      console.error("Failed to save pending manga to storage:", error);
    }
  };

  /**
   * Resume the matching process from where it left off
   */
  const handleResumeMatching = () => {
    // Always clear error state first
    setError(null);

    if (pendingManga.length > 0) {
      console.log(
        `Resuming matching process with ${pendingManga.length} remaining manga`,
      );
      startMatching(pendingManga);
    } else {
      // Check if we have any unmatched manga in the results
      const unmatchedManga = matchResults
        .filter((r) => r.status === "pending")
        .map((r) => r.kenmeiManga);

      if (unmatchedManga.length > 0) {
        console.log(
          `Resuming with ${unmatchedManga.length} unmatched manga from results`,
        );
        startMatching(unmatchedManga);
      } else {
        // If we got here, there's nothing to resume
        console.log("No pending manga found to resume matching");
        savePendingManga([]); // Ensure pending manga is cleared
        setError("No pending manga found to resume matching.");
      }
    }
  };

  /**
   * Cancel resume mode and clear pending manga
   */
  const handleCancelResume = () => {
    if (
      window.confirm(
        "Are you sure you want to cancel the resume process? This will clear any pending manga and you'll have to start over.",
      )
    ) {
      savePendingManga([]);
      setError(null);
      console.log("Resume cancelled, pending manga cleared");
    }
  };

  /**
   * Retry the matching process
   */
  const handleRetry = () => {
    // Clear any pending manga data
    storage.removeItem(STORAGE_KEYS.PENDING_MANGA);
    setPendingManga([]);

    if (manga.length > 0) {
      startMatching(manga);
    }
  };

  /**
   * Handle manual search request
   */
  const handleManualSearch = (manga: KenmeiManga) => {
    console.log("handleManualSearch called with manga:", manga);

    // First try to find the match by ID
    let index = matchResults.findIndex(
      (match) => match.kenmeiManga.id === manga.id,
    );

    // If not found by ID, try alternative methods to find the manga
    if (index === -1) {
      console.log(
        `Could not find manga with ID ${manga.id}, trying fallback methods...`,
      );

      // Fallback 1: Try to find by exact title match
      index = matchResults.findIndex(
        (match) => match.kenmeiManga.title === manga.title,
      );

      if (index === -1) {
        // Fallback 2: Look for similar titles (case insensitive)
        index = matchResults.findIndex(
          (match) =>
            match.kenmeiManga.title.toLowerCase() === manga.title.toLowerCase(),
        );

        if (index === -1) {
          console.error(
            `Failed to find manga "${manga.title}" with ID ${manga.id} in matchResults`,
          );
          return;
        } else {
          console.log(
            `Found manga by case-insensitive title at index ${index}`,
          );
        }
      } else {
        console.log(`Found manga by exact title at index ${index}`);
      }
    } else {
      console.log(`Found manga by ID at index ${index}`);
    }

    // First close any existing panel to ensure it fully remounts
    setIsSearchOpen(false);

    // Small delay to ensure state updates before reopening
    setTimeout(() => {
      setSearchTarget(manga);
      setIsSearchOpen(true);

      // Enable bypass cache for manual searches
      setBypassCache(true);
    }, 10); // Very small delay is sufficient for React to process state updates
  };

  /**
   * Handle accepting a match
   */
  const handleAcceptMatch = (match: MangaMatchResult) => {
    console.log("handleAcceptMatch called with match:", match);

    // First try to find the match by ID
    let index = matchResults.findIndex(
      (m) => m.kenmeiManga.id === match.kenmeiManga.id,
    );

    // If not found by ID, try alternative methods
    if (index === -1) {
      console.log(
        `Could not find match with ID ${match.kenmeiManga.id}, trying fallback methods...`,
      );

      // Fallback 1: Try finding by exact title match
      index = matchResults.findIndex(
        (m) => m.kenmeiManga.title === match.kenmeiManga.title,
      );

      if (index === -1) {
        // Fallback 2: Try finding by case-insensitive title match
        index = matchResults.findIndex(
          (m) =>
            m.kenmeiManga.title.toLowerCase() ===
            match.kenmeiManga.title.toLowerCase(),
        );

        if (index === -1) {
          console.error(
            `Could not find match for "${match.kenmeiManga.title}" to update status`,
          );
          return;
        } else {
          console.log(
            `Found match by case-insensitive title at index ${index}`,
          );
        }
      } else {
        console.log(`Found match by exact title at index ${index}`);
      }
    } else {
      console.log(`Found match by ID at index ${index}`);
    }

    console.log(
      `Accepting match for ${match.kenmeiManga.title}, current status: ${match.status}`,
    );

    // Create a copy of the results and update the status
    const updatedResults = [...matchResults];

    // Create a new object reference to ensure React detects the change
    const updatedMatch = {
      ...match,
      status: "matched" as const,
      selectedMatch: match.anilistMatches?.[0]?.manga,
      matchDate: new Date(),
    };

    // Update the array with the new object
    updatedResults[index] = updatedMatch;

    console.log(
      `Updated match status to: ${updatedMatch.status}, title: ${updatedMatch.kenmeiManga.title}`,
    );

    // Set the state with the new array - This will trigger a re-render
    setMatchResults(updatedResults);

    // Save to storage to ensure it's consistent
    try {
      storage.setItem(
        STORAGE_KEYS.MATCH_RESULTS,
        JSON.stringify(updatedResults),
      );
      console.log("Successfully saved updated match results to storage");
    } catch (storageError) {
      console.error("Failed to save match results to storage:", storageError);
    }
  };

  /**
   * Handle rejecting/skipping a match
   */
  const handleRejectMatch = (match: MangaMatchResult) => {
    console.log("handleRejectMatch called with match:", match);

    // First try to find the match by ID
    let index = matchResults.findIndex(
      (m) => m.kenmeiManga.id === match.kenmeiManga.id,
    );

    // If not found by ID, try alternative methods
    if (index === -1) {
      console.log(
        `Could not find match with ID ${match.kenmeiManga.id}, trying fallback methods...`,
      );

      // Fallback 1: Try finding by exact title match
      index = matchResults.findIndex(
        (m) => m.kenmeiManga.title === match.kenmeiManga.title,
      );

      if (index === -1) {
        // Fallback 2: Try finding by case-insensitive title match
        index = matchResults.findIndex(
          (m) =>
            m.kenmeiManga.title.toLowerCase() ===
            match.kenmeiManga.title.toLowerCase(),
        );

        if (index === -1) {
          console.error(
            `Could not find match for "${match.kenmeiManga.title}" to skip/reject`,
          );
          return;
        } else {
          console.log(
            `Found match by case-insensitive title at index ${index}`,
          );
        }
      } else {
        console.log(`Found match by exact title at index ${index}`);
      }
    } else {
      console.log(`Found match by ID at index ${index}`);
    }

    console.log(
      `Skipping match for ${match.kenmeiManga.title}, current status: ${match.status}`,
    );

    // Create a copy of the results and update the status
    const updatedResults = [...matchResults];

    // Create a new object reference to ensure React detects the change
    const updatedMatch = {
      ...match,
      status: "skipped" as const,
      selectedMatch: undefined,
      matchDate: new Date(),
    };

    // Update the array with the new object
    updatedResults[index] = updatedMatch;

    console.log(
      `Updated match status to: ${updatedMatch.status}, title: ${updatedMatch.kenmeiManga.title}`,
    );

    // Set the state with the new array - This will trigger a re-render
    setMatchResults(updatedResults);

    // Save to storage to ensure it's consistent
    try {
      storage.setItem(
        STORAGE_KEYS.MATCH_RESULTS,
        JSON.stringify(updatedResults),
      );
      console.log("Successfully saved updated match results to storage");
    } catch (storageError) {
      console.error("Failed to save match results to storage:", storageError);
    }
  };

  /**
   * Handle selecting an alternative match
   */
  const handleSelectAlternative = (
    match: MangaMatchResult,
    alternativeIndex: number,
  ) => {
    console.log(
      `Swapping main match with alternative #${alternativeIndex} for "${match.kenmeiManga.title}"`,
    );

    // First try to find the match by ID
    let index = matchResults.findIndex(
      (m) => m.kenmeiManga.id === match.kenmeiManga.id,
    );

    // If not found by ID, try alternative methods
    if (index === -1) {
      console.log(
        `Could not find match with ID ${match.kenmeiManga.id}, trying fallback methods...`,
      );

      // Fallback 1: Try finding by exact title match
      index = matchResults.findIndex(
        (m) => m.kenmeiManga.title === match.kenmeiManga.title,
      );

      if (index === -1) {
        // Fallback 2: Try finding by case-insensitive title match
        index = matchResults.findIndex(
          (m) =>
            m.kenmeiManga.title.toLowerCase() ===
            match.kenmeiManga.title.toLowerCase(),
        );

        if (index === -1) {
          console.error(
            `Could not find match for "${match.kenmeiManga.title}" to update alternative`,
          );
          return;
        } else {
          console.log(
            `Found match by case-insensitive title at index ${index}`,
          );
        }
      } else {
        console.log(`Found match by exact title at index ${index}`);
      }
    } else {
      console.log(`Found match by ID at index ${index}`);
    }

    // Get the actual match from the most current state
    const currentMatch = matchResults[index];

    // Safety check
    if (
      !currentMatch.anilistMatches ||
      alternativeIndex >= currentMatch.anilistMatches.length
    ) {
      console.error(
        `Cannot select alternative: index ${alternativeIndex} out of bounds or no alternatives available`,
      );
      return;
    }

    // Get the selected alternative from the CURRENT match object, not the passed match parameter
    const selectedAlternative = currentMatch.anilistMatches[alternativeIndex];

    if (!selectedAlternative) {
      console.error(`Alternative at index ${alternativeIndex} is undefined`);
      return;
    }

    // Store the current main match information
    const currentMainMatch = currentMatch.selectedMatch;

    if (!currentMainMatch) {
      console.error(`Current main match is undefined, cannot perform swap`);
      return;
    }

    // Find the confidence of the current main match by looking at the first alternative
    const currentMainConfidence = currentMatch.anilistMatches?.[0]?.confidence;

    console.log(
      `Swapping main match "${
        currentMainMatch?.title?.english ||
        currentMainMatch?.title?.romaji ||
        "Unknown"
      }" with alternative "${
        selectedAlternative.manga.title?.english ||
        selectedAlternative.manga.title?.romaji ||
        "Unknown"
      }" (confidence: ${selectedAlternative.confidence}%)`,
    );

    // Create a deep copy of the alternatives array
    const newAnilistMatches = [
      ...currentMatch.anilistMatches.map((m) => ({ ...m })),
    ];

    // Remove the selected alternative from the array (must happen before we modify anything else)
    newAnilistMatches.splice(alternativeIndex, 1);

    // Create a new match entry for the current main that will go into alternatives
    const mainMatchAsAlternative = {
      id: currentMainMatch.id,
      manga: { ...currentMainMatch },
      confidence: currentMainConfidence || 0,
    };

    // Add the current main match as the first alternative
    newAnilistMatches.unshift(mainMatchAsAlternative);

    console.log(
      `Swapped matches: Previous main is now alternative at position 0, selected alternative is now main`,
    );

    // Create a copy of the results and update with the swap
    const updatedResults = [...matchResults];
    updatedResults[index] = {
      ...currentMatch,
      // Keep the existing status
      selectedMatch: { ...selectedAlternative.manga },
      // Update the anilistMatches array with our swapped version
      anilistMatches: newAnilistMatches,
      matchDate: new Date(),
    };

    // Set state with the new results
    setMatchResults(updatedResults);

    // Save the updated match results to storage
    try {
      storage.setItem(
        STORAGE_KEYS.MATCH_RESULTS,
        JSON.stringify(updatedResults),
      );
      console.log(
        `Successfully swapped main match with alternative for "${match.kenmeiManga.title}", preserving status: ${currentMatch.status}`,
      );
    } catch (storageError) {
      console.error("Failed to save match results to storage:", storageError);
    }
  };

  /**
   * Handle selecting a manga from the search panel
   */
  const handleSelectSearchMatch = (manga: AniListManga) => {
    if (!searchTarget) {
      console.error("No manga target was set for search");
      return;
    }

    console.log("Handling selection of manga from search:", manga.title);

    // First try to find the match by ID
    let matchIndex = matchResults.findIndex(
      (match) => match.kenmeiManga.id === searchTarget.id,
    );

    // If not found by ID, try alternative methods
    if (matchIndex === -1) {
      console.log(
        `Could not find manga with ID ${searchTarget.id}, trying fallback methods...`,
      );

      // Fallback 1: Try to find by exact title match
      matchIndex = matchResults.findIndex(
        (match) => match.kenmeiManga.title === searchTarget.title,
      );

      if (matchIndex === -1) {
        // Fallback 2: Look for similar titles (case insensitive)
        matchIndex = matchResults.findIndex(
          (match) =>
            match.kenmeiManga.title.toLowerCase() ===
            searchTarget.title.toLowerCase(),
        );

        if (matchIndex === -1) {
          console.error(
            `Could not find manga "${searchTarget.title}" in matchResults using any method`,
          );
          return;
        } else {
          console.log(
            `Found manga by case-insensitive title at index ${matchIndex}`,
          );
        }
      } else {
        console.log(`Found manga by exact title at index ${matchIndex}`);
      }
    } else {
      console.log(`Found manga by ID at index ${matchIndex}`);
    }

    // Get the existing match
    const existingMatch = matchResults[matchIndex];
    console.log(
      `Updating manga: "${existingMatch.kenmeiManga.title}" with selected match: "${manga.title.english || manga.title.romaji}"`,
    );

    // Create a copy of the results
    const updatedResults = [...matchResults];

    // Check if the selected manga is already one of the alternatives
    let alternativeIndex = -1;
    if (
      existingMatch.anilistMatches &&
      existingMatch.anilistMatches.length > 0
    ) {
      alternativeIndex = existingMatch.anilistMatches.findIndex(
        (match) => match.manga.id === manga.id,
      );
    }

    if (alternativeIndex >= 0 && existingMatch.anilistMatches) {
      // The selected manga is already in the alternatives, so just switch to it
      console.log(
        `Selected manga is alternative #${alternativeIndex}, switching instead of creating manual match`,
      );

      updatedResults[matchIndex] = {
        ...existingMatch,
        status: "matched", // Use "matched" status instead of "manual" since it's an existing alternative
        selectedMatch: existingMatch.anilistMatches[alternativeIndex].manga,
        matchDate: new Date(),
      };
    } else {
      // It's a new match not in the alternatives, create a manual match
      updatedResults[matchIndex] = {
        ...existingMatch, // Keep all existing properties
        status: "manual", // Change status to manual
        selectedMatch: manga, // Update with the new selected match
        matchDate: new Date(),
      };
    }

    // Set the results first before clearing the search state
    setMatchResults(updatedResults);

    // Then close the search panel
    setIsSearchOpen(false);
    setSearchTarget(undefined);

    // Save the updated match results to storage
    try {
      storage.setItem(
        STORAGE_KEYS.MATCH_RESULTS,
        JSON.stringify(updatedResults),
      );
      console.log(
        `Successfully saved updated match for "${existingMatch.kenmeiManga.title}"`,
      );
    } catch (storageError) {
      console.error("Failed to save match results to storage:", storageError);
    }
  };

  /**
   * Close the search panel
   */
  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchTarget(undefined);
    setBypassCache(false);
  };

  /**
   * Format future sync path
   */
  const getSyncPath = () => {
    // When we have a sync route, return that instead
    return "/";
  };

  /**
   * Proceed to synchronization
   */
  const handleProceedToSync = () => {
    // Count how many matches we have
    const matchedCount = matchResults.filter(
      (m) => m.status === "matched" || m.status === "manual",
    ).length;

    if (matchedCount === 0) {
      setError(
        "No matches have been approved. Please review and accept matches before proceeding.",
      );
      return;
    }

    // Navigate to sync page with the match results
    navigate({ to: getSyncPath() });
  };

  /**
   * Format seconds into a human-readable time string
   */
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? "s" : ""}`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }
  };

  /**
   * Cancels the matching process
   */
  const handleCancelProcess = () => {
    if (!isCancelling) {
      setIsCancelling(true);
      cancelMatchingRef.current = true;
      setStatusMessage("Cancelling process...");
      setDetailMessage("Immediately stopping all operations");
      console.log("User requested cancellation - stopping all operations");

      // Update global tracking state
      if (window.matchingProcessState) {
        window.matchingProcessState.statusMessage = "Cancelling process...";
        window.matchingProcessState.detailMessage =
          "Immediately stopping all operations";
      }

      // If we have an active abort controller, use it to abort immediately
      if (window.activeAbortController) {
        console.log("Aborting all in-progress requests");
        window.activeAbortController.abort();
      }
    }
  };

  /**
   * Handle resetting a match status back to pending
   */
  const handleResetToPending = (match: MangaMatchResult) => {
    console.log("handleResetToPending called with match:", match);

    // First try to find the match by ID
    let index = matchResults.findIndex(
      (m) => m.kenmeiManga.id === match.kenmeiManga.id,
    );

    // If not found by ID, try alternative methods
    if (index === -1) {
      console.log(
        `Could not find match with ID ${match.kenmeiManga.id}, trying fallback methods...`,
      );

      // Fallback 1: Try finding by exact title match
      index = matchResults.findIndex(
        (m) => m.kenmeiManga.title === match.kenmeiManga.title,
      );

      if (index === -1) {
        // Fallback 2: Try finding by case-insensitive title match
        index = matchResults.findIndex(
          (m) =>
            m.kenmeiManga.title.toLowerCase() ===
            match.kenmeiManga.title.toLowerCase(),
        );

        if (index === -1) {
          console.error(
            `Could not find match for "${match.kenmeiManga.title}" to reset status`,
          );
          return;
        } else {
          console.log(
            `Found match by case-insensitive title at index ${index}`,
          );
        }
      } else {
        console.log(`Found match by exact title at index ${index}`);
      }
    } else {
      console.log(`Found match by ID at index ${index}`);
    }

    console.log(
      `Resetting match for ${match.kenmeiManga.title} from ${match.status} to pending`,
    );

    // Create a copy of the results and update the status
    const updatedResults = [...matchResults];

    // Preserve the existing match data but reset status to pending
    const updatedMatch = {
      ...match,
      status: "pending" as const,
      matchDate: new Date(),
    };

    // Update the array with the new object
    updatedResults[index] = updatedMatch;

    console.log(
      `Updated match status from ${match.status} to pending for: ${updatedMatch.kenmeiManga.title}`,
    );

    // Set the state with the new array - This will trigger a re-render
    setMatchResults(updatedResults);

    // Save to storage to ensure it's consistent
    try {
      storage.setItem(
        STORAGE_KEYS.MATCH_RESULTS,
        JSON.stringify(updatedResults),
      );
      console.log(
        `Successfully reset status to pending for "${match.kenmeiManga.title}"`,
      );
    } catch (storageError) {
      console.error("Failed to save match results to storage:", storageError);
    }
  };

  /**
   * Handle rematching manga based on selected statuses
   */
  const handleRematchByStatus = async () => {
    // Reset any previous warnings
    setRematchWarning(null);

    // Reset any previous cancel state
    cancelMatchingRef.current = false;
    setDetailMessage(null);

    console.log("=== REMATCH DEBUG INFO ===");
    console.log(`Total manga in state: ${manga.length}`);
    console.log(`Total match results: ${matchResults.length}`);
    console.log(
      `Displayed unmatched count: ${manga.length - matchResults.length}`,
    );

    // Get manga that have been processed but match selected statuses
    const filteredManga = matchResults.filter(
      (manga) =>
        selectedStatuses[manga.status as keyof typeof selectedStatuses] ===
        true,
    );
    console.log(`Filtered manga from results: ${filteredManga.length}`);

    // Find unmatched manga that aren't in matchResults yet
    let unmatchedManga: KenmeiManga[] = [];
    if (selectedStatuses.unmatched) {
      // Create a set of processed manga IDs for faster lookup
      const processedIds = new Set(matchResults.map((r) => r.kenmeiManga.id));
      console.log(`Found ${processedIds.size} processed manga IDs`);

      // Find manga that haven't been processed at all
      unmatchedManga = manga.filter((m) => !processedIds.has(m.id));
      console.log(`Found ${unmatchedManga.length} unmatched manga to process`);

      // If unmatched manga count is zero but displayed count is not, try a more thorough matching approach
      if (
        unmatchedManga.length === 0 &&
        manga.length - matchResults.length > 0
      ) {
        console.log(
          "⚠️ Mismatch detected between displayed count and filtered count",
        );
        console.log("Trying alternative matching approach using titles...");

        // Create a set of processed manga titles (lowercase for case-insensitive comparison)
        const processedTitles = new Set(
          matchResults.map((r) => r.kenmeiManga.title.toLowerCase()),
        );

        // Find manga that don't have matching titles in the processed set
        unmatchedManga = manga.filter(
          (m) => !processedTitles.has(m.title.toLowerCase()),
        );
        console.log(
          `Found ${unmatchedManga.length} unmatched manga using title matching`,
        );

        // If we still have a significant mismatch, log it but DON'T default to all manga
        if (
          Math.abs(
            unmatchedManga.length - (manga.length - matchResults.length),
          ) > 5
        ) {
          console.warn(
            `⚠️ There's still a discrepancy between calculated unmatched (${unmatchedManga.length}) and displayed (${manga.length - matchResults.length})`,
          );
        }
      }
    }

    // Combine the filtered manga with unmatched manga
    const pendingMangaToProcess = [
      ...filteredManga.map((item) => item.kenmeiManga),
      ...unmatchedManga,
    ];

    console.log(`Total manga to process: ${pendingMangaToProcess.length}`);
    console.log(
      "IMPORTANT: Will clear cache entries for selected manga to ensure fresh searches",
    );
    console.log("=== END DEBUG INFO ===");

    // Show more specific error message depending on what's selected
    if (pendingMangaToProcess.length === 0) {
      if (selectedStatuses.unmatched && unmatchedManga.length === 0) {
        // If unmatched is selected but there are no unmatched manga
        setRematchWarning(
          "There are no unmatched manga to process. All manga have been processed previously.",
        );
      } else {
        // Generic message for other cases
        setRematchWarning(
          "No manga found with the selected statuses. Please select different statuses.",
        );
      }
      return;
    }

    console.log(
      `Rematching ${filteredManga.length} status-filtered manga and ${unmatchedManga.length} unmatched manga`,
    );

    try {
      // Show cache clearing notification with count
      setIsCacheClearing(true);
      setCacheClearingCount(pendingMangaToProcess.length);
      setStatusMessage("Preparing to clear cache for selected manga...");

      // Small delay to ensure UI updates before potentially intensive operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get the cache service to clear specific entries
      const { cacheDebugger } = await import(
        "../api/matching/manga-search-service"
      );

      // Get initial cache status for comparison
      const initialCacheStatus = cacheDebugger.getCacheStatus();
      console.log(
        `📊 Initial cache status: ${initialCacheStatus.inMemoryCache} entries in memory, ${initialCacheStatus.localStorage.mangaCache} in localStorage`,
      );

      // Clear cache entries for each manga being rematched - use batch method for better performance
      const mangaTitles = pendingMangaToProcess.map((manga) => manga.title);
      console.log(
        `🔄 Clearing cache for ${mangaTitles.length} manga titles at once`,
      );
      setStatusMessage(
        `Clearing cache for ${mangaTitles.length} manga titles...`,
      );

      // Use the new batch clearing method instead of looping individually
      const clearedEntries = cacheDebugger.clearCacheForTitles(mangaTitles);

      // Check final cache status to ensure we haven't cleared too much
      const finalCacheStatus = cacheDebugger.getCacheStatus();

      // Calculate how many entries were cleared
      const entriesRemoved =
        initialCacheStatus.inMemoryCache - finalCacheStatus.inMemoryCache;

      console.log(
        `🧹 Cleared ${clearedEntries} cache entries for selected manga`,
      );
      if (clearedEntries > 0 && mangaTitles.length > 0) {
        console.log(
          "Cleared titles:",
          mangaTitles.slice(0, 5).join(", ") +
            (mangaTitles.length > 5
              ? ` and ${mangaTitles.length - 5} more...`
              : ""),
        );
      }

      // Check if we cleared everything by accident
      if (
        finalCacheStatus.inMemoryCache === 0 &&
        initialCacheStatus.inMemoryCache > mangaTitles.length * 2
      ) {
        console.warn(
          "⚠️ WARNING: All cache entries were cleared, which was not intended!",
        );
        console.warn(
          `Initial: ${initialCacheStatus.inMemoryCache}, Final: ${finalCacheStatus.inMemoryCache}, Expected to clear ~${mangaTitles.length}`,
        );
      } else {
        console.log(
          `📊 Final cache status: ${finalCacheStatus.inMemoryCache} entries in memory (removed ${entriesRemoved})`,
        );
      }

      // Hide cache clearing notification
      setIsCacheClearing(false);
      setStatusMessage(
        `Cleared ${clearedEntries} cache entries - preparing fresh searches from AniList...`,
      );

      // Reset the options panel and start matching
      setShowRematchOptions(false);

      // Before starting the matching process, save the existing matchResults
      // Filter out the ones we're about to rematch to avoid duplicates
      const mangaIdsToRematch = new Set(pendingMangaToProcess.map((m) => m.id));
      const existingResults = matchResults.filter(
        (m) => !mangaIdsToRematch.has(m.kenmeiManga.id),
      );

      console.log(
        `Preserved ${existingResults.length} existing match results that aren't being rematched`,
      );

      // Start matching process with a custom callback to merge results
      const handleMatchCompleted = (newResults: MangaMatchResult[]) => {
        console.log(
          `Received ${newResults.length} fresh results from matching process`,
        );

        // Combine existing results with new results
        const combinedResults = [...existingResults, ...newResults];
        console.log(
          `Combined ${existingResults.length} preserved results with ${newResults.length} new results`,
        );

        // Update the state
        setMatchResults(combinedResults);

        // Save the combined results to storage
        try {
          storage.setItem(
            STORAGE_KEYS.MATCH_RESULTS,
            JSON.stringify(combinedResults),
          );
          console.log(
            `Saved combined match results with ${combinedResults.length} total entries`,
          );
        } catch (storageError) {
          console.error(
            "Failed to save combined match results to storage:",
            storageError,
          );
        }
      };

      // Run the matching process and wait for it to complete
      const searchAndMerge = async () => {
        try {
          // Ensure we start with a clean cancellation state
          cancelMatchingRef.current = false;
          setDetailMessage(null);

          const newResults = await batchMatchManga(
            pendingMangaToProcess,
            authState.accessToken,
            {
              batchSize: 5,
              searchPerPage: 10,
              maxSearchResults: 20,
              matchConfig: {
                confidenceThreshold: 75,
                preferEnglishTitles: true,
                useAlternativeTitles: true,
              },
            },
            (current, total, currentTitle) => {
              setProgress({ current, total, currentTitle });
              if (window.matchingProcessState) {
                window.matchingProcessState.progress = {
                  current,
                  total,
                  currentTitle: currentTitle || "",
                };
                window.matchingProcessState.lastUpdated = Date.now();
              }
              calculateTimeEstimate(current, total);
            },
            () => cancelMatchingRef.current,
            window.activeAbortController?.signal,
          );

          // Process the results
          handleMatchCompleted(newResults);
        } catch (error) {
          console.error("Error during rematch process:", error);
          setError("An error occurred during the rematch process.");
        } finally {
          setIsLoading(false);
          setFreshSearch(false);
          if (window.matchingProcessState) {
            window.matchingProcessState.isRunning = false;
          }
        }
      };

      // Set loading state and start the process
      setIsLoading(true);

      // Create a new AbortController and store it globally
      const abortController = new AbortController();
      window.activeAbortController = abortController;

      // Reset time tracking state and refs
      processingStartTimeRef.current = Date.now();
      lastProcessedCountRef.current = 0;
      lastTimeUpdateRef.current = processingStartTimeRef.current;
      processingTimesRef.current = [];

      // Initialize time tracking state
      setTimeEstimate({
        startTime: processingStartTimeRef.current,
        averageTimePerManga: 0,
        estimatedRemainingSeconds: 0,
      });

      // Initialize global tracking state
      window.matchingProcessState = {
        isRunning: true,
        progress: {
          current: 0,
          total: pendingMangaToProcess.length,
          currentTitle: "",
        },
        statusMessage: "Preparing fresh searches for selected manga...",
        detailMessage: null,
        timeEstimate: {
          startTime: processingStartTimeRef.current,
          averageTimePerManga: 0,
          estimatedRemainingSeconds: 0,
        },
        lastUpdated: Date.now(),
      };

      searchAndMerge();
    } catch (error) {
      console.error("Failed to clear manga cache entries:", error);
      // Continue with rematch even if cache clearing fails
    }
  };

  // Add a new effect to sync with the global process state while the page is mounted
  useEffect(() => {
    // Skip if we're not in the middle of a process
    if (!window.matchingProcessState?.isRunning) return;

    // Create a function to sync the UI with the global state
    const syncUIWithGlobalState = () => {
      if (window.matchingProcessState?.isRunning) {
        const currentState = window.matchingProcessState;

        console.log("Syncing UI with global process state:", {
          current: currentState.progress.current,
          total: currentState.progress.total,
          statusMessage: currentState.statusMessage,
        });

        // Update our local state with the global state
        setIsLoading(true);
        setProgress({
          current: currentState.progress.current,
          total: currentState.progress.total,
          currentTitle: currentState.progress.currentTitle,
        });
        setStatusMessage(currentState.statusMessage);
        setDetailMessage(currentState.detailMessage);
        setTimeEstimate(currentState.timeEstimate);
      } else {
        // If the process is no longer running, update our loading state
        console.log("Global process complete, syncing final state");
        setIsLoading(false);
      }
    };

    // Create a visibility change listener to ensure UI updates when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Page became visible, syncing state immediately");
        syncUIWithGlobalState();
      }
    };

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Create an interval to check for updates to the global state (less frequently since we also have visibility events)
    const syncInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        syncUIWithGlobalState();
      }
    }, 2000); // Check every 2 seconds when visible

    // Clean up the interval and event listener when the component unmounts
    return () => {
      clearInterval(syncInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []); // Only run once when component mounts

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <h1 className="mb-4 text-3xl font-bold">Match Your Manga</h1>
        <p className="mb-6 text-gray-600">
          Automatically match your imported manga with AniList entries
        </p>

        {!isLoading &&
          (!matchResults || matchResults.length === 0) &&
          !error && (
            <div className="mb-8">
              <button
                className="bg-primary hover:bg-primary-dark rounded-md px-4 py-2 text-white transition-colors"
                onClick={() => manga.length > 0 && startMatching(manga)}
                disabled={!manga.length}
              >
                Start Matching Process
              </button>
            </div>
          )}

        {/* Loading State with Progress and Cancel Button */}
        {isLoading && (
          <div className="mb-8 rounded-lg border p-6 shadow-sm">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-bold">
                {isCancelling
                  ? "Cancelling..."
                  : statusMessage || "Matching your manga..."}
              </h2>

              {detailMessage && (
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  {detailMessage}
                </p>
              )}
            </div>

            {/* Progress Bar - Fixed for dark mode */}
            <div className="mb-2 h-4 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="bg-primary h-4 rounded-full transition-all duration-300 dark:bg-blue-500"
                style={{
                  width: `${progress.total ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0}%`,
                }}
              />
            </div>

            {/* Progress Text */}
            <div className="mb-4 text-center text-sm text-gray-600 dark:text-gray-300">
              {/* Time Estimate */}
              {progress.current > 0 &&
                timeEstimate.estimatedRemainingSeconds > 0 && (
                  <div className="mt-1">
                    Estimated time remaining:{" "}
                    {formatTimeRemaining(
                      timeEstimate.estimatedRemainingSeconds,
                    )}
                  </div>
                )}
            </div>

            {/* Current Manga Display */}
            {progress.currentTitle && (
              <div className="mb-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Currently processing:{" "}
                  <span className="font-medium">{progress.currentTitle}</span>
                </p>
              </div>
            )}

            {/* Cancel Button */}
            <div className="text-center">
              <button
                onClick={handleCancelProcess}
                className={`rounded-md px-4 py-2 transition-colors ${
                  isCancelling
                    ? "cursor-not-allowed bg-gray-400 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                    : "bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                }`}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Cancel Process"}
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && !matchResults.length && (
          <div className="container mx-auto flex h-full max-w-6xl flex-col px-4 py-6">
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Review Your Manga
              </h1>
            </header>

            <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-start">
                <AlertCircle className="mr-3 h-5 w-5 text-red-600 dark:text-red-400" />
                <div>
                  <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
                    Error Matching Manga
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                    <p>{error}</p>

                    {detailedError && (
                      <div className="mt-4">
                        <details className="cursor-pointer">
                          <summary className="font-medium">
                            View Technical Details
                          </summary>
                          <pre className="mt-2 max-h-60 overflow-auto rounded-md bg-red-100 p-4 font-mono text-xs text-red-900 dark:bg-red-950 dark:text-red-200">
                            {JSON.stringify(detailedError, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
                    <button
                      onClick={handleRetry}
                      className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
                    >
                      Retry Matching
                    </button>
                    <button
                      onClick={() => navigate({ to: "/import" })}
                      className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Back to Import
                    </button>
                    <button
                      onClick={() => navigate({ to: "/settings" })}
                      className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Go to Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Add debug button */}
            <div className="mt-4">
              <button
                onClick={async () => {
                  try {
                    const { cacheDebugger } = await import(
                      "../api/matching/manga-search-service"
                    );
                    const status = cacheDebugger.getCacheStatus();
                    console.log("Current cache status:", status);
                    alert(
                      `Cache Status:\n- In Memory: ${status.inMemoryCache} entries\n- LocalStorage: ${status.localStorage.mangaCache} manga entries, ${status.localStorage.searchCache} search entries`,
                    );
                  } catch (e) {
                    console.error("Failed to check cache status:", e);
                  }
                }}
                className="text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                aria-label="Debug cache status"
              >
                Check Cache Status
              </button>
              <button
                onClick={async () => {
                  try {
                    const { cacheDebugger } = await import(
                      "../api/matching/manga-search-service"
                    );
                    if (
                      window.confirm(
                        "Are you sure you want to clear all caches? This will require re-fetching all manga data.",
                      )
                    ) {
                      cacheDebugger.resetAllCaches();

                      // Also clear pending manga data
                      storage.removeItem(STORAGE_KEYS.PENDING_MANGA);
                      setPendingManga([]);

                      alert("All caches have been cleared.");
                    }
                  } catch (e) {
                    console.error("Failed to reset caches:", e);
                  }
                }}
                className="ml-4 text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                aria-label="Reset all caches"
              >
                Reset Caches
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto flex h-full max-w-6xl flex-col px-4 py-6">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Review Your Manga
          </h1>
          {matchResults.length > 0 && !isLoading && (
            <button
              onClick={() => setShowRematchOptions(!showRematchOptions)}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              {showRematchOptions
                ? "Hide Rematch Options"
                : "Fresh Search (Clear Cache)"}
            </button>
          )}
        </div>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Review the matches found between your Kenmei manga and AniList.
        </p>
      </header>

      {/* Rematch by status options */}
      {showRematchOptions && !isLoading && matchResults.length > 0 && (
        <div className="mb-6 rounded-md bg-gray-50 p-4 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Select which manga statuses to rematch
          </h3>

          {rematchWarning && (
            <div className="mb-4 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/30">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-200">
                    {rematchWarning}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <label className="flex items-center rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={selectedStatuses.pending}
                onChange={() =>
                  setSelectedStatuses({
                    ...selectedStatuses,
                    pending: !selectedStatuses.pending,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Pending (
                {matchResults.filter((m) => m.status === "pending").length})
              </span>
            </label>
            <label className="flex items-center rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={selectedStatuses.skipped}
                onChange={() =>
                  setSelectedStatuses({
                    ...selectedStatuses,
                    skipped: !selectedStatuses.skipped,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Skipped (
                {matchResults.filter((m) => m.status === "skipped").length})
              </span>
            </label>
            <label className="flex items-center rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={selectedStatuses.conflict}
                onChange={() =>
                  setSelectedStatuses({
                    ...selectedStatuses,
                    conflict: !selectedStatuses.conflict,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Conflict (
                {matchResults.filter((m) => m.status === "conflict").length})
              </span>
            </label>
            <label className="flex items-center rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={selectedStatuses.matched}
                onChange={() =>
                  setSelectedStatuses({
                    ...selectedStatuses,
                    matched: !selectedStatuses.matched,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Matched (
                {matchResults.filter((m) => m.status === "matched").length})
              </span>
            </label>
            <label className="flex items-center rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={selectedStatuses.manual}
                onChange={() =>
                  setSelectedStatuses({
                    ...selectedStatuses,
                    manual: !selectedStatuses.manual,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Manual (
                {matchResults.filter((m) => m.status === "manual").length})
              </span>
            </label>
            <label className="flex items-center rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={selectedStatuses.unmatched}
                onChange={() =>
                  setSelectedStatuses({
                    ...selectedStatuses,
                    unmatched: !selectedStatuses.unmatched,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Unmatched ({manga.length - matchResults.length})
              </span>
            </label>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleRematchByStatus}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              Fresh Search Selected (
              {Object.entries(selectedStatuses)
                .filter(([status, selected]) => selected)
                .reduce((count, [status]) => {
                  if (status === "unmatched") {
                    return count + (manga.length - matchResults.length);
                  }
                  return (
                    count +
                    matchResults.filter((m) => m.status === status).length
                  );
                }, 0)}
              )
            </button>
            <button
              onClick={() =>
                setSelectedStatuses({
                  pending: true,
                  skipped: true,
                  conflict: false,
                  matched: false,
                  manual: false,
                  unmatched: true,
                })
              }
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Reset to Default
            </button>
            <button
              onClick={() => setShowRematchOptions(false)}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-800">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300">
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
            </div>
            <div className="ml-3 flex-1 md:flex md:justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {statusMessage || "Processing..."}
              </p>
              <p className="mt-3 text-sm md:mt-0 md:ml-6">
                {progress.current} / {progress.total}
                {detailMessage && (
                  <span className="ml-2 text-gray-500 dark:text-gray-400">
                    {detailMessage}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="relative h-4 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-4 rounded-full bg-blue-600 transition-all duration-500 dark:bg-blue-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((progress.current / progress.total) * 100),
                  )}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Time estimate */}
          {timeEstimate.estimatedRemainingSeconds > 0 && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Estimated time remaining:{" "}
              {formatTimeRemaining(timeEstimate.estimatedRemainingSeconds)}
              {(bypassCache || freshSearch) && (
                <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">
                  (Performing fresh searches from AniList)
                </span>
              )}
            </div>
          )}

          {/* Show cancel button while loading */}
          <div className="mt-4">
            <button
              onClick={handleCancelProcess}
              disabled={isCancelling}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {isCancelling ? "Cancelling..." : "Cancel Process"}
            </button>
          </div>
        </div>
      )}

      {/* Initialization state - only show if not already loading and we have pending manga */}
      {isInitializing && !isLoading && pendingManga.length > 0 && (
        <div className="mb-6 rounded-md bg-blue-50 p-4 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          <div className="flex justify-between">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2 h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
              <p>Checking for pending manga to resume...</p>
            </div>
          </div>
        </div>
      )}

      {/* Resume message when we have pending manga but aren't already in the loading state */}
      {pendingManga.length > 0 && !isLoading && !isInitializing && (
        <div className="mb-6 rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/30">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Unfinished Matching Process Detected
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  We&apos;ve detected{" "}
                  {pendingManga.length - matchResults.length} manga that
                  weren&apos;t processed in your previous session.
                </p>
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={handleResumeMatching}
                    className="inline-flex items-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:outline-none dark:bg-yellow-700 dark:hover:bg-yellow-600"
                  >
                    Resume Matching Process
                  </button>
                  <button
                    onClick={handleCancelResume}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative flex-1">
        {matchResults.length > 0 ? (
          <>
            {/* The main matching panel */}
            {
              <div className="flex h-full flex-col">
                <MangaMatchingPanel
                  matches={matchResults}
                  onManualSearch={handleManualSearch}
                  onAcceptMatch={handleAcceptMatch}
                  onRejectMatch={handleRejectMatch}
                  onSelectAlternative={handleSelectAlternative}
                  onResetToPending={handleResetToPending}
                />

                {/* Action buttons */}
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => {
                      // Clear any pending manga data
                      savePendingManga([]);
                      navigate({ to: "/import" });
                    }}
                  >
                    Back to Import
                  </button>
                  <button
                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-blue-700 dark:hover:bg-blue-800"
                    onClick={handleProceedToSync}
                  >
                    Proceed to Dashboard
                  </button>
                </div>
              </div>
            }
          </>
        ) : (
          // No results state
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              No manga data to match. Return to the import page to load your
              data.
            </p>
            <button
              className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => {
                // Clear any pending manga data
                savePendingManga([]);
                navigate({ to: "/import" });
              }}
            >
              Go to Import Page
            </button>
          </div>
        )}
      </div>

      {/* Modal Overlay for Search Panel - Positioned outside the main content flow */}
      {isSearchOpen && searchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto">
          {/* Blurred backdrop */}
          <div
            className="fixed inset-0 bg-white/10 backdrop-blur-sm transition-all"
            onClick={handleCloseSearch}
            aria-hidden="true"
          ></div>

          {/* Modal panel with max height and width constraints */}
          <div className="relative z-50 m-4 max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <MangaSearchPanel
              key={`search-${searchTarget.id}`}
              kenmeiManga={searchTarget}
              onClose={handleCloseSearch}
              onSelectMatch={handleSelectSearchMatch}
              token={authState.accessToken || ""}
              bypassCache={bypassCache}
            />
          </div>
        </div>
      )}

      {/* Add popup notification for cache clearing */}
      {isCacheClearing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30"></div>
          <div className="relative mx-auto max-w-md rounded-lg bg-white p-6 text-center shadow-xl dark:bg-gray-800">
            <div className="flex flex-col items-center gap-4">
              <svg
                className="h-8 w-8 animate-spin text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Clearing Cache
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Clearing cache for {cacheClearingCount} selected manga. This may
                cause a brief lag. Please wait...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
