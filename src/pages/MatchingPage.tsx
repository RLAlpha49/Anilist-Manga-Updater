import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { KenmeiManga } from "../api/kenmei/types";
import { MangaMatchResult } from "../api/anilist/types";
import { MangaMatchingPanel } from "../components/import/MangaMatchingPanel";
import { useAuth } from "../hooks/useAuth";
import { getKenmeiData, getSavedMatchResults } from "../utils/storage";
import { StatusFilterOptions } from "../types/matching";
import { useMatchingProcess } from "../hooks/useMatchingProcess";
import { usePendingManga } from "../hooks/usePendingManga";
import { useMatchHandlers } from "../hooks/useMatchHandlers";

// Components
import { MatchingProgressPanel } from "../components/matching/MatchingProgress";
import { ErrorDisplay } from "../components/matching/ErrorDisplay";
import { ResumeNotification } from "../components/matching/ResumeNotification";
import { RematchOptions } from "../components/matching/RematchOptions";
import { CacheClearingNotification } from "../components/matching/CacheClearingNotification";
import { SearchModal } from "../components/matching/SearchModal";

export function MatchingPage() {
  const navigate = useNavigate();
  const { authState } = useAuth();

  // State for manga data
  const [manga, setManga] = useState<KenmeiManga[]>([]);
  const [matchResults, setMatchResults] = useState<MangaMatchResult[]>([]);

  // State for manual search
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTarget, setSearchTarget] = useState<KenmeiManga | undefined>(
    undefined,
  );

  // Add state for status filtering and rematching
  const [selectedStatuses, setSelectedStatuses] = useState<StatusFilterOptions>(
    {
      pending: true,
      skipped: true,
      conflict: false,
      matched: false,
      manual: false,
      unmatched: true,
    },
  );
  const [showRematchOptions, setShowRematchOptions] = useState(false);
  const [rematchWarning, setRematchWarning] = useState<string | null>(null);

  // Get matching process hooks
  const matchingProcess = useMatchingProcess({
    accessToken: authState.accessToken || null,
  });
  const pendingMangaState = usePendingManga();

  // Use match handlers
  const matchHandlers = useMatchHandlers(
    matchResults,
    setMatchResults,
    setSearchTarget,
    setIsSearchOpen,
    matchingProcess.setBypassCache,
  );

  // Add debug effect for matching results
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

  // Initial data loading
  useEffect(() => {
    console.log("*** INITIALIZATION START ***");
    console.log("Initial states:", {
      isLoading: matchingProcess.isLoading,
      hasError: !!matchingProcess.error,
      matchResultsLength: matchResults.length,
      pendingMangaLength: pendingMangaState.pendingManga.length,
      isMatchingInitialized: matchingProcess.matchingInitialized.current,
    });

    // Check if there's an ongoing matching process
    if (window.matchingProcessState?.isRunning) {
      console.log("Detected running matching process, restoring state");

      // Restore the matching process state
      matchingProcess.setIsLoading(true);
      matchingProcess.setProgress({
        current: window.matchingProcessState.progress.current,
        total: window.matchingProcessState.progress.total,
        currentTitle: window.matchingProcessState.progress.currentTitle,
      });
      matchingProcess.setStatusMessage(
        window.matchingProcessState.statusMessage,
      );
      matchingProcess.setDetailMessage(
        window.matchingProcessState.detailMessage,
      );

      // Mark as initialized to prevent auto-starting
      matchingProcess.matchingInitialized.current = true;
      matchingProcess.setIsInitializing(false);
      return;
    }

    // Skip if this effect has already been run
    if (matchingProcess.matchingInitialized.current) {
      console.log(
        "Matching already initialized, skipping duplicate initialization",
      );
      matchingProcess.setIsInitializing(false);
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

    // First check for pending manga from a previously interrupted operation
    const pendingMangaData = pendingMangaState.loadPendingManga();

    if (pendingMangaData && pendingMangaData.length > 0) {
      // Clear any error message since we're showing the resume notification instead
      matchingProcess.setError(null);
      // End initialization when we've found pending manga
      matchingProcess.setIsInitializing(false);
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
        if (!pendingMangaData && importedManga.length > 0) {
          console.log(
            "No pending manga in storage but we have imported manga - calculating unmatched manga",
          );
          const calculatedPendingManga =
            pendingMangaState.calculatePendingManga(
              savedResults,
              importedManga,
            );
          if (calculatedPendingManga.length > 0) {
            console.log(
              `Calculated ${calculatedPendingManga.length} manga that still need to be processed`,
            );
            pendingMangaState.savePendingManga(calculatedPendingManga);
            console.log(
              `Saved ${calculatedPendingManga.length} pending manga to storage for resume`,
            );
          } else {
            console.log("No pending manga found in calculation");
          }
        }

        // Mark as initialized
        matchingProcess.matchingInitialized.current = true;
        // Set the saved results directly
        setMatchResults(savedResults);
        console.log("*** INITIALIZATION COMPLETE - Using saved results ***");
        return; // Skip further initialization
      } else {
        console.log("No saved match results found");
      }

      if (
        importedManga.length &&
        !matchingProcess.matchingInitialized.current
      ) {
        console.log("Starting initial matching process with imported manga");
        matchingProcess.matchingInitialized.current = true;

        // Start matching process automatically
        matchingProcess.startMatching(
          importedManga,
          false,
          matchResults,
          setMatchResults,
        );
      } else if (!importedManga.length) {
        // Redirect back to import page if no data
        console.log("No imported manga found, redirecting to import page");
        matchingProcess.setError(
          "No manga data found. Please import your data first.",
        );

        // Delay redirect slightly to show the error
        setTimeout(() => {
          // Clear any pending manga data before redirecting
          pendingMangaState.savePendingManga([]);
          navigate({ to: "/import" });
        }, 2000);
      }

      // Make sure we mark initialization as complete
      matchingProcess.setIsInitializing(false);
      console.log("*** INITIALIZATION COMPLETE ***");
    });

    // Cleanup function to ensure initialization state is reset
    return () => {
      matchingProcess.setIsInitializing(false);
    };
  }, [navigate, matchingProcess, pendingMangaState, matchResults]);

  // Add an effect to sync with the global process state while the page is mounted
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
        matchingProcess.setIsLoading(true);
        matchingProcess.setProgress({
          current: currentState.progress.current,
          total: currentState.progress.total,
          currentTitle: currentState.progress.currentTitle,
        });
        matchingProcess.setStatusMessage(currentState.statusMessage);
        matchingProcess.setDetailMessage(currentState.detailMessage);
      } else {
        // If the process is no longer running, update our loading state
        console.log("Global process complete, syncing final state");
        matchingProcess.setIsLoading(false);
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

  /**
   * Handle retry button click
   */
  const handleRetry = () => {
    // Clear any pending manga data
    pendingMangaState.savePendingManga([]);

    if (manga.length > 0) {
      matchingProcess.startMatching(
        manga,
        false,
        matchResults,
        setMatchResults,
      );
    }
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
      matchingProcess.setError(
        "No matches have been approved. Please review and accept matches before proceeding.",
      );
      return;
    }

    // Navigate to sync page with the match results
    navigate({ to: getSyncPath() });
  };

  /**
   * Handle rematch by status
   */
  const handleRematchByStatus = async () => {
    // Reset any previous warnings
    setRematchWarning(null);

    // Reset any previous cancel state
    matchingProcess.cancelMatchingRef.current = false;
    matchingProcess.setDetailMessage(null);

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
      matchingProcess.setIsCacheClearing(true);
      matchingProcess.setCacheClearingCount(pendingMangaToProcess.length);
      matchingProcess.setStatusMessage(
        "Preparing to clear cache for selected manga...",
      );

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
      matchingProcess.setStatusMessage(
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
      matchingProcess.setIsCacheClearing(false);
      matchingProcess.setStatusMessage(
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

      // Start fresh search
      matchingProcess.startMatching(
        pendingMangaToProcess,
        true,
        existingResults,
        setMatchResults,
      );
    } catch (error) {
      console.error("Failed to clear manga cache entries:", error);
      matchingProcess.setIsCacheClearing(false);
      // Continue with rematch even if cache clearing fails
      matchingProcess.startMatching(
        pendingMangaToProcess,
        true,
        matchResults,
        setMatchResults,
      );
    }
  };

  // Loading state
  if (matchingProcess.isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <h1 className="mb-4 text-3xl font-bold">Match Your Manga</h1>
        <p className="mb-6 text-gray-600">
          Automatically match your imported manga with AniList entries
        </p>

        {/* Loading State with Progress and Cancel Button */}
        <MatchingProgressPanel
          isLoading={matchingProcess.isLoading}
          isCancelling={matchingProcess.isCancelling}
          progress={matchingProcess.progress}
          statusMessage={matchingProcess.statusMessage}
          detailMessage={matchingProcess.detailMessage}
          timeEstimate={matchingProcess.timeEstimate}
          onCancelProcess={matchingProcess.handleCancelProcess}
          bypassCache={matchingProcess.bypassCache}
          freshSearch={matchingProcess.freshSearch}
        />

        {/* Error Display */}
        {matchingProcess.error && !matchResults.length && (
          <ErrorDisplay
            error={matchingProcess.error}
            detailedError={matchingProcess.detailedError}
            onRetry={handleRetry}
            onClearPendingManga={() => pendingMangaState.savePendingManga([])}
          />
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
          {matchResults.length > 0 && !matchingProcess.isLoading && (
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
      {showRematchOptions &&
        !matchingProcess.isLoading &&
        matchResults.length > 0 && (
          <RematchOptions
            selectedStatuses={selectedStatuses}
            onChangeSelectedStatuses={setSelectedStatuses}
            matchResults={matchResults}
            allManga={manga}
            rematchWarning={rematchWarning}
            onRematchByStatus={handleRematchByStatus}
            onCloseOptions={() => setShowRematchOptions(false)}
          />
        )}

      {/* Initialization state - only show if not already loading and we have pending manga */}
      {matchingProcess.isInitializing &&
        !matchingProcess.isLoading &&
        pendingMangaState.pendingManga.length > 0 && (
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
      {pendingMangaState.pendingManga.length > 0 &&
        !matchingProcess.isLoading &&
        !matchingProcess.isInitializing && (
          <ResumeNotification
            pendingMangaCount={pendingMangaState.pendingManga.length}
            onResumeMatching={() =>
              matchingProcess.handleResumeMatching(
                matchResults,
                setMatchResults,
              )
            }
            onCancelResume={matchingProcess.handleCancelResume}
          />
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
                  onManualSearch={matchHandlers.handleManualSearch}
                  onAcceptMatch={matchHandlers.handleAcceptMatch}
                  onRejectMatch={matchHandlers.handleRejectMatch}
                  onSelectAlternative={matchHandlers.handleSelectAlternative}
                  onResetToPending={matchHandlers.handleResetToPending}
                />

                {/* Action buttons */}
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => {
                      // Clear any pending manga data
                      pendingMangaState.savePendingManga([]);
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
                pendingMangaState.savePendingManga([]);
                navigate({ to: "/import" });
              }}
            >
              Go to Import Page
            </button>
          </div>
        )}
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        searchTarget={searchTarget}
        accessToken={authState.accessToken || ""}
        bypassCache={matchingProcess.bypassCache}
        onClose={() => {
          setIsSearchOpen(false);
          setSearchTarget(undefined);
          matchingProcess.setBypassCache(false);
        }}
        onSelectMatch={matchHandlers.handleSelectSearchMatch}
      />

      {/* Cache Clearing Notification */}
      {matchingProcess.isCacheClearing && (
        <CacheClearingNotification
          cacheClearingCount={matchingProcess.cacheClearingCount}
        />
      )}

      {/* Error display when we have an error but also have results */}
      {matchingProcess.error && matchResults.length > 0 && (
        <div className="fixed right-4 bottom-4 max-w-sm rounded-md bg-red-50 p-4 shadow-lg dark:bg-red-900/30">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {matchingProcess.error}
              </p>
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={() => matchingProcess.setError(null)}
                  className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-200 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
