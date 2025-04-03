import React, { useState, useRef, useEffect } from "react";
import { MangaMatchResult } from "../../api/anilist/types";
import { KenmeiManga } from "../../api/kenmei/types";
import {
  Search,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

interface MangaMatchingPanelProps {
  matches: MangaMatchResult[];
  onManualSearch?: (kenmeiManga: KenmeiManga) => void;
  onAcceptMatch?: (match: MangaMatchResult) => void;
  onRejectMatch?: (match: MangaMatchResult) => void;
  onSelectAlternative?: (
    match: MangaMatchResult,
    alternativeIndex: number,
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
    conflicts: true,
    matched: true,
    pending: true,
    manual: true,
    skipped: true,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Items per page
  const itemsPerPage = 10;

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
      (match.status === "conflict" && statusFilters.conflicts) ||
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

  // Pagination logic
  const totalPages = Math.max(
    1,
    Math.ceil(filteredMatches.length / itemsPerPage),
  );
  const currentMatches = filteredMatches.slice(
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
    conflicts: matches.filter((m) => m.status === "conflict").length,
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

  // Render confidence badge
  const renderConfidenceBadge = (confidence: number) => {
    let colorClass = "";
    let label = "";

    if (confidence >= 90) {
      colorClass =
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      label = "High";
    } else if (confidence >= 75) {
      colorClass =
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      label = "Good";
    } else if (confidence >= 50) {
      colorClass =
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      label = "Medium";
    } else {
      colorClass = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      label = "Low";
    }

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${colorClass}`}
        title={`${Math.round(confidence)}% confidence match`}
        aria-label={`${label} confidence match: ${Math.round(confidence)}%`}
      >
        {label}: {Math.round(confidence)}%
      </span>
    );
  };

  // Render match status indicator
  const renderStatusIndicator = (match: MangaMatchResult) => {
    switch (match.status) {
      case "matched":
        return (
          <div
            className="flex items-center text-sm text-green-600 dark:text-green-400"
            aria-label="Status: Matched"
          >
            <Check className="mr-1 h-4 w-4" aria-hidden="true" />
            <span>Matched</span>
          </div>
        );
      case "conflict":
        return (
          <div
            className="flex items-center text-sm text-yellow-600 dark:text-yellow-400"
            aria-label="Status: Review Needed"
          >
            <AlertTriangle className="mr-1 h-4 w-4" aria-hidden="true" />
            <span>Review Needed</span>
          </div>
        );
      case "manual":
        return (
          <div
            className="flex items-center text-sm text-blue-600 dark:text-blue-400"
            aria-label="Status: Manual Match"
          >
            <Search className="mr-1 h-4 w-4" aria-hidden="true" />
            <span>Manual Match</span>
          </div>
        );
      case "skipped":
        return (
          <div
            className="flex items-center text-sm text-red-600 dark:text-red-400"
            aria-label="Status: Skipped"
          >
            <X className="mr-1 h-4 w-4" aria-hidden="true" />
            <span>Skipped</span>
          </div>
        );
      default:
        return (
          <div
            className="flex items-center text-sm text-gray-600 dark:text-gray-400"
            aria-label="Status: Pending"
          >
            <span>Pending</span>
          </div>
        );
    }
  };

  // Handle keyboard navigation for item selection
  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      callback();
    }
  };

  return (
    <div className="flex flex-col space-y-4">
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
          <div className="rounded-md bg-yellow-100 px-3 py-2 dark:bg-yellow-900/30">
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
              Conflicts:{" "}
            </span>
            <span className="font-bold text-yellow-900 dark:text-yellow-100">
              {matchStats.conflicts}
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

      {/* Filter selection */}
      <div className="mb-4 flex flex-col items-start justify-between rounded-md border border-gray-200 bg-white p-3 md:flex-row md:items-center dark:border-gray-700 dark:bg-gray-800">
        <span className="mb-2 ml-2 flex items-center text-sm font-medium text-gray-700 md:mb-0 dark:text-gray-300">
          <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
          Show status:
        </span>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:w-auto md:grid-cols-3">
          <label className="flex cursor-pointer items-center space-x-2 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={statusFilters.conflicts}
              onChange={() =>
                setStatusFilters({
                  ...statusFilters,
                  conflicts: !statusFilters.conflicts,
                })
              }
              aria-label="Show conflicts"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Conflicts
            </span>
            <span className="ml-auto rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              {matchStats.conflicts}
            </span>
          </label>

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

          <div className="flex items-center space-x-2">
            <button
              onClick={() =>
                setStatusFilters({
                  conflicts: true,
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
                  conflicts: false,
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
                    : match.status === "conflict"
                      ? "border-yellow-400 dark:border-yellow-600"
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
                    <div className="flex items-center">
                      {renderStatusIndicator(match)}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {match.kenmeiManga.status} •{" "}
                    {match.kenmeiManga.chapters_read} chapters read
                    {match.kenmeiManga.score > 0 &&
                      ` • Score: ${match.kenmeiManga.score}/10`}
                  </div>
                </div>

                {/* Selected or best match */}
                {(match.selectedMatch ||
                  (match.anilistMatches &&
                    match.anilistMatches.length > 0)) && (
                  <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {/* Cover image with proper fallbacks */}
                          {match.selectedMatch?.coverImage?.medium ||
                          (match.anilistMatches &&
                            match.anilistMatches[0]?.manga?.coverImage
                              ?.medium) ? (
                            <img
                              src={
                                match.selectedMatch?.coverImage?.medium ||
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
                              className="h-32 w-24 rounded-sm object-cover"
                            />
                          ) : (
                            <div className="flex h-32 w-24 items-center justify-center rounded-sm bg-gray-200 dark:bg-gray-700">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                No Image
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                            {match.selectedMatch?.title?.english ||
                              match.selectedMatch?.title?.romaji ||
                              match.anilistMatches?.[0]?.manga?.title
                                ?.english ||
                              match.anilistMatches?.[0]?.manga?.title?.romaji ||
                              "Unknown Title"}
                          </h4>
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
                          <div className="mt-2 flex items-center space-x-2 text-base text-gray-600 dark:text-gray-400">
                            <span>
                              {match.selectedMatch?.format ||
                                match.anilistMatches[0]?.manga?.format}
                            </span>
                            <span>•</span>
                            <span>
                              {match.selectedMatch?.status ||
                                match.anilistMatches[0]?.manga?.status}
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
                                    match.anilistMatches[0]?.manga
                                      ?.chapters}{" "}
                                  chapters
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {match.anilistMatches &&
                          match.anilistMatches.length > 0 &&
                          match.anilistMatches[0]?.confidence &&
                          renderConfidenceBadge(
                            match.anilistMatches[0].confidence,
                          )}
                        <a
                          href={`https://anilist.co/manga/${match.selectedMatch?.id || match.anilistMatches?.[0]?.manga?.id || "unknown"}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                          aria-label="View on AniList (opens in new tab)"
                        >
                          <ExternalLink
                            className="mr-1 h-3 w-3"
                            aria-hidden="true"
                          />
                          AniList
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex space-x-2 p-4">
                  {(match.status === "conflict" ||
                    match.status === "pending") && (
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
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
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
                                altMatch.title?.english ||
                                altMatch.title?.romaji ||
                                (typeof altMatch.title === "string"
                                  ? altMatch.title
                                  : "Alternative manga")
                              } as alternative match`}
                              onKeyDown={(e) =>
                                handleKeyDown(e, () => {
                                  if (onSelectAlternative)
                                    onSelectAlternative(match, index + 1);
                                })
                              }
                            >
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  {/* Updated to check for coverImage in both possible locations */}
                                  {altMatch.manga?.coverImage?.medium ||
                                  altMatch.coverImage?.medium ? (
                                    <img
                                      src={
                                        altMatch.manga?.coverImage?.medium ||
                                        altMatch.coverImage?.medium
                                      }
                                      alt={
                                        altMatch.manga?.title?.english ||
                                        altMatch.manga?.title?.romaji ||
                                        altMatch.title?.english ||
                                        altMatch.title?.romaji ||
                                        "Alternative manga"
                                      }
                                      className="h-24 w-16 rounded-sm object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-24 w-16 items-center justify-center rounded-sm bg-gray-200 dark:bg-gray-700">
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
                                      altMatch.title?.english ||
                                      altMatch.title?.romaji ||
                                      (typeof altMatch.title === "string"
                                        ? altMatch.title
                                        : "Unknown Manga")}
                                  </p>
                                  {/* Show all available titles */}
                                  <div className="flex flex-col text-sm text-gray-500 dark:text-gray-400">
                                    {/* English title - if different from main display */}
                                    {altMatch.manga?.title?.english &&
                                      altMatch.manga.title.english !==
                                        (altMatch.manga?.title?.romaji ||
                                          altMatch.title?.english ||
                                          altMatch.title?.romaji) && (
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

                                    {/* Fallbacks for alternative structure */}
                                    {!altMatch.manga &&
                                      altMatch.title?.english && (
                                        <span>
                                          English: {altMatch.title.english}
                                        </span>
                                      )}

                                    {!altMatch.manga &&
                                      altMatch.title?.romaji && (
                                        <span>
                                          Romaji: {altMatch.title.romaji}
                                        </span>
                                      )}

                                    {!altMatch.manga &&
                                      altMatch.title?.native && (
                                        <span>
                                          Native: {altMatch.title.native}
                                        </span>
                                      )}
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {/* Format */}
                                    {altMatch.manga?.format ||
                                      altMatch.format ||
                                      "Unknown"}
                                    {/* Status */}•{" "}
                                    {altMatch.manga?.status ||
                                      altMatch.status ||
                                      "Unknown"}
                                    {/* Chapters - check both possible paths */}
                                    {((altMatch.manga?.chapters &&
                                      Number(altMatch.manga.chapters) > 0) ||
                                      (altMatch.chapters &&
                                        Number(altMatch.chapters) > 0)) &&
                                      ` • ${altMatch.manga?.chapters || altMatch.chapters} chapters`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {altMatch.confidence !== undefined &&
                                  renderConfidenceBadge(altMatch.confidence)}
                                <button
                                  className="inline-flex min-w-[100px] items-center justify-center rounded-md bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-1 focus:outline-none dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-800/50"
                                  onClick={() => {
                                    if (onSelectAlternative)
                                      onSelectAlternative(match, index + 1);
                                  }}
                                  aria-label={`Make ${
                                    altMatch.manga?.title?.english ||
                                    altMatch.manga?.title?.romaji ||
                                    altMatch.title?.english ||
                                    altMatch.title?.romaji ||
                                    (typeof altMatch.title === "string"
                                      ? altMatch.title
                                      : "Unknown manga")
                                  } the main match`}
                                >
                                  <ArrowRight
                                    className="mr-1 h-3 w-3 rotate-90"
                                    aria-hidden="true"
                                  />
                                  Set as Main
                                </button>
                                <a
                                  href={`https://anilist.co/manga/${altMatch.manga?.id || "unknown"}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                  aria-label="View on AniList (opens in new tab)"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink
                                    className="mr-1 h-3 w-3"
                                    aria-hidden="true"
                                  />
                                  AniList
                                </a>
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
              {Math.min(currentPage * itemsPerPage, filteredMatches.length)}
            </span>{" "}
            of <span className="font-medium">{filteredMatches.length}</span>{" "}
            results
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
