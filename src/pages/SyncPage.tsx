import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import { useSynchronization } from "../hooks/useSynchronization";
import {
  AniListMediaEntry,
  UserMediaList,
  MediaListStatus,
} from "../api/anilist/types";
import { MangaMatchResult } from "../api/anilist/types";
import { STATUS_MAPPING } from "../api/kenmei/types";
import { getSavedMatchResults } from "../utils/storage";
import { getUserMangaList } from "../api/anilist/client";
import SyncManager from "../components/SyncManager";
import SyncResultsView from "../components/SyncResultsView";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  AlertCircle,
  Loader2,
  Settings,
  Check,
  Filter,
  SortAsc,
} from "lucide-react";
import { exportSyncErrorLog } from "../utils/export-utils";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

export function SyncPage() {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const token = authState.accessToken || "";
  const [state, actions] = useSynchronization();
  const [viewMode, setViewMode] = useState<"preview" | "sync" | "results">(
    "preview",
  );

  // Sync configuration options
  const [syncConfig, setSyncConfig] = useState({
    prioritizeAniListStatus: false,
    preserveCompletedStatus: true,
    prioritizeAniListProgress: true,
    prioritizeAniListScore: false,
  });

  // Toggle handler for sync options
  const handleToggleOption = (option: keyof typeof syncConfig) => {
    setSyncConfig((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  // View mode for displaying manga entries
  const [displayMode, setDisplayMode] = useState<"cards" | "compact">("cards");

  // State to hold manga matches
  const [mangaMatches, setMangaMatches] = useState<MangaMatchResult[]>([]);

  // Lazy loading implementation
  const [visibleItems, setVisibleItems] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // State to hold user's AniList library
  const [userLibrary, setUserLibrary] = useState<UserMediaList>({});
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  // Sorting and filtering options
  const [sortOption, setSortOption] = useState<{
    field: "title" | "status" | "progress" | "score" | "changes";
    direction: "asc" | "desc";
  }>({ field: "title", direction: "asc" });

  const [filters, setFilters] = useState({
    status: "all", // 'all', 'reading', 'completed', 'planned', 'paused', 'dropped'
    changes: "all", // 'all', 'with-changes', 'no-changes'
    library: "all", // 'all', 'new', 'existing'
  });

  // Load manga matches from the app's storage system
  useEffect(() => {
    const savedResults = getSavedMatchResults();
    if (savedResults && Array.isArray(savedResults)) {
      console.log(`Loaded ${savedResults.length} match results from storage`);
      setMangaMatches(savedResults as MangaMatchResult[]);
    } else {
      console.error("No match results found in storage");
      // Navigate back to matching page if no data
      navigate({ to: "/review" });
    }
  }, [navigate]);

  // Fetch the user's AniList library for comparison
  useEffect(() => {
    if (token && mangaMatches.length > 0) {
      setLibraryLoading(true);
      setLibraryError(null);

      const controller = new AbortController();

      getUserMangaList(token, controller.signal)
        .then((library) => {
          console.log(
            `Loaded ${Object.keys(library).length} entries from user's AniList library`,
          );
          setUserLibrary(library);
          setLibraryLoading(false);
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            console.error("Failed to load user library:", error);
            // Set user-friendly error message
            setLibraryError(
              error.message ||
                "Failed to load your AniList library. Synchronization can still proceed, but comparison data will not be shown.",
            );
            // Still allow sync to proceed with empty library data
            setUserLibrary({});
            setLibraryLoading(false);
          }
        });

      return () => controller.abort();
    }
  }, [token, mangaMatches]);

  // Effect for lazy loading intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && mangaMatches.length > visibleItems) {
          setVisibleItems((prev) => Math.min(prev + 20, mangaMatches.length));
        }
      },
      { rootMargin: "200px" },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [mangaMatches.length, visibleItems]);

  // Reset visible items when changing display mode
  useEffect(() => {
    setVisibleItems(20);
  }, [displayMode]);

  // Apply filters to manga matches
  const filteredMangaMatches = useMemo(() => {
    return mangaMatches
      .filter(
        (match) => match.status === "matched" || match.status === "manual",
      )
      .filter((match) => match.selectedMatch !== undefined)
      .filter((match) => {
        // Status filter
        if (filters.status !== "all") {
          const kenmeiStatus = match.kenmeiManga.status.toLowerCase();

          if (filters.status === "reading" && kenmeiStatus !== "reading")
            return false;
          if (filters.status === "completed" && kenmeiStatus !== "completed")
            return false;
          if (filters.status === "planned" && kenmeiStatus !== "plan_to_read")
            return false;
          if (filters.status === "paused" && kenmeiStatus !== "on_hold")
            return false;
          if (filters.status === "dropped" && kenmeiStatus !== "dropped")
            return false;
        }

        // Changes filter
        if (filters.changes !== "all") {
          const anilist = match.selectedMatch!;
          const kenmei = match.kenmeiManga;
          const userEntry = userLibrary[anilist.id];

          // Calculate if any changes will be made
          const isCompleted =
            userEntry &&
            userEntry.status === "COMPLETED" &&
            syncConfig.preserveCompletedStatus;

          // If completed and we're preserving completed status, no changes will be made
          if (isCompleted) {
            if (filters.changes === "with-changes") return false;
          } else {
            const statusWillChange = userEntry
              ? syncConfig.prioritizeAniListStatus
                ? false
                : STATUS_MAPPING[kenmei.status] !== userEntry.status
              : true;

            const progressWillChange = userEntry
              ? syncConfig.prioritizeAniListProgress
                ? userEntry.progress && userEntry.progress > 0
                  ? (kenmei.chapters_read || 0) > userEntry.progress
                  : (kenmei.chapters_read || 0) > 0
                : (kenmei.chapters_read || 0) !== (userEntry.progress || 0)
              : true;

            const anilistScore = userEntry ? Number(userEntry.score || 0) : 0;
            const kenmeiScore = Number(kenmei.score || 0);

            const scoreWillChange = userEntry
              ? userEntry.status === "COMPLETED" &&
                syncConfig.preserveCompletedStatus
                ? false
                : syncConfig.prioritizeAniListScore && anilistScore > 0
                  ? false
                  : kenmeiScore > 0 &&
                    (anilistScore === 0 ||
                      Math.abs(kenmeiScore - anilistScore) >= 0.5)
              : kenmeiScore > 0;

            const hasChanges =
              statusWillChange || progressWillChange || scoreWillChange;

            if (filters.changes === "with-changes" && !hasChanges) return false;
            if (filters.changes === "no-changes" && hasChanges) return false;
          }
        }

        // Library filter
        if (filters.library !== "all") {
          const anilist = match.selectedMatch!;
          const isNewEntry = !userLibrary[anilist.id];

          if (filters.library === "new" && !isNewEntry) return false;
          if (filters.library === "existing" && isNewEntry) return false;
        }

        return true;
      });
  }, [mangaMatches, filters, userLibrary, syncConfig]);

  // Apply sorting to filtered manga matches
  const sortedMangaMatches = useMemo(() => {
    return [...filteredMangaMatches].sort((a, b) => {
      const anilistA = a.selectedMatch!;
      const anilistB = b.selectedMatch!;
      const kenmeiA = a.kenmeiManga;
      const kenmeiB = b.kenmeiManga;

      // Calculate changes for sorting by changes
      const getChangeCount = (match: MangaMatchResult) => {
        const anilist = match.selectedMatch!;
        const kenmei = match.kenmeiManga;
        const userEntry = userLibrary[anilist.id];
        const isCompleted =
          userEntry &&
          userEntry.status === "COMPLETED" &&
          syncConfig.preserveCompletedStatus;

        if (isCompleted) return 0;
        if (!userEntry) return 3; // New entry, all fields will change

        const statusWillChange =
          !syncConfig.prioritizeAniListStatus &&
          STATUS_MAPPING[kenmei.status] !== userEntry.status;

        const progressWillChange = syncConfig.prioritizeAniListProgress
          ? (kenmei.chapters_read || 0) > (userEntry.progress || 0)
          : (kenmei.chapters_read || 0) !== (userEntry.progress || 0);

        const anilistScore = Number(userEntry.score);
        const kenmeiScore = Number(kenmei.score || 0);

        const scoreWillChange =
          !syncConfig.prioritizeAniListScore &&
          kenmei.score > 0 &&
          (anilistScore === 0 || Math.abs(kenmeiScore - anilistScore) >= 0.5);

        return (
          (statusWillChange ? 1 : 0) +
          (progressWillChange ? 1 : 0) +
          (scoreWillChange ? 1 : 0)
        );
      };

      // Sort based on the selected field
      let comparison = 0;

      switch (sortOption.field) {
        case "title":
          comparison = (anilistA.title.romaji || kenmeiA.title).localeCompare(
            anilistB.title.romaji || kenmeiB.title,
          );
          break;

        case "status":
          comparison = kenmeiA.status.localeCompare(kenmeiB.status);
          break;

        case "progress":
          comparison =
            (kenmeiA.chapters_read || 0) - (kenmeiB.chapters_read || 0);
          break;

        case "score":
          comparison = (kenmeiA.score || 0) - (kenmeiB.score || 0);
          break;

        case "changes":
          comparison = getChangeCount(b) - getChangeCount(a);
          break;
      }

      // Apply sort direction
      return sortOption.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredMangaMatches, sortOption, userLibrary, syncConfig]);

  // Transform manga matches into AniList media entries for syncing
  const entriesToSync = useMemo(() => {
    return sortedMangaMatches
      .filter(
        (match) => match.status === "matched" || match.status === "manual",
      )
      .filter((match) => match.selectedMatch !== undefined)
      .map((match) => {
        // Get Kenmei data
        const kenmei = match.kenmeiManga;
        const anilist = match.selectedMatch!;

        // Check if we have existing user data for this title
        const userEntry = userLibrary[anilist.id];

        // If the title is already COMPLETED in AniList and we want to preserve completed status, don't update it
        if (
          userEntry &&
          userEntry.status === "COMPLETED" &&
          syncConfig.preserveCompletedStatus
        ) {
          return null; // Skip this entry completely
        }

        // Create AniList entry
        const entry: AniListMediaEntry = {
          mediaId: anilist.id,
          status:
            syncConfig.prioritizeAniListStatus && userEntry?.status
              ? (userEntry.status as MediaListStatus)
              : STATUS_MAPPING[kenmei.status],
          progress:
            syncConfig.prioritizeAniListProgress &&
            userEntry?.progress &&
            userEntry.progress > 0
              ? userEntry.progress > (kenmei.chapters_read || 0)
                ? userEntry.progress
                : kenmei.chapters_read || 0
              : kenmei.chapters_read || 0,
          private: false,
          score: kenmei.score || 0, // Default value before applying rules
        };

        // Apply score prioritization rules
        if (userEntry && kenmei.score > 0) {
          // Convert both scores to numbers for consistent comparison
          const anilistScore = Number(userEntry.score || 0);
          const kenmeiScore = Number(kenmei.score);

          // Only prioritize AniList scores if they're greater than 0 and prioritization is enabled
          if (
            (syncConfig.prioritizeAniListScore && anilistScore > 0) ||
            anilistScore === kenmeiScore ||
            Math.abs(kenmeiScore - anilistScore) < 0.5
          ) {
            entry.score = userEntry.score || kenmei.score; // Keep the existing score if it exists
          }
        }

        return entry;
      })
      .filter((entry) => entry !== null) as AniListMediaEntry[]; // Filter out null entries
  }, [sortedMangaMatches, userLibrary, syncConfig]);

  // Start the sync process
  const handleStartSync = () => {
    if (entriesToSync.length === 0) {
      return;
    }

    setViewMode("sync");
    actions.startSync(entriesToSync, token || "");
  };

  // Handle sync completion
  const handleSyncComplete = () => {
    setViewMode("results");
  };

  // Handle sync cancellation
  const handleCancel = () => {
    if (viewMode === "sync") {
      actions.cancelSync();
    }

    // Navigate back to the matching page
    navigate({ to: "/review" });
  };

  // Handle final completion (after viewing results)
  const handleComplete = () => {
    actions.reset();
    // We don't need to remove the match results from storage
    // as they will be preserved for future use
    // Navigate to the home page
    navigate({ to: "/" });
  };

  // If no manga matches are loaded yet, show loading state
  if (mangaMatches.length === 0) {
    return (
      <div className="container py-6">
        <Card className="mx-auto w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div
              className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent text-blue-600"
              role="status"
              aria-label="loading"
            >
              <span className="sr-only">Loading...</span>
            </div>
            <h3 className="text-lg font-medium">
              Loading Synchronization Data
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Please wait while we load your matched manga data...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render the appropriate view based on state
  const renderContent = () => {
    switch (viewMode) {
      case "preview":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Preview</CardTitle>
                <CardDescription>
                  Review the changes that will be applied to your AniList
                  account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Sync Configuration */}
                <Collapsible className="mb-4">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex w-full items-center justify-between p-3"
                    >
                      <span className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Sync Configuration
                      </span>
                      <span className="text-muted-foreground text-xs">
                        Click to expand
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 rounded-md border bg-slate-50 p-4 dark:bg-slate-900">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="prioritizeAniListStatus"
                            className="flex-1 text-sm"
                          >
                            Prioritize AniList status
                            <span className="text-muted-foreground block text-xs">
                              When enabled, keeps your existing AniList status
                            </span>
                          </Label>
                          <Switch
                            id="prioritizeAniListStatus"
                            checked={syncConfig.prioritizeAniListStatus}
                            onCheckedChange={() =>
                              handleToggleOption("prioritizeAniListStatus")
                            }
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="preserveCompletedStatus"
                            className="flex-1 text-sm"
                          >
                            Preserve Completed Status
                            <span className="text-muted-foreground block text-xs">
                              Always preserve entries marked as COMPLETED in
                              AniList
                            </span>
                          </Label>
                          <Switch
                            id="preserveCompletedStatus"
                            checked={syncConfig.preserveCompletedStatus}
                            onCheckedChange={() =>
                              handleToggleOption("preserveCompletedStatus")
                            }
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="prioritizeAniListProgress"
                            className="flex-1 text-sm"
                          >
                            Prioritize AniList progress
                            <span className="text-muted-foreground block text-xs">
                              When enabled, keeps higher chapter counts from
                              AniList (Does not apply when the prioritized
                              source is 0 or none/null)
                            </span>
                          </Label>
                          <Switch
                            id="prioritizeAniListProgress"
                            checked={syncConfig.prioritizeAniListProgress}
                            onCheckedChange={() =>
                              handleToggleOption("prioritizeAniListProgress")
                            }
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="prioritizeAniListScore"
                            className="flex-1 text-sm"
                          >
                            Prioritize AniList scores
                            <span className="text-muted-foreground block text-xs">
                              When enabled, keeps your existing AniList scores
                              (Does not apply when the prioritized source is
                              none/null)
                            </span>
                          </Label>
                          <Switch
                            id="prioritizeAniListScore"
                            checked={syncConfig.prioritizeAniListScore}
                            onCheckedChange={() =>
                              handleToggleOption("prioritizeAniListScore")
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Summary of changes */}
                <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                  <h3 className="flex items-center text-sm font-medium">
                    <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
                    Changes Summary
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {
                      mangaMatches.filter(
                        (match) =>
                          match.status === "matched" ||
                          match.status === "manual",
                      ).length
                    }{" "}
                    (excluding skipped matches) entries will be synchronized to
                    your AniList account.
                  </p>

                  {libraryLoading && (
                    <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading your AniList library for comparison...
                    </div>
                  )}

                  {libraryError && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-3 w-3" />
                      {libraryError}
                      <Button
                        variant="link"
                        className="h-auto px-0 py-0 text-xs"
                        onClick={() => {
                          setLibraryLoading(true);
                          setLibraryError(null);

                          const controller = new AbortController();

                          getUserMangaList(token, controller.signal)
                            .then((library) => {
                              console.log(
                                `Loaded ${Object.keys(library).length} entries from user's AniList library`,
                              );
                              setUserLibrary(library);
                              setLibraryLoading(false);
                            })
                            .catch((error) => {
                              if (error.name !== "AbortError") {
                                console.error(
                                  "Failed to load user library again:",
                                  error,
                                );
                                setLibraryError(
                                  error.message ||
                                    "Failed to load your AniList library. Synchronization can still proceed without comparison data.",
                                );
                                setUserLibrary({});
                                setLibraryLoading(false);
                              }
                            });
                        }}
                      >
                        Try Again
                      </Button>
                    </div>
                  )}

                  {!libraryLoading &&
                    !libraryError &&
                    userLibrary &&
                    Object.keys(userLibrary).length > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                        <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                        <span>
                          Found{" "}
                          <span className="font-semibold">
                            {Object.keys(userLibrary).length}
                          </span>{" "}
                          unique entries in your AniList library for comparison
                        </span>
                      </div>
                    )}

                  {!libraryLoading && !libraryError && (
                    <div className="mt-4 rounded bg-blue-50 p-2 text-xs text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                      <div className="mb-1 font-semibold">
                        Manga Statistics:
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">
                            Kenmei manga:
                          </span>{" "}
                          {mangaMatches.length}
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">
                            AniList library:
                          </span>{" "}
                          {Object.keys(userLibrary).length}
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">
                            New entries:
                          </span>{" "}
                          {
                            mangaMatches.filter(
                              (match) =>
                                match.selectedMatch &&
                                !userLibrary[match.selectedMatch.id],
                            ).length
                          }
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">
                            Updates:
                          </span>{" "}
                          {
                            mangaMatches.filter((match) => {
                              // Only count manga that will actually have changes
                              if (!match.selectedMatch) return false;

                              const anilist = match.selectedMatch;
                              const kenmei = match.kenmeiManga;
                              const userEntry = userLibrary[anilist.id];

                              // Skip if not in user library or if completed and we're preserving completed status
                              if (
                                !userEntry ||
                                (userEntry.status === "COMPLETED" &&
                                  syncConfig.preserveCompletedStatus)
                              ) {
                                return false;
                              }

                              // Check if any values will change based on sync configuration
                              const statusWillChange =
                                syncConfig.prioritizeAniListStatus
                                  ? false
                                  : STATUS_MAPPING[kenmei.status] !==
                                    userEntry.status;

                              const progressWillChange =
                                syncConfig.prioritizeAniListProgress
                                  ? userEntry.progress && userEntry.progress > 0
                                    ? (kenmei.chapters_read || 0) >
                                      userEntry.progress
                                    : (kenmei.chapters_read || 0) > 0
                                  : (kenmei.chapters_read || 0) !==
                                    (userEntry.progress || 0);

                              const anilistScore = Number(userEntry.score || 0);
                              const kenmeiScore = Number(kenmei.score || 0);
                              const scoreWillChange =
                                syncConfig.prioritizeAniListScore &&
                                userEntry.score &&
                                Number(userEntry.score) > 0
                                  ? false
                                  : kenmei.score > 0 &&
                                    (anilistScore === 0 ||
                                      Math.abs(kenmeiScore - anilistScore) >=
                                        0.5);

                              // Count entry only if at least one value will change
                              return (
                                statusWillChange ||
                                progressWillChange ||
                                scoreWillChange
                              );
                            }).length
                          }
                        </div>
                      </div>

                      <div className="mt-2 border-t border-blue-200 pt-2 text-amber-600 dark:border-blue-800 dark:text-amber-400">
                        <strong className="text-xs">Note:</strong> Media entries
                        with &ldquo;Hide from status lists&rdquo; option set to
                        true and not associated with any custom lists will not
                        be returned by the query and will be treated as not in
                        your library.
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-4 flex items-center justify-between">
                  {/* Display Mode Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">View:</span>
                    <div className="border-input bg-background inline-flex items-center rounded-md border p-1">
                      <Button
                        variant={displayMode === "cards" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 rounded-sm px-2"
                        onClick={() => setDisplayMode("cards")}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <rect width="7" height="7" x="3" y="3" rx="1" />
                          <rect width="7" height="7" x="14" y="3" rx="1" />
                          <rect width="7" height="7" x="14" y="14" rx="1" />
                          <rect width="7" height="7" x="3" y="14" rx="1" />
                        </svg>
                        Cards
                      </Button>
                      <Button
                        variant={
                          displayMode === "compact" ? "default" : "ghost"
                        }
                        size="sm"
                        className="h-8 rounded-sm px-2"
                        onClick={() => setDisplayMode("compact")}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <line x1="3" x2="21" y1="6" y2="6" />
                          <line x1="3" x2="21" y1="12" y2="12" />
                          <line x1="3" x2="21" y1="18" y2="18" />
                        </svg>
                        Compact
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {/* Sort Dropdown - Improved */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          <SortAsc className="mr-1 h-4 w-4" />
                          Sort
                          {sortOption.field !== "title" ||
                          sortOption.direction !== "asc" ? (
                            <span className="ml-1 text-xs opacity-70">
                              (
                              {sortOption.field.charAt(0).toUpperCase() +
                                sortOption.field.slice(1)}
                              , {sortOption.direction === "asc" ? "↑" : "↓"})
                            </span>
                          ) : null}
                          <span className="sr-only">Sort</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <div className="p-2">
                          <div className="mb-2 flex items-center justify-between">
                            <DropdownMenuLabel className="p-0">
                              Sort by
                            </DropdownMenuLabel>
                            <div className="flex overflow-hidden rounded-md border">
                              <Button
                                variant={
                                  sortOption.direction === "asc"
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                className="h-7 rounded-none border-0 px-2"
                                onClick={() =>
                                  setSortOption((prev) => ({
                                    ...prev,
                                    direction: "asc",
                                  }))
                                }
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="m3 8 4-4 4 4" />
                                  <path d="M7 4v16" />
                                  <path d="M11 12h4" />
                                  <path d="M11 16h7" />
                                  <path d="M11 20h10" />
                                </svg>
                                <span className="sr-only">Ascending</span>
                              </Button>
                              <Button
                                variant={
                                  sortOption.direction === "desc"
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                className="h-7 rounded-none border-0 px-2"
                                onClick={() =>
                                  setSortOption((prev) => ({
                                    ...prev,
                                    direction: "desc",
                                  }))
                                }
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="m3 16 4 4 4-4" />
                                  <path d="M7 20V4" />
                                  <path d="M11 4h4" />
                                  <path d="M11 8h7" />
                                  <path d="M11 12h10" />
                                </svg>
                                <span className="sr-only">Descending</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            setSortOption((prev) => ({
                              ...prev,
                              field: "title",
                            }))
                          }
                          className="flex justify-between"
                        >
                          Title
                          {sortOption.field === "title" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setSortOption((prev) => ({
                              ...prev,
                              field: "status",
                            }))
                          }
                          className="flex justify-between"
                        >
                          Status
                          {sortOption.field === "status" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setSortOption((prev) => ({
                              ...prev,
                              field: "progress",
                            }))
                          }
                          className="flex justify-between"
                        >
                          Progress
                          {sortOption.field === "progress" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setSortOption((prev) => ({
                              ...prev,
                              field: "score",
                            }))
                          }
                          className="flex justify-between"
                        >
                          Score
                          {sortOption.field === "score" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setSortOption((prev) => ({
                              ...prev,
                              field: "changes",
                            }))
                          }
                          className="flex justify-between"
                        >
                          Changes count
                          {sortOption.field === "changes" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Filter Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          <Filter className="mr-1 h-4 w-4" />
                          Filter
                          <span className="sr-only">Filter</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            setFilters((prev) => ({ ...prev, status: "all" }))
                          }
                          className="flex justify-between"
                        >
                          All statuses
                          {filters.status === "all" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              status: "reading",
                            }))
                          }
                          className="flex justify-between"
                        >
                          Reading
                          {filters.status === "reading" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              status: "completed",
                            }))
                          }
                          className="flex justify-between"
                        >
                          Completed
                          {filters.status === "completed" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              status: "planned",
                            }))
                          }
                          className="flex justify-between"
                        >
                          Plan to Read
                          {filters.status === "planned" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              status: "paused",
                            }))
                          }
                          className="flex justify-between"
                        >
                          On Hold
                          {filters.status === "paused" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              status: "dropped",
                            }))
                          }
                          className="flex justify-between"
                        >
                          Dropped
                          {filters.status === "dropped" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Filter by Changes</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            setFilters((prev) => ({ ...prev, changes: "all" }))
                          }
                          className="flex justify-between"
                        >
                          All entries
                          {filters.changes === "all" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              changes: "with-changes",
                            }))
                          }
                          className="flex justify-between"
                        >
                          With changes
                          {filters.changes === "with-changes" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              changes: "no-changes",
                            }))
                          }
                          className="flex justify-between"
                        >
                          No changes
                          {filters.changes === "no-changes" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Filter by Library</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            setFilters((prev) => ({ ...prev, library: "all" }))
                          }
                          className="flex justify-between"
                        >
                          All entries
                          {filters.library === "all" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setFilters((prev) => ({ ...prev, library: "new" }))
                          }
                          className="flex justify-between"
                        >
                          New to library
                          {filters.library === "new" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              library: "existing",
                            }))
                          }
                          className="flex justify-between"
                        >
                          Already in library
                          {filters.library === "existing" && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        setSortOption({ field: "title", direction: "asc" });
                        setFilters({
                          status: "all",
                          changes: "all",
                          library: "all",
                        });
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Results counter */}
                {sortedMangaMatches.length !== mangaMatches.length && (
                  <div className="bg-muted/30 mb-4 flex items-center justify-between rounded-md px-3 py-2 text-sm">
                    <div>
                      Showing{" "}
                      <span className="font-medium">
                        {sortedMangaMatches.length}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium">
                        {
                          mangaMatches.filter(
                            (match) => match.status !== "skipped",
                          ).length
                        }
                      </span>{" "}
                      manga
                      {Object.values(filters).some((v) => v !== "all") && (
                        <span className="text-muted-foreground ml-1">
                          (filtered)
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSortOption({ field: "title", direction: "asc" });
                        setFilters({
                          status: "all",
                          changes: "all",
                          library: "all",
                        });
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}

                <div className="max-h-[60vh] overflow-y-auto">
                  {displayMode === "cards" ? (
                    <div className="grid grid-cols-1 gap-4">
                      {sortedMangaMatches
                        .slice(0, visibleItems)
                        .map((match, index) => {
                          const kenmei = match.kenmeiManga;
                          const anilist = match.selectedMatch!;

                          // Get the user's existing data for this manga if it exists
                          const userEntry = userLibrary[anilist.id];

                          // Determine what will change based on sync configuration
                          const statusWillChange = userEntry
                            ? syncConfig.prioritizeAniListStatus
                              ? false // If prioritizing AniList status, it won't change
                              : STATUS_MAPPING[kenmei.status] !==
                                  userEntry.status &&
                                !(
                                  userEntry.status === "COMPLETED" &&
                                  syncConfig.preserveCompletedStatus
                                )
                            : true;

                          const progressWillChange = userEntry
                            ? syncConfig.prioritizeAniListProgress
                              ? // Only consider AniList progress if it's greater than 0
                                userEntry.progress && userEntry.progress > 0
                                ? (kenmei.chapters_read || 0) >
                                  userEntry.progress // Compare only if AniList progress > 0
                                : (kenmei.chapters_read || 0) > 0 // Otherwise, just check if Kenmei has progress
                              : (kenmei.chapters_read || 0) !==
                                (userEntry.progress || 0)
                            : true;

                          const scoreWillChange = userEntry
                            ? // Don't update completed entries if preserve setting is on
                              userEntry.status === "COMPLETED" &&
                              syncConfig.preserveCompletedStatus
                              ? false
                              : // Apply score prioritization rules
                                syncConfig.prioritizeAniListScore &&
                                  userEntry.score &&
                                  Number(userEntry.score) > 0
                                ? false // Only prioritize if AniList score > 0
                                : // Only consider a change if Kenmei has a score
                                  kenmei.score > 0 &&
                                  // Convert both scores to numbers and compare
                                  // If AniList has no score but Kenmei does, that's a change
                                  (Number(userEntry.score || 0) === 0 ||
                                    // Use threshold comparison after explicit number conversion
                                    Math.abs(
                                      Number(kenmei.score) -
                                        Number(userEntry.score || 0),
                                    ) >= 0.5)
                            : // For new entries, only show score change if Kenmei has a score
                              kenmei.score > 0;

                          // Track if manga is new to the user's library or shouldn't be updated due to special cases
                          const isNewEntry = !userEntry;
                          const isCompleted =
                            userEntry && userEntry.status === "COMPLETED";

                          // Count the number of changes
                          const changeCount = [
                            statusWillChange,
                            progressWillChange,
                            scoreWillChange,
                          ].filter(Boolean).length;

                          return (
                            <Card
                              key={index}
                              className="overflow-hidden transition-shadow duration-200 hover:shadow-md"
                            >
                              <div className="flex">
                                {/* Manga Cover Image - Updated styling */}
                                <div className="relative flex h-[200px] flex-shrink-0 items-center justify-center pl-3">
                                  {anilist.coverImage?.large ||
                                  anilist.coverImage?.medium ? (
                                    <img
                                      src={
                                        anilist.coverImage?.large ||
                                        anilist.coverImage?.medium
                                      }
                                      alt={anilist.title.romaji || ""}
                                      className="h-full w-[145px] rounded-sm object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-[200px] items-center justify-center rounded-sm bg-slate-200 dark:bg-slate-800">
                                      <span className="text-muted-foreground text-xs">
                                        No Cover
                                      </span>
                                    </div>
                                  )}

                                  {/* Status Badges - Removed Manual badge */}
                                  <div className="absolute top-2 left-4 flex flex-col gap-1">
                                    {isNewEntry && (
                                      <Badge className="bg-emerald-500">
                                        New
                                      </Badge>
                                    )}
                                    {isCompleted && (
                                      <Badge
                                        variant="outline"
                                        className="border-amber-500 text-amber-700 dark:text-amber-400"
                                      >
                                        Completed
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h3 className="line-clamp-2 text-base font-semibold">
                                        {anilist.title.romaji || kenmei.title}
                                      </h3>
                                      {changeCount > 0 && !isCompleted ? (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {statusWillChange && (
                                            <Badge
                                              variant="outline"
                                              className="border-blue-400 px-1.5 py-0 text-xs text-blue-600 dark:text-blue-400"
                                            >
                                              Status
                                            </Badge>
                                          )}

                                          {progressWillChange && (
                                            <Badge
                                              variant="outline"
                                              className="border-green-400 px-1.5 py-0 text-xs text-green-600 dark:text-green-400"
                                            >
                                              Progress
                                            </Badge>
                                          )}

                                          {scoreWillChange && (
                                            <Badge
                                              variant="outline"
                                              className="border-amber-400 px-1.5 py-0 text-xs text-amber-600 dark:text-amber-400"
                                            >
                                              Score
                                            </Badge>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="mt-1">
                                          <Badge
                                            variant="outline"
                                            className="text-muted-foreground px-1.5 py-0 text-xs"
                                          >
                                            {isCompleted
                                              ? "Preserving Completed"
                                              : "No Changes"}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>

                                    {/* Change Indicator */}
                                    {changeCount > 0 && !isCompleted && (
                                      <div className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                                        {changeCount} change
                                        {changeCount !== 1 ? "s" : ""}
                                      </div>
                                    )}
                                  </div>

                                  {/* Comparison Table */}
                                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                                    <div
                                      className={`rounded-md p-2 ${isNewEntry ? "bg-slate-100 dark:bg-slate-800/60" : "bg-slate-100 dark:bg-slate-800/60"}`}
                                    >
                                      <h4 className="text-muted-foreground mb-2 text-xs font-medium">
                                        {isNewEntry
                                          ? "Not in Library"
                                          : "Current AniList"}
                                      </h4>

                                      {isNewEntry ? (
                                        <div className="text-muted-foreground py-4 text-center text-xs">
                                          New addition to your library
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-xs">
                                              Status:
                                            </span>
                                            <span
                                              className={`text-xs font-medium ${statusWillChange ? "text-muted-foreground line-through" : ""}`}
                                            >
                                              {userEntry?.status || "None"}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-xs">
                                              Progress:
                                            </span>
                                            <span
                                              className={`text-xs font-medium ${progressWillChange ? "text-muted-foreground line-through" : ""}`}
                                            >
                                              {userEntry?.progress || 0} ch
                                              {anilist.chapters
                                                ? ` / ${anilist.chapters}`
                                                : ""}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-xs">
                                              Score:
                                            </span>
                                            <span
                                              className={`text-xs font-medium ${scoreWillChange ? "text-muted-foreground line-through" : ""}`}
                                            >
                                              {userEntry?.score
                                                ? `${userEntry.score}/10`
                                                : "None"}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="rounded-md bg-blue-50 p-2 dark:bg-blue-900/20">
                                      <h4 className="mb-2 text-xs font-medium text-blue-600 dark:text-blue-300">
                                        After Sync
                                      </h4>

                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-blue-500 dark:text-blue-400">
                                            Status:
                                          </span>
                                          <span
                                            className={`text-xs font-medium ${statusWillChange ? "text-blue-700 dark:text-blue-300" : ""}`}
                                          >
                                            {STATUS_MAPPING[kenmei.status]}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-blue-500 dark:text-blue-400">
                                            Progress:
                                          </span>
                                          <span
                                            className={`text-xs font-medium ${progressWillChange ? "text-blue-700 dark:text-blue-300" : ""}`}
                                          >
                                            {kenmei.chapters_read || 0} ch
                                            {anilist.chapters
                                              ? ` / ${anilist.chapters}`
                                              : ""}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-blue-500 dark:text-blue-400">
                                            Score:
                                          </span>
                                          <span
                                            className={`text-xs font-medium ${scoreWillChange ? "text-blue-700 dark:text-blue-300" : ""}`}
                                          >
                                            {kenmei.score
                                              ? `${kenmei.score}/10`
                                              : "None"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}

                      {/* Load more reference div */}
                      {sortedMangaMatches.length > visibleItems && (
                        <div ref={loadMoreRef} className="py-4 text-center">
                          <div className="text-primary inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          <p className="text-muted-foreground mt-2 text-sm">
                            Loading more manga...
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 overflow-hidden rounded-md border">
                      {sortedMangaMatches
                        .slice(0, visibleItems)
                        .map((match, index) => {
                          const kenmei = match.kenmeiManga;
                          const anilist = match.selectedMatch!;

                          // Get the user's existing data for this manga if it exists
                          const userEntry = userLibrary[anilist.id];

                          // Determine what will change based on sync configuration
                          const statusWillChange = userEntry
                            ? syncConfig.prioritizeAniListStatus
                              ? false // If prioritizing AniList status, it won't change
                              : STATUS_MAPPING[kenmei.status] !==
                                  userEntry.status &&
                                !(
                                  userEntry.status === "COMPLETED" &&
                                  syncConfig.preserveCompletedStatus
                                )
                            : true;

                          const progressWillChange = userEntry
                            ? syncConfig.prioritizeAniListProgress
                              ? // Only consider AniList progress if it's greater than 0
                                userEntry.progress && userEntry.progress > 0
                                ? (kenmei.chapters_read || 0) >
                                  userEntry.progress // Compare only if AniList progress > 0
                                : (kenmei.chapters_read || 0) > 0 // Otherwise, just check if Kenmei has progress
                              : (kenmei.chapters_read || 0) !==
                                (userEntry.progress || 0)
                            : true;

                          const scoreWillChange = userEntry
                            ? // Don't update completed entries if preserve setting is on
                              userEntry.status === "COMPLETED" &&
                              syncConfig.preserveCompletedStatus
                              ? false
                              : // Apply score prioritization rules
                                syncConfig.prioritizeAniListScore &&
                                  userEntry.score &&
                                  Number(userEntry.score) > 0
                                ? false // Only prioritize if AniList score > 0
                                : // Only consider a change if Kenmei has a score
                                  kenmei.score > 0 &&
                                  // Convert both scores to numbers and compare
                                  // If AniList has no score but Kenmei does, that's a change
                                  (Number(userEntry.score || 0) === 0 ||
                                    // Use threshold comparison after explicit number conversion
                                    Math.abs(
                                      Number(kenmei.score) -
                                        Number(userEntry.score || 0),
                                    ) >= 0.5)
                            : // For new entries, only show score change if Kenmei has a score
                              kenmei.score > 0;

                          // Track if manga is new to the user's library or shouldn't be updated due to special cases
                          const isNewEntry = !userEntry;
                          const isCompleted =
                            userEntry && userEntry.status === "COMPLETED";

                          // Count the number of changes
                          const changeCount = [
                            statusWillChange,
                            progressWillChange,
                            scoreWillChange,
                          ].filter(Boolean).length;

                          return (
                            <div
                              key={index}
                              className={`hover:bg-muted/50 flex items-center px-3 py-2 ${index % 2 === 0 ? "bg-muted/30" : ""} ${isCompleted ? "bg-amber-50/50 dark:bg-amber-950/20" : ""} ${isNewEntry ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}
                            >
                              {/* Thumbnail - Updated styling */}
                              <div className="mr-3 flex flex-shrink-0 items-center pl-2">
                                {anilist.coverImage?.large ||
                                anilist.coverImage?.medium ? (
                                  <img
                                    src={
                                      anilist.coverImage?.large ||
                                      anilist.coverImage?.medium
                                    }
                                    alt={anilist.title.romaji || ""}
                                    className="h-12 w-8 rounded-sm object-cover"
                                  />
                                ) : (
                                  <div className="flex h-12 w-8 items-center justify-center rounded-sm bg-slate-200 dark:bg-slate-800">
                                    <span className="text-muted-foreground text-[8px]">
                                      No Cover
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Title and status */}
                              <div className="mr-2 min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">
                                  {anilist.title.romaji || kenmei.title}
                                </div>
                                <div className="mt-0.5 flex items-center gap-1">
                                  {isNewEntry && (
                                    <Badge className="px-1 py-0 text-[10px]">
                                      New
                                    </Badge>
                                  )}
                                  {isCompleted && (
                                    <Badge
                                      variant="outline"
                                      className="border-amber-500 px-1 py-0 text-[10px] text-amber-700"
                                    >
                                      Completed
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Changes */}
                              <div className="flex flex-shrink-0 items-center gap-1">
                                {!isNewEntry && !isCompleted && (
                                  <>
                                    {statusWillChange && (
                                      <Badge
                                        variant="outline"
                                        className="border-blue-400 px-1 py-0 text-[10px]"
                                      >
                                        {userEntry?.status || "None"} →{" "}
                                        {STATUS_MAPPING[kenmei.status]}
                                      </Badge>
                                    )}

                                    {progressWillChange && (
                                      <Badge
                                        variant="outline"
                                        className="border-green-400 px-1 py-0 text-[10px]"
                                      >
                                        {userEntry?.progress || 0} →{" "}
                                        {kenmei.chapters_read || 0} ch
                                      </Badge>
                                    )}

                                    {scoreWillChange && (
                                      <Badge
                                        variant="outline"
                                        className="border-amber-400 px-1 py-0 text-[10px]"
                                      >
                                        {userEntry?.score || 0} →{" "}
                                        {kenmei.score || 0}/10
                                      </Badge>
                                    )}

                                    {changeCount === 0 && (
                                      <span className="text-muted-foreground px-1 text-[10px]">
                                        No Changes
                                      </span>
                                    )}
                                  </>
                                )}

                                {isNewEntry && (
                                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                    Adding to Library
                                  </span>
                                )}

                                {isCompleted && (
                                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                    Preserving Completed
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                      {/* Load more reference div */}
                      {sortedMangaMatches.length > visibleItems && (
                        <div
                          ref={loadMoreRef}
                          className="bg-muted/20 py-3 text-center"
                        >
                          <div className="text-primary inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          <span className="text-muted-foreground ml-2 text-xs">
                            Loading more...
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleStartSync}
                  disabled={entriesToSync.length === 0 || libraryLoading}
                  className="relative"
                >
                  Start Synchronization
                </Button>
              </CardFooter>
            </Card>
          </div>
        );

      case "sync":
        return (
          <SyncManager
            entries={entriesToSync}
            token={token || ""}
            onComplete={handleSyncComplete}
            onCancel={handleCancel}
          />
        );

      case "results":
        return state.report ? (
          <SyncResultsView
            report={state.report}
            onClose={handleComplete}
            onExportErrors={() =>
              state.report && exportSyncErrorLog(state.report)
            }
          />
        ) : (
          <Card className="mx-auto w-full max-w-md p-6 text-center">
            <CardContent>
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <h3 className="text-lg font-medium">Synchronization Error</h3>
              <p className="mt-2 text-sm text-slate-500">
                {state.error ||
                  "An unknown error occurred during synchronization."}
              </p>
            </CardContent>
            <CardFooter className="justify-center">
              <Button onClick={handleComplete}>Close</Button>
            </CardFooter>
          </Card>
        );
    }
  };

  return <div className="container py-6">{renderContent()}</div>;
}

export default SyncPage;
