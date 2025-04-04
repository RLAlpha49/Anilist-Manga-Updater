import React, { useState, useRef, useEffect } from "react";
import { MangaMatchResult } from "../../api/anilist/types";
import { KenmeiManga } from "../../api/kenmei/types";
import {
  Search,
  Check,
  X,
  AlertTriangle,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Info,
} from "lucide-react";

interface MangaMatchingPanelProps {
  matches: MangaMatchResult[];
  onManualSearch?: (kenmeiManga: KenmeiManga) => void;
  onAcceptMatch?: (match: MangaMatchResult) => void;
  onRejectMatch?: (match: MangaMatchResult) => void;
  onSelectAlternative?: (
    match: MangaMatchResult,
    alternativeIndex: number,
    autoAccept?: boolean,
    directAccept?: boolean,
  ) => void;
  onResetToPending?: (match: MangaMatchResult) => void;
}

export function MangaMatchingPanel({
  matches,
  onManualSearch,
  onAcceptMatch,
  onRejectMatch,
  onSelectAlternative,
  onResetToPending,
}: MangaMatchingPanelProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilters, setStatusFilters] = useState({
    matched: true,
    pending: true,
    manual: true,
    skipped: true,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Add sort state
  const [sortOption, setSortOption] = useState<{
    field: "title" | "status" | "confidence" | "chapters_read";
    direction: "asc" | "desc";
  }>({ field: "title", direction: "asc" });

  // Items per page
  const itemsPerPage = 10;

  // Add state for processing status of the skip button
  const [isSkippingEmptyMatches, setIsSkippingEmptyMatches] = useState(false);
  // Add state for processing status of the accept all button
  const [isAcceptingAllMatches, setIsAcceptingAllMatches] = useState(false);

  // Handler for opening external links in the default browser
  const handleOpenExternal = (url: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.electronAPI?.shell?.openExternal) {
      window.electronAPI.shell.openExternal(url);
    } else {
      // Fallback to regular link behavior if not in Electron
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Helper function to create Kenmei URL from manga title
  const createKenmeiUrl = (title: string) => {
    if (!title) return null;
    // 1. Convert to lowercase
    // 2. Replace apostrophes with spaces
    // 3. Replace special characters with spaces (except hyphens)
    // 4. Replace multiple spaces with a single space
    // 5. Replace spaces with hyphens
    // 6. Trim hyphens from the beginning and end
    const formattedTitle = title
      .toLowerCase()
      .replace(/'/g, " ")
      .replace(/[^\w\s-]/g, " ") // Replace special chars with spaces instead of removing
      .replace(/\s+/g, " ") // Normalize spaces
      .trim() // Remove leading/trailing spaces
      .replace(/\s/g, "-") // Replace spaces with hyphens
      .replace(/^-+|-+$/g, ""); // Remove hyphens at start/end

    return `https://www.kenmei.co/series/${formattedTitle}`;
  };

  // Process matches to filter out Light Novels from alternatives
  const processedMatches = matches.map((match) => {
    // Ensure manga has an ID - if missing, generate one based on title
    if (match.kenmeiManga.id === undefined) {
      // Create a simple hash from the title
      const generatedId = match.kenmeiManga.title
        .split("")
        .reduce((hash, char) => (hash << 5) - hash + char.charCodeAt(0), 0);
      match = {
        ...match,
        kenmeiManga: {
          ...match.kenmeiManga,
          id: Math.abs(generatedId), // Use positive number
        },
      };
    }

    // Filter out Light Novels from anilistMatches
    const filteredMatches = match.anilistMatches
      ? match.anilistMatches.filter(
          (m) =>
            m.manga &&
            m.manga.format !== "NOVEL" &&
            m.manga.format !== "LIGHT_NOVEL",
        )
      : [];

    // If the selected match is a Light Novel, clear it
    const newSelectedMatch =
      match.selectedMatch &&
      (match.selectedMatch.format === "NOVEL" ||
        match.selectedMatch.format === "LIGHT_NOVEL")
        ? undefined
        : match.selectedMatch;

    // Return a new object with filtered matches
    return {
      ...match,
      anilistMatches: filteredMatches,
      selectedMatch: newSelectedMatch,
    };
  });

  // Filter and search matches
  const filteredMatches = processedMatches.filter((match) => {
    // Sanity check - skip entries with no ID
    if (match.kenmeiManga.id === undefined) {
      return false;
    }

    // Apply status filters
    const statusMatch =
      (match.status === "matched" && statusFilters.matched) ||
      (match.status === "pending" && statusFilters.pending) ||
      (match.status === "manual" && statusFilters.manual) ||
      (match.status === "skipped" && statusFilters.skipped);

    // Then apply search term if any
    const searchMatch =
      !searchTerm ||
      match.kenmeiManga.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (match.selectedMatch?.title?.english !== undefined &&
        match.selectedMatch.title.english !== null &&
        match.selectedMatch.title.english
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (match.selectedMatch?.title?.romaji !== undefined &&
        match.selectedMatch.title.romaji
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    return statusMatch && searchMatch;
  });

  // Sort the filtered matches
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    // Declare variables outside switch to avoid linter errors
    let titleA: string, titleB: string;
    let statusA: number, statusB: number;
    let confidenceA: number, confidenceB: number;
    let chaptersA: number, chaptersB: number;

    // Define status priority for sorting (matched > manual > conflict > pending > skipped)
    const statusPriority: Record<string, number> = {
      matched: 1,
      manual: 2,
      conflict: 3,
      pending: 4,
      skipped: 5,
    };

    switch (sortOption.field) {
      case "title":
        titleA = a.kenmeiManga.title.toLowerCase();
        titleB = b.kenmeiManga.title.toLowerCase();
        return sortOption.direction === "asc"
          ? titleA.localeCompare(titleB)
          : titleB.localeCompare(titleA);

      case "status":
        statusA = statusPriority[a.status] || 999;
        statusB = statusPriority[b.status] || 999;
        return sortOption.direction === "asc"
          ? statusA - statusB
          : statusB - statusA;

      case "confidence":
        // Get confidence scores
        // Entries with actual matches but 0 confidence should rank higher than entries with no matches at all
        confidenceA =
          a.anilistMatches?.length && a.anilistMatches.length > 0
            ? (a.anilistMatches[0].confidence ?? 0)
            : -1; // No matches at all should be lowest

        confidenceB =
          b.anilistMatches?.length && b.anilistMatches.length > 0
            ? (b.anilistMatches[0].confidence ?? 0)
            : -1; // No matches at all should be lowest

        return sortOption.direction === "asc"
          ? confidenceA - confidenceB
          : confidenceB - confidenceA;

      case "chapters_read":
        chaptersA = a.kenmeiManga.chapters_read || 0;
        chaptersB = b.kenmeiManga.chapters_read || 0;
        return sortOption.direction === "asc"
          ? chaptersA - chaptersB
          : chaptersB - chaptersA;

      default:
        return 0;
    }
  });

  // Pagination logic
  const totalPages = Math.max(
    1,
    Math.ceil(sortedMatches.length / itemsPerPage),
  );
  const currentMatches = sortedMatches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Auto-adjust current page if filters change
  useEffect(() => {
    // If current page is out of bounds, adjust it
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [statusFilters, searchTerm, totalPages, currentPage]);

  // Focus search input when pressing Ctrl+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Count statistics
  const matchStats = {
    total: matches.length,
    matched: matches.filter((m) => m.status === "matched").length,
    pending: matches.filter((m) => m.status === "pending").length,
    manual: matches.filter((m) => m.status === "manual").length,
    skipped: matches.filter((m) => m.status === "skipped").length,
  };

  // Handle pagination
  const goToPage = (page: number) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  // Add keyboard navigation for pagination
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if we're in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Only handle left/right arrow keys
      if (e.key === "ArrowLeft" && currentPage > 1) {
        goToPage(currentPage - 1);
      } else if (e.key === "ArrowRight" && currentPage < totalPages) {
        goToPage(currentPage + 1);
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentPage, totalPages]);

  // Handle sort change
  const handleSortChange = (
    field: "title" | "status" | "confidence" | "chapters_read",
  ) => {
    setSortOption((prev) => {
      // If clicking the same field, toggle direction
      if (prev.field === field) {
        return {
          ...prev,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      // If clicking a new field, default to ascending for title, descending for others
      return {
        field,
        direction: field === "title" ? "asc" : "desc",
      };
    });
  };

  // Function to render sort indicator
  const renderSortIndicator = (
    field: "title" | "status" | "confidence" | "chapters_read",
  ) => {
    if (sortOption.field !== field) return null;

    return (
      <span className="ml-1 text-xs">
        {sortOption.direction === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  // Render confidence badge
  const renderConfidenceBadge = (confidence: number | undefined) => {
    // If confidence is undefined, null, or NaN, return null (don't render anything)
    if (confidence === undefined || confidence === null || isNaN(confidence)) {
      return null;
    }

    // Round the confidence value for display and comparison
    const roundedConfidence = Math.min(99, Math.round(confidence)); // Cap at 99%

    // Determine color scheme and label based on confidence level
    let colorClass = "";
    let barColorClass = "";
    let label = "";

    // Even if confidence is 0, we'll still show it with styling
    if (roundedConfidence >= 90) {
      colorClass =
        "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800";
      barColorClass = "bg-green-500 dark:bg-green-400";
      label = "High";
    } else if (roundedConfidence >= 75) {
      colorClass =
        "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800";
      barColorClass = "bg-blue-500 dark:bg-blue-400";
      label = "Good";
    } else if (roundedConfidence >= 50) {
      colorClass =
        "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800";
      barColorClass = "bg-yellow-500 dark:bg-yellow-400";
      label = "Medium";
    } else {
      colorClass =
        "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800";
      barColorClass = "bg-red-500 dark:bg-red-400";
      label = "Low";
    }

    return (
      <div
        className={`relative flex flex-col rounded-md border px-2.5 py-1 text-xs font-medium ${colorClass}`}
        title={`${roundedConfidence}% confidence match`}
        aria-label={`${label} confidence match: ${roundedConfidence}%`}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="mr-1 font-semibold">{label}</span>
          <span className="font-mono">{roundedConfidence}%</span>
        </div>

        {/* Progress bar background */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          {/* Progress bar indicator */}
          <div
            className={`h-full rounded-full ${barColorClass}`}
            style={{ width: `${roundedConfidence}%` }}
          ></div>
        </div>
      </div>
    );
  };

  // Helper function to format status text nicely - moved outside for reuse
  const formatStatusText = (status: string | undefined): string => {
    if (!status) return "Unknown";

    // Handle cases with underscores or spaces
    return status
      .split(/[_\s]+/) // Split by underscores or spaces
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Render match status indicator
  const renderStatusIndicator = (match: MangaMatchResult) => {
    // Extract the data for the header badges
    const headerIconData = [
      {
        value: match.kenmeiManga.chapters_read || 0,
        icon: "chapters",
        text: "chapters read",
      },
      {
        value: match.kenmeiManga.score,
        icon: "star",
        text: "score",
        hideIfZero: true,
      },
    ].filter((data) => !data.hideIfZero || data.value > 0);

    // Determine status color based on Kenmei status
    let statusColorClass = "";
    switch (match.kenmeiManga.status?.toLowerCase()) {
      case "reading":
        statusColorClass = "text-green-600 dark:text-green-400";
        break;
      case "completed":
        statusColorClass = "text-blue-600 dark:text-blue-400";
        break;
      case "on_hold":
        statusColorClass = "text-amber-600 dark:text-amber-400";
        break;
      case "dropped":
        statusColorClass = "text-red-600 dark:text-red-400";
        break;
      case "plan_to_read":
        statusColorClass = "text-purple-600 dark:text-purple-400";
        break;
      default:
        statusColorClass = "text-gray-600 dark:text-gray-400";
        break;
    }

    // Create Kenmei URL for the status indicator
    const kenmeiUrl = createKenmeiUrl(match.kenmeiManga.title);

    // Return the status indicator with correct color
    return (
      <div className="flex flex-col items-end">
        <div className="text-muted-foreground line-clamp-1 text-xs">
          <span className={statusColorClass}>
            {formatStatusText(match.kenmeiManga.status)}
          </span>
          {headerIconData.map((data, i) => (
            <React.Fragment key={`badge-${i}`}>
              <span className="mx-1">•</span>
              <span className={`inline-flex items-center`}>
                <span>{data.value}</span>
                <span className="ml-1">{data.text}</span>
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Kenmei link below status */}
        {kenmeiUrl && (
          <div className="mt-1 flex items-center">
            <a
              href={kenmeiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
              aria-label="View on Kenmei (opens in external browser)"
              onClick={handleOpenExternal(kenmeiUrl)}
            >
              <ExternalLink className="mr-1 h-3 w-3" aria-hidden="true" />
              View on Kenmei
              <div className="group relative ml-1 inline-block">
                <Info
                  className="h-3 w-3 text-indigo-500 dark:text-indigo-400"
                  aria-hidden="true"
                />
                <div className="absolute right-0 bottom-full mb-2 hidden w-48 rounded-md border-2 border-blue-400 bg-blue-100 px-3 py-2 text-xs font-medium text-blue-900 shadow-lg group-hover:block dark:border-blue-600 dark:bg-blue-900 dark:text-blue-100">
                  This link is dynamically generated and may not work correctly.
                </div>
              </div>
            </a>
          </div>
        )}
      </div>
    );
  };

  // Handle keyboard navigation for item selection
  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      callback();
    }
  };

  // Function to skip all pending matches with no results
  const handleSkipEmptyMatches = () => {
    // Set processing state to disable the button
    setIsSkippingEmptyMatches(true);

    // Find all pending manga with no matches
    const pendingWithNoMatches = matches.filter(
      (match) =>
        match.status === "pending" &&
        (!match.anilistMatches || match.anilistMatches.length === 0),
    );

    console.log(
      `Skipping ${pendingWithNoMatches.length} pending manga with no matches`,
    );

    // Skip all matches at once if possible
    if (pendingWithNoMatches.length > 0 && onRejectMatch) {
      // Create a single batched update by using a custom handler
      const batchedReject = matches.map((match) => {
        // Only modify the matches that need to be skipped
        if (
          match.status === "pending" &&
          (!match.anilistMatches || match.anilistMatches.length === 0)
        ) {
          // Return a modified version with skipped status
          return {
            ...match,
            status: "skipped" as const,
            selectedMatch: undefined,
            matchDate: new Date(),
          };
        }
        // Return the original for all other matches
        return match;
      });

      // Pass the full array with modifications to the parent
      if (onRejectMatch) {
        // Special flag to indicate this is a batch operation
        const batchOperation = {
          isBatchOperation: true,
          matches: batchedReject,
        };

        // @ts-expect-error - We're adding a special property for the batch handler to recognize
        onRejectMatch(batchOperation);

        // Short delay to ensure state updates have time to process
        setTimeout(() => {
          setIsSkippingEmptyMatches(false);
        }, 500);
      }
    } else {
      // Reset processing state if no matching items found
      setIsSkippingEmptyMatches(false);
    }
  };

  // Get count of pending matches with no results
  const emptyMatchesCount = matches.filter(
    (match) =>
      match.status === "pending" &&
      (!match.anilistMatches || match.anilistMatches.length === 0),
  ).length;

  // Function to accept all pending matches with main matches
  const handleAcceptAllPendingMatches = () => {
    // Set processing state to disable the button
    setIsAcceptingAllMatches(true);

    // Find all pending manga with valid main matches
    const pendingWithMatches = matches.filter(
      (match) =>
        match.status === "pending" &&
        match.anilistMatches &&
        match.anilistMatches.length > 0,
    );

    console.log(
      `Accepting ${pendingWithMatches.length} pending manga with matches`,
    );

    // Accept all matches at once if possible
    if (pendingWithMatches.length > 0 && onAcceptMatch) {
      // Create a single batched update
      const batchedAccept = matches.map((match) => {
        // Only modify the matches that need to be accepted
        if (
          match.status === "pending" &&
          match.anilistMatches &&
          match.anilistMatches.length > 0
        ) {
          // Return a modified version with matched status
          return {
            ...match,
            status: "matched" as const,
            selectedMatch: match.anilistMatches[0].manga,
            matchDate: new Date(),
          };
        }
        // Return the original for all other matches
        return match;
      });

      // Pass the full array with modifications to the parent
      if (onAcceptMatch) {
        // Special flag to indicate this is a batch operation
        const batchOperation = {
          isBatchOperation: true,
          matches: batchedAccept,
        };

        // @ts-expect-error - We're adding a special property for the batch handler to recognize
        onAcceptMatch(batchOperation);

        // Short delay to ensure state updates have time to process
        setTimeout(() => {
          setIsAcceptingAllMatches(false);
        }, 500);
      }
    } else {
      // Reset processing state if no matching items found
      setIsAcceptingAllMatches(false);
    }
  };

  // Get count of pending matches with valid matches
  const pendingMatchesCount = matches.filter(
    (match) =>
      match.status === "pending" &&
      match.anilistMatches &&
      match.anilistMatches.length > 0,
  ).length;

  return (
    <div
      className="flex flex-col space-y-4"
      ref={containerRef}
      tabIndex={-1} // Make div focusable but not in tab order
    >
      {/* Stats and filter controls */}
      <div className="mb-6 flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex flex-wrap gap-3">
          <div className="rounded-md bg-gray-100 px-3 py-2 dark:bg-gray-800">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total:{" "}
            </span>
            <span className="font-bold text-gray-900 dark:text-white">
              {matchStats.total}
            </span>
          </div>
          <div className="rounded-md bg-gray-200 px-3 py-2 dark:bg-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pending:{" "}
            </span>
            <span className="font-bold text-gray-900 dark:text-white">
              {matchStats.pending}
            </span>
          </div>
          <div className="rounded-md bg-green-100 px-3 py-2 dark:bg-green-900/30">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Matched:{" "}
            </span>
            <span className="font-bold text-green-900 dark:text-green-100">
              {matchStats.matched}
            </span>
          </div>
          <div className="rounded-md bg-blue-100 px-3 py-2 dark:bg-blue-900/30">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Manual:{" "}
            </span>
            <span className="font-bold text-blue-900 dark:text-blue-100">
              {matchStats.manual}
            </span>
          </div>
          <div className="rounded-md bg-red-100 px-3 py-2 dark:bg-red-900/30">
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              Skipped:{" "}
            </span>
            <span className="font-bold text-red-900 dark:text-red-100">
              {matchStats.skipped}
            </span>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mt-2 sm:mt-0">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            className="block w-full rounded-md border border-gray-300 bg-white py-2 pr-3 pl-10 text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            placeholder="Search titles... (Ctrl+F)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search manga titles"
          />
        </div>
      </div>

      {/* Skip Empty Matches and Accept All Matches buttons */}
      <div className="mb-4 flex flex-wrap gap-4">
        {/* Skip Empty Matches button */}
        {emptyMatchesCount > 0 && (
          <div className="flex items-center">
            <button
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={handleSkipEmptyMatches}
              disabled={isSkippingEmptyMatches}
            >
              {isSkippingEmptyMatches ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
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
                  Processing...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" aria-hidden="true" />
                  Skip Empty Matches ({emptyMatchesCount})
                </>
              )}
            </button>
            <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
              This will mark all pending manga with no matches as skipped.
            </span>
          </div>
        )}

        {/* Accept All Matches button */}
        {pendingMatchesCount > 0 && (
          <div className="flex items-center">
            <button
              className="inline-flex items-center rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 shadow-sm hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-600 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-800/30"
              onClick={handleAcceptAllPendingMatches}
              disabled={isAcceptingAllMatches}
            >
              {isAcceptingAllMatches ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
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
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                  Accept All Matches ({pendingMatchesCount})
                </>
              )}
            </button>
            <div className="ml-2 flex items-center">
              <div className="group relative flex">
                <Info
                  className="h-4 w-4 text-gray-500 dark:text-gray-400"
                  aria-hidden="true"
                />
                <div className="absolute bottom-full left-1/2 mb-2 hidden w-64 -translate-x-1/2 transform rounded-md border-2 border-blue-400 bg-blue-100 px-3 py-2 text-xs font-medium text-blue-900 shadow-lg group-hover:block dark:border-blue-600 dark:bg-blue-900 dark:text-blue-100">
                  It&apos;s still a good idea to skim over the matches to ensure
                  everything is correct before proceeding.
                </div>
              </div>
              <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                Accept all pending manga with available matches.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter selection */}
      <div className="mb-4 flex flex-col items-start justify-between rounded-md border border-gray-200 bg-white p-3 md:flex-row md:items-center dark:border-gray-700 dark:bg-gray-800">
        <span className="mb-2 ml-2 flex items-center text-sm font-medium text-gray-700 md:mb-0 dark:text-gray-300">
          <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
          Show status:
        </span>
        <div className="flex flex-wrap gap-2">
          <label className="flex cursor-pointer items-center space-x-2 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={statusFilters.matched}
              onChange={() =>
                setStatusFilters({
                  ...statusFilters,
                  matched: !statusFilters.matched,
                })
              }
              aria-label="Show matched"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Matched
            </span>
            <span className="ml-auto rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
              {matchStats.matched}
            </span>
          </label>

          <label className="flex cursor-pointer items-center space-x-2 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={statusFilters.pending}
              onChange={() =>
                setStatusFilters({
                  ...statusFilters,
                  pending: !statusFilters.pending,
                })
              }
              aria-label="Show pending"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pending
            </span>
            <span className="ml-auto rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              {matchStats.pending}
            </span>
          </label>

          <label className="flex cursor-pointer items-center space-x-2 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={statusFilters.manual}
              onChange={() =>
                setStatusFilters({
                  ...statusFilters,
                  manual: !statusFilters.manual,
                })
              }
              aria-label="Show manual matches"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Manual
            </span>
            <span className="ml-auto rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {matchStats.manual}
            </span>
          </label>

          <label className="flex cursor-pointer items-center space-x-2 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={statusFilters.skipped}
              onChange={() =>
                setStatusFilters({
                  ...statusFilters,
                  skipped: !statusFilters.skipped,
                })
              }
              aria-label="Show skipped"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Skipped
            </span>
            <span className="ml-auto rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
              {matchStats.skipped}
            </span>
          </label>

          <div className="flex items-center space-x-2 p-2">
            <button
              onClick={() =>
                setStatusFilters({
                  matched: true,
                  pending: true,
                  manual: true,
                  skipped: true,
                })
              }
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              aria-label="Select all status filters"
            >
              Select All
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={() =>
                setStatusFilters({
                  matched: false,
                  pending: false,
                  manual: false,
                  skipped: false,
                })
              }
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              aria-label="Clear all status filters"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Sort options */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Sort by:
        </span>

        <button
          onClick={() => handleSortChange("title")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            sortOption.field === "title"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
          aria-label={`Sort by title ${sortOption.field === "title" && sortOption.direction === "asc" ? "descending" : "ascending"}`}
        >
          Title{renderSortIndicator("title")}
        </button>

        <button
          onClick={() => handleSortChange("status")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            sortOption.field === "status"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
          aria-label={`Sort by status ${sortOption.field === "status" && sortOption.direction === "asc" ? "descending" : "ascending"}`}
        >
          Status{renderSortIndicator("status")}
        </button>

        <button
          onClick={() => handleSortChange("confidence")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            sortOption.field === "confidence"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
          aria-label={`Sort by confidence ${sortOption.field === "confidence" && sortOption.direction === "asc" ? "descending" : "ascending"}`}
        >
          Confidence{renderSortIndicator("confidence")}
        </button>

        <button
          onClick={() => handleSortChange("chapters_read")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            sortOption.field === "chapters_read"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
          aria-label={`Sort by chapters read ${sortOption.field === "chapters_read" && sortOption.direction === "asc" ? "descending" : "ascending"}`}
        >
          Chapters Read{renderSortIndicator("chapters_read")}
        </button>
      </div>

      {/* Confidence accuracy notice */}
      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle
              className="h-5 w-5 text-amber-400 dark:text-amber-300"
              aria-hidden="true"
            />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">
              About Confidence Percentages
            </h3>
            <div className="mt-2 text-sm text-amber-700 dark:text-amber-200">
              <p>
                Please note that confidence match percentages are approximate
                and may not always be accurate. It&apos;s recommended to review
                matches manually, especially for manga with similar titles or
                multiple adaptations.
              </p>
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-200">
                If you encounter cases where confidence scores are severely
                wrong or misleading, please{" "}
                <a
                  href="https://github.com/RLAlpha49/KenmeiToAnilist/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-amber-800 underline hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
                  onClick={handleOpenExternal(
                    "https://github.com/RLAlpha49/KenmeiToAnilist/issues",
                  )}
                >
                  open an issue on GitHub
                </a>{" "}
                with details about the title. This helps improve the confidence
                system for future matching.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Match list */}
      <div className="space-y-6" aria-live="polite">
        {currentMatches.length > 0 ? (
          currentMatches.map((match, index) => {
            // Generate a unique key using index as fallback when ID is undefined
            const uniqueKey = match.kenmeiManga.id
              ? `${match.kenmeiManga.id}-${match.status}`
              : `index-${index}-${match.status}-${match.kenmeiManga.title?.replace(/\s+/g, "_") || "unknown"}`;

            return (
              <div
                key={uniqueKey}
                className={`rounded-lg border ${
                  match.status === "matched"
                    ? "border-green-400 dark:border-green-600"
                    : match.status === "manual"
                      ? "border-blue-400 dark:border-blue-600"
                      : match.status === "skipped"
                        ? "border-red-400 dark:border-red-600"
                        : "border-gray-200 dark:border-gray-700"
                } bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800`}
                tabIndex={0}
                role="region"
                aria-label={`Match result for ${match.kenmeiManga.title}`}
              >
                <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {match.kenmeiManga.title}
                    </h3>
                    <div className="ml-2 flex min-w-[250px] items-center justify-end">
                      {renderStatusIndicator(match)}
                    </div>
                  </div>
                </div>

                {/* Selected or best match */}
                {(match.selectedMatch ||
                  (match.anilistMatches && match.anilistMatches.length > 0) ||
                  match.status === "skipped") && (
                  <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {/* Cover image with proper fallbacks */}
                          {match.selectedMatch?.coverImage?.large ||
                          match.selectedMatch?.coverImage?.medium ||
                          match.anilistMatches?.[0]?.manga?.coverImage?.large ||
                          match.anilistMatches?.[0]?.manga?.coverImage
                            ?.medium ? (
                            <img
                              src={
                                match.selectedMatch?.coverImage?.large ||
                                match.selectedMatch?.coverImage?.medium ||
                                match.anilistMatches[0]?.manga?.coverImage
                                  ?.large ||
                                match.anilistMatches[0]?.manga?.coverImage
                                  ?.medium
                              }
                              alt={
                                match.selectedMatch?.title?.english ||
                                match.selectedMatch?.title?.romaji ||
                                match.anilistMatches?.[0]?.manga?.title
                                  ?.english ||
                                match.anilistMatches?.[0]?.manga?.title?.romaji
                              }
                              className="h-40 w-28 rounded-sm object-cover shadow-sm"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-40 w-28 items-center justify-center rounded-sm bg-gray-200 shadow-sm dark:bg-gray-700">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                No Image
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          {match.status === "skipped" &&
                          !match.selectedMatch &&
                          !match.anilistMatches?.length ? (
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                              {match.kenmeiManga.title}
                              <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                Skipped
                              </span>
                            </h4>
                          ) : (
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                              {match.selectedMatch?.title?.english ||
                                match.selectedMatch?.title?.romaji ||
                                match.anilistMatches?.[0]?.manga?.title
                                  ?.english ||
                                match.anilistMatches?.[0]?.manga?.title
                                  ?.romaji ||
                                "Unknown Title"}
                            </h4>
                          )}
                          {/* Show all available titles */}
                          <div className="mt-1 flex flex-col text-sm text-gray-500 dark:text-gray-400">
                            {/* English title - if different from main display */}
                            {match.selectedMatch?.title?.english &&
                              match.selectedMatch?.title?.english !==
                                (match.selectedMatch?.title?.romaji ||
                                  match.anilistMatches?.[0]?.manga?.title
                                    ?.english ||
                                  match.anilistMatches?.[0]?.manga?.title
                                    ?.romaji) && (
                                <span>
                                  English: {match.selectedMatch.title.english}
                                </span>
                              )}

                            {/* Romaji title - if different from main display */}
                            {match.selectedMatch?.title?.romaji &&
                              match.selectedMatch?.title?.romaji !==
                                match.selectedMatch?.title?.english && (
                                <span>
                                  Romaji: {match.selectedMatch.title.romaji}
                                </span>
                              )}

                            {/* Native title */}
                            {match.selectedMatch?.title?.native && (
                              <span>
                                Native: {match.selectedMatch.title.native}
                              </span>
                            )}

                            {/* Synonyms */}
                            {match.selectedMatch?.synonyms &&
                              match.selectedMatch.synonyms.length > 0 && (
                                <span>
                                  Synonyms:{" "}
                                  {match.selectedMatch.synonyms.join(", ")}
                                </span>
                              )}

                            {/* Fallbacks to anilistMatches if selectedMatch is not available */}
                            {!match.selectedMatch &&
                              match.anilistMatches?.[0]?.manga?.title
                                ?.english && (
                                <span>
                                  English:{" "}
                                  {match.anilistMatches[0].manga.title.english}
                                </span>
                              )}

                            {!match.selectedMatch &&
                              match.anilistMatches?.[0]?.manga?.title
                                ?.romaji && (
                                <span>
                                  Romaji:{" "}
                                  {match.anilistMatches[0].manga.title.romaji}
                                </span>
                              )}

                            {!match.selectedMatch &&
                              match.anilistMatches?.[0]?.manga?.title
                                ?.native && (
                                <span>
                                  Native:{" "}
                                  {match.anilistMatches[0].manga.title.native}
                                </span>
                              )}
                          </div>

                          {/* Manga format and status info */}
                          <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            {match.status !== "skipped" ||
                            match.selectedMatch ||
                            match.anilistMatches?.length ? (
                              <>
                                <span>
                                  {match.selectedMatch?.format ||
                                    match.anilistMatches?.[0]?.manga?.format ||
                                    "Unknown Format"}
                                </span>
                                <span>•</span>
                                <span>
                                  {match.selectedMatch?.status ||
                                    match.anilistMatches?.[0]?.manga?.status ||
                                    "Unknown Status"}
                                </span>
                                {((match.selectedMatch?.chapters &&
                                  match.selectedMatch.chapters > 0) ||
                                  (match.anilistMatches?.[0]?.manga?.chapters &&
                                    match.anilistMatches[0].manga.chapters >
                                      0)) && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {match.selectedMatch?.chapters ||
                                        match.anilistMatches?.[0]?.manga
                                          ?.chapters ||
                                        0}{" "}
                                      chapters
                                    </span>
                                  </>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-500 italic">
                                No match information available
                              </span>
                            )}
                          </div>

                          {/* Kenmei status info */}
                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {formatStatusText(match.kenmeiManga.status)} •{" "}
                            {match.kenmeiManga.chapters_read} chapters read
                            {match.kenmeiManga.score > 0 &&
                              ` • Score: ${match.kenmeiManga.score}/10`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {match.anilistMatches &&
                          match.anilistMatches.length > 0 &&
                          match.anilistMatches[0]?.confidence !== undefined &&
                          renderConfidenceBadge(
                            match.anilistMatches[0].confidence,
                          )}
                        <div className="flex space-x-2">
                          {(match.selectedMatch ||
                            (match.anilistMatches &&
                              match.anilistMatches.length > 0)) && (
                            <a
                              href={`https://anilist.co/manga/${match.selectedMatch?.id || match.anilistMatches?.[0]?.manga?.id || "unknown"}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                              aria-label="View on AniList (opens in new tab)"
                              onClick={handleOpenExternal(
                                `https://anilist.co/manga/${match.selectedMatch?.id || match.anilistMatches?.[0]?.manga?.id || "unknown"}`,
                              )}
                            >
                              <ExternalLink
                                className="mr-1 h-3 w-3"
                                aria-hidden="true"
                              />
                              AniList
                            </a>
                          )}
                          {(() => {
                            // Get the appropriate title for Kenmei link - for skipped items, always use Kenmei's title
                            const title =
                              match.kenmeiManga.title ||
                              match.selectedMatch?.title?.english ||
                              match.selectedMatch?.title?.romaji ||
                              match.anilistMatches?.[0]?.manga?.title
                                ?.english ||
                              match.anilistMatches?.[0]?.manga?.title?.romaji;

                            const kenmeiUrl = createKenmeiUrl(title);

                            return kenmeiUrl ? (
                              <a
                                href={kenmeiUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center rounded-md bg-indigo-100 px-2.5 py-1 text-sm text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-800/30"
                                aria-label="View on Kenmei (opens in new tab)"
                                onClick={handleOpenExternal(kenmeiUrl)}
                              >
                                <ExternalLink
                                  className="mr-1 h-3 w-3"
                                  aria-hidden="true"
                                />
                                Kenmei
                                <div className="group relative ml-1 inline-block">
                                  <Info
                                    className="h-3 w-3 text-indigo-500 dark:text-indigo-400"
                                    aria-hidden="true"
                                  />
                                  <div className="absolute bottom-full left-1/2 mb-2 hidden w-48 -translate-x-1/2 transform rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1.5 text-xs text-indigo-900 shadow-md group-hover:block dark:border-indigo-700 dark:bg-indigo-900 dark:text-indigo-100">
                                    This link is dynamically generated and may
                                    not work correctly.
                                  </div>
                                </div>
                              </a>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex space-x-2 p-4">
                  {match.status === "pending" && (
                    <>
                      {match.anilistMatches &&
                        match.anilistMatches.length > 0 && (
                          <button
                            className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
                            onClick={() => {
                              console.log(
                                `Clicked Accept Match for manga ID: ${match.kenmeiManga.id}, title: ${match.kenmeiManga.title}`,
                              );
                              if (onAcceptMatch) onAcceptMatch(match);
                            }}
                            onKeyDown={(e) =>
                              handleKeyDown(
                                e,
                                () => onAcceptMatch && onAcceptMatch(match),
                              )
                            }
                            aria-label={`Accept match for ${match.kenmeiManga.title}`}
                          >
                            <Check
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                            Accept Match
                          </button>
                        )}
                      <button
                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                        onClick={() => {
                          console.log(
                            `Clicked Search Manually for manga ID: ${match.kenmeiManga.id}, title: ${match.kenmeiManga.title}`,
                          );
                          if (onManualSearch) onManualSearch(match.kenmeiManga);
                        }}
                        onKeyDown={(e) =>
                          handleKeyDown(
                            e,
                            () =>
                              onManualSearch &&
                              onManualSearch(match.kenmeiManga),
                          )
                        }
                        aria-label={`Search manually for ${match.kenmeiManga.title}`}
                      >
                        <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                        Search Manually
                      </button>
                      <button
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => {
                          if (onRejectMatch) onRejectMatch(match);
                        }}
                        onKeyDown={(e) =>
                          handleKeyDown(
                            e,
                            () => onRejectMatch && onRejectMatch(match),
                          )
                        }
                        aria-label={`Skip matching for ${match.kenmeiManga.title}`}
                      >
                        <X className="mr-2 h-4 w-4" aria-hidden="true" />
                        Skip
                      </button>
                    </>
                  )}
                  {match.status === "matched" && (
                    <>
                      <button
                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                        onClick={() => {
                          if (onManualSearch) onManualSearch(match.kenmeiManga);
                        }}
                        onKeyDown={(e) =>
                          handleKeyDown(
                            e,
                            () =>
                              onManualSearch &&
                              onManualSearch(match.kenmeiManga),
                          )
                        }
                        aria-label={`Change match for ${match.kenmeiManga.title}`}
                      >
                        <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                        Change Match
                      </button>
                      <button
                        className="inline-flex items-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        onClick={() => {
                          if (onResetToPending) onResetToPending(match);
                        }}
                        onKeyDown={(e) =>
                          handleKeyDown(
                            e,
                            () => onResetToPending && onResetToPending(match),
                          )
                        }
                        aria-label={`Reset ${match.kenmeiManga.title} to pending status`}
                      >
                        <ArrowLeft
                          className="mr-2 h-4 w-4"
                          aria-hidden="true"
                        />
                        Reset to Pending
                      </button>
                    </>
                  )}
                  {match.status === "manual" && (
                    <>
                      <button
                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                        onClick={() => {
                          if (onManualSearch) onManualSearch(match.kenmeiManga);
                        }}
                        onKeyDown={(e) =>
                          handleKeyDown(
                            e,
                            () =>
                              onManualSearch &&
                              onManualSearch(match.kenmeiManga),
                          )
                        }
                        aria-label={`Change match for ${match.kenmeiManga.title}`}
                      >
                        <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                        Change Match
                      </button>
                      <button
                        className="inline-flex items-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        onClick={() => {
                          if (onResetToPending) onResetToPending(match);
                        }}
                        onKeyDown={(e) =>
                          handleKeyDown(
                            e,
                            () => onResetToPending && onResetToPending(match),
                          )
                        }
                        aria-label={`Reset ${match.kenmeiManga.title} to pending status`}
                      >
                        <ArrowLeft
                          className="mr-2 h-4 w-4"
                          aria-hidden="true"
                        />
                        Reset to Pending
                      </button>
                    </>
                  )}
                  {match.status === "skipped" && (
                    <>
                      <button
                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                        onClick={() => {
                          if (onManualSearch) onManualSearch(match.kenmeiManga);
                        }}
                        onKeyDown={(e) =>
                          handleKeyDown(
                            e,
                            () =>
                              onManualSearch &&
                              onManualSearch(match.kenmeiManga),
                          )
                        }
                        aria-label={`Find match for ${match.kenmeiManga.title}`}
                      >
                        <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                        Search Manually
                      </button>
                      <button
                        className="inline-flex items-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        onClick={() => {
                          if (onResetToPending) onResetToPending(match);
                        }}
                        onKeyDown={(e) =>
                          handleKeyDown(
                            e,
                            () => onResetToPending && onResetToPending(match),
                          )
                        }
                        aria-label={`Reset ${match.kenmeiManga.title} to pending status`}
                      >
                        <ArrowLeft
                          className="mr-2 h-4 w-4"
                          aria-hidden="true"
                        />
                        Reset to Pending
                      </button>
                    </>
                  )}
                </div>

                {/* Alternative matches - only show for non-matched entries */}
                {match.anilistMatches &&
                  match.anilistMatches.length > 1 &&
                  match.status !== "matched" &&
                  match.status !== "manual" && (
                    <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                      <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                        Alternative Matches
                      </h4>
                      <div className="space-y-2">
                        {match.anilistMatches
                          .slice(1, 5)
                          .map((altMatch, index) => (
                            <div
                              key={
                                altMatch.manga?.id ||
                                altMatch.id ||
                                `alt-match-${index}`
                              }
                              className="flex items-center justify-between rounded-md border border-gray-200 p-2 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                              tabIndex={0}
                              role="button"
                              aria-label={`Select ${
                                altMatch.manga?.title?.english ||
                                altMatch.manga?.title?.romaji ||
                                "Alternative manga"
                              } as match`}
                              onKeyDown={(e) =>
                                handleKeyDown(e, () => {
                                  if (onSelectAlternative)
                                    onSelectAlternative(
                                      match,
                                      index + 1,
                                      false,
                                      true,
                                    );
                                })
                              }
                            >
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  {/* Cover image with better fallbacks */}
                                  {altMatch.manga?.coverImage?.large ||
                                  altMatch.manga?.coverImage?.medium ? (
                                    <img
                                      src={
                                        altMatch.manga.coverImage.large ||
                                        altMatch.manga.coverImage.medium
                                      }
                                      alt={
                                        altMatch.manga?.title?.english ||
                                        altMatch.manga?.title?.romaji ||
                                        "Alternative manga"
                                      }
                                      className="h-32 w-20 rounded-sm object-cover shadow-sm"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="flex h-32 w-20 items-center justify-center rounded-sm bg-gray-200 shadow-sm dark:bg-gray-700">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        No Image
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-base font-medium text-gray-900 dark:text-white">
                                    {altMatch.manga?.title?.english ||
                                      altMatch.manga?.title?.romaji ||
                                      "Unknown Manga"}
                                  </p>
                                  {/* Show all available titles */}
                                  <div className="flex flex-col text-sm text-gray-500 dark:text-gray-400">
                                    {/* English title - if different from main display */}
                                    {altMatch.manga?.title?.english &&
                                      altMatch.manga.title.english !==
                                        altMatch.manga?.title?.romaji && (
                                        <span>
                                          English:{" "}
                                          {altMatch.manga.title.english}
                                        </span>
                                      )}

                                    {/* Romaji title - if different from main display */}
                                    {altMatch.manga?.title?.romaji &&
                                      altMatch.manga.title.romaji !==
                                        altMatch.manga?.title?.english && (
                                        <span>
                                          Romaji: {altMatch.manga.title.romaji}
                                        </span>
                                      )}

                                    {/* Native title */}
                                    {altMatch.manga?.title?.native && (
                                      <span>
                                        Native: {altMatch.manga.title.native}
                                      </span>
                                    )}

                                    {/* Synonyms */}
                                    {altMatch.manga?.synonyms &&
                                      altMatch.manga.synonyms.length > 0 && (
                                        <span>
                                          Synonyms:{" "}
                                          {altMatch.manga.synonyms.join(", ")}
                                        </span>
                                      )}
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {/* Format */}
                                    {altMatch.manga?.format || "Unknown"}
                                    {/* Status */}•{" "}
                                    {altMatch.manga?.status || "Unknown"}
                                    {/* Chapters */}
                                    {altMatch.manga?.chapters &&
                                      Number(altMatch.manga.chapters) > 0 &&
                                      ` • ${altMatch.manga.chapters} chapters`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {altMatch.confidence !== undefined &&
                                  renderConfidenceBadge(altMatch.confidence)}
                                <button
                                  className="inline-flex min-w-[140px] items-center justify-center rounded-md bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-1 focus:outline-none"
                                  onClick={() => {
                                    // Directly accept the alternative as the match without swapping
                                    if (onSelectAlternative) {
                                      onSelectAlternative(
                                        match,
                                        index + 1,
                                        false,
                                        true,
                                      );
                                    }
                                  }}
                                  aria-label={`Accept ${
                                    altMatch.manga?.title?.english ||
                                    altMatch.manga?.title?.romaji ||
                                    "Unknown manga"
                                  } as match (${altMatch.confidence !== undefined ? Math.round(altMatch.confidence) + "%" : "Unknown confidence"})`}
                                >
                                  <Check
                                    className="mr-1 h-3 w-3"
                                    aria-hidden="true"
                                  />
                                  Accept Match{" "}
                                  {altMatch.confidence !== undefined
                                    ? `(${Math.round(altMatch.confidence)}%)`
                                    : ""}
                                </button>
                                <div className="flex space-x-2">
                                  <a
                                    href={`https://anilist.co/manga/${altMatch.manga?.id || "unknown"}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                    aria-label="View on AniList (opens in new tab)"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenExternal(
                                        `https://anilist.co/manga/${altMatch.manga?.id || "unknown"}`,
                                      )(e);
                                    }}
                                  >
                                    <ExternalLink
                                      className="mr-1 h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    AniList
                                  </a>
                                  {(() => {
                                    // Get the title for Kenmei link
                                    const title =
                                      altMatch.manga?.title?.english ||
                                      altMatch.manga?.title?.romaji;

                                    const kenmeiUrl = createKenmeiUrl(title);

                                    return kenmeiUrl ? (
                                      <a
                                        href={kenmeiUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-800/30"
                                        aria-label="View on Kenmei (opens in new tab)"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenExternal(kenmeiUrl)(e);
                                        }}
                                      >
                                        <ExternalLink
                                          className="mr-1 h-3 w-3"
                                          aria-hidden="true"
                                        />
                                        Kenmei
                                        <div className="group relative ml-1 inline-block">
                                          <Info
                                            className="h-3 w-3 text-indigo-500 dark:text-indigo-400"
                                            aria-hidden="true"
                                          />
                                          <div className="absolute bottom-full left-1/2 mb-2 hidden w-48 -translate-x-1/2 transform rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1.5 text-xs text-indigo-900 shadow-md group-hover:block dark:border-indigo-700 dark:bg-indigo-900 dark:text-indigo-100">
                                            This link is dynamically generated
                                            and may not work correctly.
                                          </div>
                                        </div>
                                      </a>
                                    ) : null;
                                  })()}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm
                ? `No manga matches found for "${searchTerm}" with the current filters.`
                : "No manga matches found with the current filters."}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="mt-4 flex flex-col items-center justify-between space-y-3 sm:flex-row sm:space-y-0"
          aria-label="Pagination navigation"
        >
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing{" "}
            <span className="font-medium">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, sortedMatches.length)}
            </span>{" "}
            of <span className="font-medium">{sortedMatches.length}</span>{" "}
            results
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              (Use ← → arrow keys to navigate pages)
            </span>
          </div>
          <div className="inline-flex items-center space-x-1">
            <button
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
            </button>

            <span className="mx-2 inline-flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className="font-medium">{currentPage}</span>
              <span className="mx-1">/</span>
              <span className="font-medium">{totalPages}</span>
            </span>

            <button
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
