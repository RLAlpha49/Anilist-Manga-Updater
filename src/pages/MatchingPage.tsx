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

// Add a global type declaration for the abort controller
declare global {
  interface Window {
    activeAbortController?: AbortController;
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

  // State for manual search
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTarget, setSearchTarget] = useState<KenmeiManga | undefined>(
    undefined,
  );
  const [bypassCache, setBypassCache] = useState(false);

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
      setTimeEstimate({
        startTime: processingStartTimeRef.current,
        averageTimePerManga: avgTimePerItem,
        estimatedRemainingSeconds: Math.round(cappedEstimatedMs / 1000),
      });

      // Update refs for next calculation
      lastProcessedCountRef.current = current;
      lastTimeUpdateRef.current = now;
    }
  };

  // Initial data loading
  useEffect(() => {
    // Skip if this effect has already been run
    if (matchingInitialized.current) {
      console.log(
        "Matching already initialized, skipping duplicate initialization",
      );
      return;
    }

    console.log("Initializing MatchingPage component...");

    // Preload the cache service to ensure it's initialized
    import("../api/matching/manga-search-service").then((module) => {
      console.log("Preloaded manga search service");
      // Force cache sync
      if (module.cacheDebugger) {
        module.cacheDebugger.forceSyncCaches();
      }

      // Check if we have saved match results before starting a new matching process
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

        // Mark as initialized
        matchingInitialized.current = true;
        // Set the saved results directly
        setMatchResults(savedResults);
        return; // Skip further initialization
      }

      // Get imported data from storage only after cache is synced
      const importedData = getKenmeiData();

      if (importedData?.manga?.length && !matchingInitialized.current) {
        matchingInitialized.current = true;
        setManga(importedData.manga);

        // Start matching process automatically
        startMatching(importedData.manga);
      } else if (!importedData?.manga?.length) {
        // Redirect back to import page if no data
        setError("No manga data found. Please import your data first.");

        // Delay redirect slightly to show the error
        setTimeout(() => {
          navigate({ to: "/import" });
        }, 2000);
      }
    });
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

  /**
   * Start the batch matching process
   */
  const startMatching = async (mangaList: KenmeiManga[]) => {
    if (!mangaList.length) return;

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

    // Initialize time tracking state
    setTimeEstimate({
      startTime: processingStartTimeRef.current,
      averageTimePerManga: 0,
      estimatedRemainingSeconds: 0,
    });

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
        },
        (current, total, currentTitle) => {
          // Check for cancellation - immediately abort if cancelled
          handleCancellation();

          // Update progress
          setProgress({ current, total, currentTitle });

          // Update time estimate with more stable calculation
          calculateTimeEstimate(current, total);

          // Check if we're in the phase of batch fetching known IDs
          if (withKnownIds > 0 && current <= withKnownIds) {
            // We're likely processing the known IDs first
            console.log(
              `Processing manga with known IDs: ${current} of ${withKnownIds}`,
            );
            setStatusMessage(`Batch fetching manga with known IDs`);
            setDetailMessage(`${current} of ${withKnownIds}`);
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
          } catch (storageError) {
            console.error(
              "Failed to save partial match results to storage:",
              storageError,
            );
          }
        }
        setError(
          "Matching process was cancelled. Partial results may be available.",
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
    }
  };

  /**
   * Retry the matching process
   */
  const handleRetry = () => {
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

          {/* Debug tools in a small button */}
          <div className="group relative">
            <button
              className="text-xs text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              aria-label="Developer tools"
              title="Developer tools"
            >
              Dev
            </button>

            <div className="ring-opacity-5 invisible absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black group-hover:visible focus:outline-none dark:bg-gray-800">
              <div
                className="py-1"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="options-menu"
              >
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
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  role="menuitem"
                >
                  Check Cache Status
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { cacheDebugger } = await import(
                        "../api/matching/manga-search-service"
                      );
                      cacheDebugger.forceSyncCaches();
                      const status = cacheDebugger.getCacheStatus();
                      alert(
                        `Cache synced! Current status:\n- In Memory: ${status.inMemoryCache} entries`,
                      );
                    } catch (e) {
                      console.error("Failed to sync caches:", e);
                    }
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  role="menuitem"
                >
                  Force Cache Sync
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
                        alert("All caches have been cleared.");
                      }
                    } catch (e) {
                      console.error("Failed to reset caches:", e);
                    }
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  role="menuitem"
                >
                  Reset All Caches
                </button>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Review the matches found between your Kenmei manga and AniList.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <div className="flex items-center">
            <AlertCircle className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
            <p>{error}</p>
          </div>
          {detailedError && (
            <details className="mt-2 cursor-pointer">
              <summary className="font-medium">View Technical Details</summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-red-100 p-2 font-mono text-xs text-red-900 dark:bg-red-950 dark:text-red-200">
                {JSON.stringify(detailedError, null, 2)}
              </pre>
            </details>
          )}

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
                    onClick={() => navigate({ to: "/import" })}
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
              onClick={() => navigate({ to: "/import" })}
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
    </div>
  );
}
