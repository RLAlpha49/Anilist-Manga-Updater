import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  X,
  Check,
  ArrowLeft,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { KenmeiManga } from "../../api/kenmei/types";
import { AniListManga } from "../../api/anilist/types";
import { searchMangaByTitle } from "../../api/matching/manga-search-service";

interface MangaSearchPanelProps {
  kenmeiManga?: KenmeiManga;
  onClose: () => void;
  onSelectMatch: (manga: AniListManga) => void;
  token?: string;
  bypassCache?: boolean;
}

export function MangaSearchPanel({
  kenmeiManga,
  onClose,
  onSelectMatch,
  token,
  bypassCache,
}: MangaSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AniListManga[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (kenmeiManga?.title) {
      setSearchQuery(kenmeiManga.title);
    }
  }, [kenmeiManga?.id, kenmeiManga?.title]);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    if (kenmeiManga?.title) {
      setTimeout(() => {
        handleSearch(kenmeiManga.title);
      }, 100);
    }
  }, [kenmeiManga?.id]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults]);

  useEffect(() => {
    if (selectedIndex >= 0 && resultsContainerRef.current) {
      const selectedElement = resultsContainerRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      ) as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [selectedIndex]);

  const handleSearch = async (query: string, pageNum: number = 1) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      console.log(
        `🔎 Starting search for: "${query}" with bypassCache=${!!bypassCache}, page=${pageNum}`,
      );

      const startTime = performance.now();

      // Ensure manual searches always show results by setting exactMatchingOnly to false
      const searchConfig = {
        bypassCache: !!bypassCache,
        maxSearchResults: 30,
        searchPerPage: 10,
        exactMatchingOnly: false, // Always false for manual searches
      };

      console.log(`🔎 Search config:`, searchConfig);

      const results = await searchMangaByTitle(query, token, searchConfig);
      const endTime = performance.now();

      console.log(
        `🔎 Search completed in ${(endTime - startTime).toFixed(2)}ms for "${query}"`,
      );
      console.log(
        `🔎 Search returned ${results.length} results for "${query}"`,
      );

      // Log the actual titles received
      if (results.length > 0) {
        console.log(
          `🔎 Titles received:`,
          results.map((m) => ({
            title: m.manga.title?.romaji || m.manga.title?.english || "unknown",
            confidence: m.confidence.toFixed(1),
            id: m.manga.id,
          })),
        );
      }

      if (results.length === 0) {
        console.log(
          `⚠️ No results found for "${query}" - this could indicate a cache or display issue`,
        );
      }

      if (pageNum === 1) {
        console.log(`🔎 Resetting search results for "${query}"`);
        setSearchResults(results.map((match) => match.manga));
      } else {
        console.log(
          `🔎 Appending ${results.length} results to existing ${searchResults.length} results`,
        );
        setSearchResults((prev) => [
          ...prev,
          ...results.map((match) => match.manga),
        ]);
      }

      // Always set hasNextPage to true if we got results (could be more)
      setHasNextPage(results.length >= 10);
      setPage(pageNum);

      console.log(
        `🔎 UI state updated: searchResults.length=${results.length}, hasNextPage=${results.length >= 10}, page=${pageNum}`,
      );
    } catch (error) {
      console.error("Error searching manga:", error);
      setError("Failed to search for manga. Please try again.");
      if (pageNum === 1) {
        setSearchResults([]);
        console.log(`⚠️ Search error - cleared results`);
      }
    } finally {
      setIsSearching(false);
      console.log(`🔎 Search complete, isSearching set to false`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    handleSearch(searchQuery);
  };

  const loadMoreResults = () => {
    handleSearch(searchQuery, page + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }

    if (e.target === searchInputRef.current) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit(e);
      } else if (e.key === "ArrowDown" && searchResults.length > 0) {
        e.preventDefault();
        setSelectedIndex(0);
      }
      return;
    }

    if (searchResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, searchResults.length - 1),
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex = prev - 1;
          if (newIndex < 0) {
            searchInputRef.current?.focus();
            return -1;
          }
          return newIndex;
        });
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        onSelectMatch(searchResults[selectedIndex]);
      }
    }
  };

  const handleSelectResult = (manga: AniListManga, index: number) => {
    setSelectedIndex(index);
    onSelectMatch(manga);
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-labelledby="search-title"
      aria-modal="true"
    >
      <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="mr-3 rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label="Go back"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <h2
              id="search-title"
              className="text-lg font-medium text-gray-900 dark:text-white"
            >
              Search for manga
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Close search panel"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {kenmeiManga && (
        <div className="border-b border-gray-200 bg-blue-50 p-4 dark:border-gray-700 dark:bg-blue-900/20">
          <h3 className="mb-1 font-medium text-gray-900 dark:text-white">
            Looking for a match for:
          </h3>
          <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
            {kenmeiManga.title}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {kenmeiManga.status} • {kenmeiManga.chapters_read} chapters read
            {kenmeiManga.score > 0 && ` • Score: ${kenmeiManga.score}/10`}
          </p>
        </div>
      )}

      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pl-10 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
              placeholder="Search for a manga title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching}
              aria-label="Search manga title"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 focus:outline-none disabled:bg-blue-400 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            disabled={isSearching || !searchQuery.trim()}
            aria-label={isSearching ? "Searching..." : "Search for manga"}
          >
            {isSearching ? (
              <>
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                Searching...
              </>
            ) : (
              "Search"
            )}
          </button>
        </form>
      </div>

      <div
        ref={resultsContainerRef}
        className="flex-1 overflow-y-auto p-4"
        role="region"
        aria-label="Search results"
        aria-live="polite"
      >
        {error && (
          <div
            className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"
            role="alert"
          >
            <p>{error}</p>
          </div>
        )}

        {searchResults.length === 0 && !isSearching && !error && (
          <div className="text-center text-gray-500 dark:text-gray-400">
            {searchQuery.trim()
              ? "No results found"
              : "Enter a search term to find manga"}
          </div>
        )}

        <div className="space-y-4">
          {searchResults.map((result, index) => {
            const mangaId = result.id;
            const uniqueKey = mangaId
              ? `manga-${mangaId}`
              : `manga-${index}-${result.title?.romaji?.replace(/\s/g, "") || "unknown"}`;

            return (
              <div
                key={uniqueKey}
                data-index={index}
                className={`relative flex cursor-pointer flex-col space-y-2 rounded-lg border p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 ${
                  index === selectedIndex
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200"
                }`}
                onClick={() => handleSelectResult(result, index)}
                tabIndex={0}
                role="button"
                aria-pressed={index === selectedIndex}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectResult(result, index);
                  }
                }}
              >
                <div className="flex w-full items-start space-x-4">
                  {result.coverImage?.medium && (
                    <img
                      src={result.coverImage.medium}
                      alt={`Cover for ${result.title?.english || result.title?.romaji || "manga"}`}
                      className="h-24 w-16 object-cover"
                      loading="lazy"
                    />
                  )}

                  <div className="flex-1 space-y-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {result.title?.english ||
                        result.title?.romaji ||
                        "Unknown Title"}
                    </h3>

                    {result.title?.romaji &&
                      result.title.romaji !== result.title.english && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {result.title.romaji}
                        </p>
                      )}

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {result.format && (
                        <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {result.format.replace("_", " ")}
                        </span>
                      )}

                      {result.status && (
                        <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          {result.status.replace("_", " ")}
                        </span>
                      )}

                      {result.chapters && (
                        <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                          {result.chapters} chapters
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {result.genres?.slice(0, 3).map((genre, i) => (
                        <span
                          key={`${uniqueKey}-genre-${i}`}
                          className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {genre}
                        </span>
                      ))}
                      {result.genres && result.genres.length > 3 && (
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          +{result.genres.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ml-auto flex flex-col items-end justify-between self-stretch">
                    <a
                      href={`https://anilist.co/manga/${result.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                      aria-label="View on AniList"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={16} aria-hidden="true" />
                    </a>

                    <button
                      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-blue-600 dark:hover:bg-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectResult(result, index);
                      }}
                      aria-label="Select this manga match"
                    >
                      <Check size={14} className="mr-1" aria-hidden="true" />{" "}
                      Select
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {hasNextPage && (
            <button
              className="w-full rounded-md border border-gray-200 bg-white py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={loadMoreResults}
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <Loader2
                    className="mr-2 inline h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Loading more...
                </>
              ) : (
                "Load more results"
              )}
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        <span className="mr-3 inline-block">
          <kbd className="rounded-md border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-xs dark:border-gray-600 dark:bg-gray-700">
            ↑
          </kbd>
          <kbd className="ml-1 rounded-md border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-xs dark:border-gray-600 dark:bg-gray-700">
            ↓
          </kbd>{" "}
          Navigate
        </span>
        <span className="mr-3 inline-block">
          <kbd className="rounded-md border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-xs dark:border-gray-600 dark:bg-gray-700">
            Enter
          </kbd>{" "}
          Select
        </span>
        <span className="inline-block">
          <kbd className="rounded-md border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-xs dark:border-gray-600 dark:bg-gray-700">
            Esc
          </kbd>{" "}
          Close
        </span>
      </div>
    </div>
  );
}
