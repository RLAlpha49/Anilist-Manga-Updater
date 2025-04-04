/**
 * Manga search service for finding AniList matches for Kenmei manga
 * Handles searching, caching, and batch processing to optimize AniList API usage
 */

import { KenmeiManga } from "../kenmei/types";
import {
  AniListManga,
  MangaMatch,
  MangaMatchResult,
  SearchResult,
} from "../anilist/types";
import {
  searchManga,
  advancedSearchManga,
  getMangaByIds,
} from "../anilist/client";
import { normalizeString, findBestMatches } from "./match-engine";
import { MatchEngineConfig, DEFAULT_MATCH_CONFIG } from "./match-engine";

// Cache for manga search results
interface MangaCache {
  [key: string]: {
    manga: AniListManga[];
    timestamp: number;
  };
}

// Cache settings
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const mangaCache: MangaCache = {};

// Flag to prevent duplicate event listeners
let listenersRegistered = false;

// Track initialization status
let serviceInitialized = false;

/**
 * Initialize the manga search service
 * This will only run once regardless of how many times it's imported
 */
function initializeMangaService(): void {
  // Skip if already initialized
  if (serviceInitialized) {
    console.log(
      "Manga search service already initialized, skipping duplicate initialization",
    );
    return;
  }

  console.log("Initializing manga search service...");
  serviceInitialized = true;

  // Sync with client cache on initialization
  syncWithClientCache();

  // Set up event listeners
  if (typeof window !== "undefined" && !listenersRegistered) {
    listenersRegistered = true;

    window.addEventListener("anilist:search-cache-initialized", () => {
      console.log(
        "Received search cache initialization event, syncing caches...",
      );
      syncWithClientCache();
    });

    // Listen for new search results to directly update our cache
    window.addEventListener(
      "anilist:search-results-updated",
      (event: Event) => {
        if (event instanceof CustomEvent) {
          const { search, results, timestamp } = event.detail;

          if (search && results && Array.isArray(results)) {
            // Add each individual manga to our manga cache
            results.forEach((manga: AniListManga) => {
              if (manga.title) {
                // Cache by romaji title
                if (manga.title.romaji) {
                  const mangaKey = generateCacheKey(manga.title.romaji);
                  mangaCache[mangaKey] = {
                    manga: [manga],
                    timestamp: timestamp || Date.now(),
                  };
                }

                // Also cache by English title if available
                if (manga.title.english) {
                  const engKey = generateCacheKey(manga.title.english);
                  mangaCache[engKey] = {
                    manga: [manga],
                    timestamp: timestamp || Date.now(),
                  };
                }
              }
            });

            // Save the updated cache
            saveCache();
          }
        }
      },
    );

    console.log("Manga search service event listeners registered");
  }

  // Make the cache debugger available globally for troubleshooting
  if (typeof window !== "undefined") {
    try {
      // Only define the property if it doesn't already exist
      if (
        !Object.prototype.hasOwnProperty.call(window, "__anilistCacheDebug")
      ) {
        Object.defineProperty(window, "__anilistCacheDebug", {
          value: cacheDebugger,
          writable: false,
          enumerable: false,
        });
        console.log(
          "AniList cache debugger available at window.__anilistCacheDebug",
        );
      }
    } catch (e) {
      console.error("Error setting up cache debugger:", e);
    }
  }
}

// Initialize the service when this module is imported
initializeMangaService();

/**
 * Sync the manga-search-service cache with the client search cache
 * This ensures we don't miss cached results from previous searches
 */
function syncWithClientCache(): void {
  // Check localStorage cache first
  if (typeof window !== "undefined") {
    try {
      // Check for manga cache
      const mangaCacheKey = "anilist_manga_cache";
      const cachedMangaData = localStorage.getItem(mangaCacheKey);

      if (cachedMangaData) {
        try {
          const parsedCache = JSON.parse(cachedMangaData);
          // Merge with our in-memory cache and filter out Light Novels
          Object.keys(parsedCache).forEach((key) => {
            if (
              !mangaCache[key] ||
              parsedCache[key].timestamp > mangaCache[key].timestamp
            ) {
              // Filter out Light Novels from the cached data
              const filteredManga = parsedCache[key].manga.filter(
                (manga: AniListManga) =>
                  manga.format !== "NOVEL" && manga.format !== "LIGHT_NOVEL",
              );

              mangaCache[key] = {
                manga: filteredManga,
                timestamp: parsedCache[key].timestamp,
              };
            }
          });
          console.log(
            `Loaded ${Object.keys(parsedCache).length} cached manga from localStorage`,
          );
        } catch (e) {
          console.error("Error parsing cached manga data:", e);
        }
      }

      // Now check for search cache to extract manga
      const searchCacheKey = "anilist_search_cache";
      const cachedSearchData = localStorage.getItem(searchCacheKey);

      if (cachedSearchData) {
        try {
          const parsedSearchCache = JSON.parse(cachedSearchData);
          let importedCount = 0;

          // Extract manga from search results and add to manga cache
          Object.keys(parsedSearchCache).forEach((key) => {
            const searchEntry = parsedSearchCache[key];

            // Only process valid entries
            if (searchEntry?.data?.Page?.media?.length) {
              const media = searchEntry.data.Page.media;

              // Generate a proper cache key for each manga title
              media.forEach((manga: AniListManga) => {
                if (manga.title?.romaji) {
                  const mangaKey = generateCacheKey(manga.title.romaji);

                  // If we don't have this manga in cache, or it's newer, add it
                  if (
                    !mangaCache[mangaKey] ||
                    searchEntry.timestamp > mangaCache[mangaKey].timestamp
                  ) {
                    mangaCache[mangaKey] = {
                      manga: [manga],
                      timestamp: searchEntry.timestamp,
                    };
                    importedCount++;
                  }

                  // Also try with English title if available
                  if (manga.title.english) {
                    const engKey = generateCacheKey(manga.title.english);
                    if (
                      !mangaCache[engKey] ||
                      searchEntry.timestamp > mangaCache[engKey].timestamp
                    ) {
                      mangaCache[engKey] = {
                        manga: [manga],
                        timestamp: searchEntry.timestamp,
                      };
                      importedCount++;
                    }
                  }
                }
              });
            }
          });

          if (importedCount > 0) {
            console.log(
              `Imported ${importedCount} manga entries from search cache to manga cache`,
            );
            // Save the updated cache
            saveCache();
          }
        } catch (e) {
          console.error("Error processing search cache:", e);
        }
      }
    } catch (e) {
      console.error("Error accessing localStorage:", e);
    }
  }
}

// Save the cache to localStorage when it's updated
function saveCache(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("anilist_manga_cache", JSON.stringify(mangaCache));
    } catch (e) {
      console.error("Error saving cache to localStorage:", e);
    }
  }
}

// API request rate limiting
const API_RATE_LIMIT = 28; // 30 requests per minute is the AniList limit, use 28 to be safe
const REQUEST_INTERVAL = (60 * 1000) / API_RATE_LIMIT; // milliseconds between requests

// Global rate limiting state
let lastRequestTime = 0;
const requestQueue: { resolve: (value: void) => void }[] = [];
let processingQueue = false;

// Search service configuration
export interface SearchServiceConfig {
  matchConfig: Partial<MatchEngineConfig>;
  batchSize: number;
  searchPerPage: number;
  maxSearchResults: number;
  useAdvancedSearch: boolean;
  enablePreSearch: boolean;
  exactMatchingOnly: boolean; // New option for exact matching
  bypassCache?: boolean;
}

export const DEFAULT_SEARCH_CONFIG: SearchServiceConfig = {
  matchConfig: DEFAULT_MATCH_CONFIG,
  batchSize: 10,
  searchPerPage: 50,
  maxSearchResults: 50,
  useAdvancedSearch: false,
  enablePreSearch: true,
  exactMatchingOnly: false,
  bypassCache: false,
};

/**
 * Generate a cache key for a manga title
 */
function generateCacheKey(title: string): string {
  return normalizeString(title).substring(0, 30);
}

/**
 * Check if a cache entry is valid
 */
function isCacheValid(key: string): boolean {
  const entry = mangaCache[key];
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_EXPIRY;
}

/**
 * Sleep for a specified duration to respect rate limits
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Request rate limiting queue handler
 * Ensures we don't exceed AniList's rate limits
 */
async function acquireRateLimit(): Promise<void> {
  return new Promise<void>((resolve) => {
    // Add this request to the queue
    requestQueue.push({ resolve });

    // If not already processing the queue, start processing
    if (!processingQueue) {
      processRateLimitQueue();
    }
  });
}

/**
 * Process the rate limit queue
 */
async function processRateLimitQueue(): Promise<void> {
  if (processingQueue) return;

  processingQueue = true;

  while (requestQueue.length > 0) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    // If we need to wait for the rate limit, do so
    if (lastRequestTime > 0 && timeSinceLastRequest < REQUEST_INTERVAL) {
      const waitTime = REQUEST_INTERVAL - timeSinceLastRequest;
      await sleep(waitTime);
    }

    // Get the next request from the queue and resolve it
    const nextRequest = requestQueue.shift();
    if (nextRequest) {
      lastRequestTime = Date.now();
      nextRequest.resolve();
    }

    // Small additional delay to be extra safe
    await sleep(50);
  }

  processingQueue = false;
}

/**
 * Make a search with rate limiting
 */
async function searchWithRateLimit(
  query: string,
  page: number = 1,
  perPage: number = 50,
  token?: string,
  acquireLimit: boolean = true,
  retryCount: number = 0,
  bypassCache: boolean = false,
): Promise<SearchResult<AniListManga>> {
  // Only wait for rate limit if requested (first request in a batch should wait, subsequent ones should not)
  if (acquireLimit) {
    await acquireRateLimit();
  }

  try {
    // Call the AniList client search function - this will handle caching in the client
    return await searchManga(query, page, perPage, token, bypassCache);
  } catch (error: unknown) {
    // Retry logic for transient errors
    if (retryCount < 3) {
      console.warn(`Search error, retrying (${retryCount + 1}/3): ${query}`);
      await sleep(1000 * (retryCount + 1)); // Exponential backoff

      // Retry with incremented retry count
      return searchWithRateLimit(
        query,
        page,
        perPage,
        token,
        true,
        retryCount + 1,
        bypassCache,
      );
    }

    // After all retries, propagate the error
    throw error;
  }
}

/**
 * Make an advanced search with rate limiting
 */
async function advancedSearchWithRateLimit(
  query: string,
  filters: {
    genres?: string[];
    tags?: string[];
    formats?: string[];
  } = {},
  page: number = 1,
  perPage: number = 50,
  token?: string,
  acquireLimit: boolean = true,
  retryCount: number = 0,
  bypassCache: boolean = false,
): Promise<SearchResult<AniListManga>> {
  // Only wait for rate limit if requested
  if (acquireLimit) {
    await acquireRateLimit();
  }

  try {
    // Call the AniList client search function - this will handle caching in the client
    return await advancedSearchManga(
      query,
      filters,
      page,
      perPage,
      token,
      bypassCache,
    );
  } catch (error: unknown) {
    // Retry logic for transient errors
    if (retryCount < 3) {
      console.warn(
        `Advanced search error, retrying (${retryCount + 1}/3): ${query}`,
      );
      await sleep(1000 * (retryCount + 1)); // Exponential backoff

      // Retry with incremented retry count
      return advancedSearchWithRateLimit(
        query,
        filters,
        page,
        perPage,
        token,
        true,
        retryCount + 1,
        bypassCache,
      );
    }

    // After all retries, propagate the error
    throw error;
  }
}

/**
 * Remove punctuation from a string
 */
function removePunctuation(str: string): string {
  return str.replace(/[^\w\s]/g, "");
}

/**
 * Check if words from search term appear in title with consideration for word order and proximity
 * Returns true if there's a good match, with stricter criteria than before
 */
function checkTitleMatch(title: string, searchName: string): boolean {
  // Remove punctuation from the title and the search name
  const cleanTitle = removePunctuation(title);
  const cleanSearchName = removePunctuation(searchName);

  // Split into words
  const titleWordsArray = cleanTitle
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  const searchWordsArray = cleanSearchName
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  // If search is a single word, just check if it exists in the title
  if (searchWordsArray.length === 1) {
    return titleWordsArray.includes(searchWordsArray[0]);
  }

  // For multi-word searches, check if all words are present
  const allWordsPresent = searchWordsArray.every((word) =>
    titleWordsArray.includes(word),
  );
  if (!allWordsPresent) return false;

  // If all words are present, check for order preservation and proximity
  // Find indexes of search words in the title
  const indexes = searchWordsArray.map((word) => titleWordsArray.indexOf(word));

  // Check if the words appear in the same order (indexes should be increasing)
  const sameOrder = indexes.every(
    (index, i) => i === 0 || index > indexes[i - 1],
  );

  // Count how many words are adjacent (index difference of 1)
  let adjacentCount = 0;
  for (let i = 1; i < indexes.length; i++) {
    if (indexes[i] - indexes[i - 1] === 1) {
      adjacentCount++;
    }
  }

  // Calculate proximity score (what percentage of words are adjacent)
  const proximityScore = adjacentCount / (searchWordsArray.length - 1);

  // Return true if words are in same order OR if at least 50% are adjacent
  return sameOrder || proximityScore >= 0.5;
}

/**
 * Process manga title by replacing hyphens, apostrophes, etc.
 */
function processTitle(title: string): string {
  return title
    .replace(/-/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/_/g, " ")
    .trim();
}

/**
 * Calculate match score between a manga title and search query
 * Returns 0-1 score where 1 is perfect match, or -1 if no match
 */
function calculateMatchScore(manga: AniListManga, searchTitle: string): number {
  const titles: string[] = [];
  const titleSources: string[] = []; // Track where each title came from for better logging
  let bestScore = -1;

  // Add all available titles to check
  if (manga.title.english) {
    titles.push(manga.title.english);
    titleSources.push("english");
  }
  if (manga.title.romaji) {
    titles.push(manga.title.romaji);
    titleSources.push("romaji");
  }
  if (manga.title.native) {
    titles.push(manga.title.native);
    titleSources.push("native");
  }
  if (manga.synonyms && Array.isArray(manga.synonyms)) {
    manga.synonyms.forEach((synonym, index) => {
      if (synonym) {
        titles.push(synonym);
        titleSources.push(`synonym_${index}`);
      }
    });
  }

  // Log for debugging
  console.log(
    `🔍 Calculating match score for "${searchTitle}" against manga ID ${manga.id}, titles:`,
    {
      english: manga.title.english,
      romaji: manga.title.romaji,
      native: manga.title.native,
      synonyms: manga.synonyms,
    },
  );

  // Normalize the search title for better matching
  const normalizedSearchTitle = normalizeForMatching(searchTitle);

  // Process each title and check for matches
  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    const source = titleSources[i];

    if (!title) continue;

    const processedTitle = processTitle(title);
    const normalizedTitle = normalizeForMatching(processedTitle);

    // Check for exact match first
    if (normalizedTitle === normalizedSearchTitle) {
      console.log(`💯 Perfect match found for "${title}" (${source})`);
      return 1; // Perfect match
    }

    // Check for high similarity (handles minor differences in romanization)
    const similarity = calculateStringSimilarity(
      normalizedTitle,
      normalizedSearchTitle,
    );
    if (similarity > 0.85) {
      console.log(
        `🔍 High similarity (${similarity.toFixed(2)}) between "${title}" (${source}) and "${searchTitle}"`,
      );
      return Math.max(0.8, similarity); // Score based on similarity
    }

    // Check for word subset match (all search words in title)
    if (checkTitleMatch(processedTitle, searchTitle)) {
      // Calculate a score based on length difference
      // Closer lengths = better match
      const lengthDiff =
        Math.abs(processedTitle.length - searchTitle.length) /
        Math.max(processedTitle.length, searchTitle.length);
      const score = 0.8 - lengthDiff * 0.3; // Score between 0.5-0.8
      bestScore = Math.max(bestScore, score);
      console.log(
        `🔍 Word match found for "${title}" (${source}) with score ${score.toFixed(2)}`,
      );
    }
  }

  console.log(
    `🔍 Final match score for "${searchTitle}": ${bestScore.toFixed(2)}`,
  );
  return bestScore;
}

/**
 * Normalize a string for matching by removing punctuation and standardizing case
 * Preserves word boundaries to maintain distinction between separate words
 */
function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize spaces (replace multiple spaces with a single space)
    .replace(/_/g, " ") // Replace underscores with spaces
    .trim();
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a value between 0 and 1, where 1 is a perfect match
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  // If strings are exact match, return 1
  if (str1 === str2) return 1;

  // If either string is empty, no match
  if (str1.length === 0 || str2.length === 0) return 0;

  // If strings are very different in length, reduce similarity
  const lengthDiff = Math.abs(str1.length - str2.length);
  const maxLength = Math.max(str1.length, str2.length);
  if (lengthDiff / maxLength > 0.5) return 0.2;

  // Use Levenshtein distance for more accurate similarity calculation
  const matrix: number[][] = [];

  // Initialize the matrix
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  // Calculate similarity as 1 - normalized distance
  const distance = matrix[str1.length][str2.length];
  const similarity = 1 - distance / Math.max(str1.length, str2.length);

  return similarity;
}

/**
 * Filter and rank manga results by match quality
 */
function rankMangaResults(
  results: AniListManga[],
  searchTitle: string,
  exactMatchingOnly: boolean,
): AniListManga[] {
  const scoredResults: Array<{ manga: AniListManga; score: number }> = [];

  console.log(
    `🔍 Ranking ${results.length} manga results for "${searchTitle}" with exactMatchingOnly=${exactMatchingOnly}`,
  );

  // Score each manga result
  for (const manga of results) {
    // Skip Light Novels
    if (manga.format === "NOVEL" || manga.format === "LIGHT_NOVEL") {
      console.log(
        `⏭️ Skipping light novel: ${manga.title?.romaji || manga.title?.english || "unknown"}`,
      );
      continue;
    }

    const score = calculateMatchScore(manga, searchTitle);

    if (exactMatchingOnly) {
      console.log(
        `🔍 Checking titles for exact match against "${searchTitle}"`,
      );

      // In exact matching mode, do a thorough check of all titles
      // This ensures we don't miss matches due to normalization differences
      let foundGoodMatch = false;

      // Check all titles directly
      const titlesToCheck = [
        manga.title?.romaji,
        manga.title?.english,
        manga.title?.native,
        ...(manga.synonyms || []),
      ].filter(Boolean);

      for (const title of titlesToCheck) {
        if (!title) continue;

        // Check different variations of the title against the search
        // This catches cases where normalization might miss things
        const normalSearch = normalizeForMatching(searchTitle);
        const normalTitle = normalizeForMatching(title);

        // Check if titles are very similar after normalization
        if (
          normalTitle === normalSearch ||
          calculateStringSimilarity(normalTitle, normalSearch) > 0.85
        ) {
          console.log(
            `✅ Found good title match: "${title}" for "${searchTitle}"`,
          );
          foundGoodMatch = true;
          break;
        }

        // Check each word in the search query against the title
        const searchWords = searchTitle
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 1);
        const titleLower = title.toLowerCase();

        // If all important words from search are in the title, consider it a match
        const allWordsFound = searchWords.every((word) =>
          titleLower.includes(word),
        );
        if (allWordsFound && searchWords.length > 1) {
          console.log(`✅ All search words found in title: "${title}"`);
          foundGoodMatch = true;
          break;
        }
      }

      // If this is an exact match run and we have a good score or manually found a good match
      if (score > 0.5 || foundGoodMatch || results.length <= 3) {
        console.log(
          `✅ Including manga "${manga.title?.romaji || manga.title?.english}" with score: ${score}`,
        );
        scoredResults.push({
          manga,
          score: foundGoodMatch ? Math.max(score, 0.7) : score,
        });
      } else {
        console.log(
          `❌ Excluding manga "${manga.title?.romaji || manga.title?.english}" with score: ${score} (below threshold)`,
        );
      }
    } else {
      // Non-exact matching mode - just use the score
      if (score > 0 || results.length <= 3) {
        console.log(
          `✅ Including manga "${manga.title?.romaji || manga.title?.english}" with score: ${score}`,
        );
        scoredResults.push({ manga, score });
      } else {
        console.log(
          `❌ Excluding manga "${manga.title?.romaji || manga.title?.english}" with score: ${score} (below threshold)`,
        );
      }
    }
  }

  // Sort by score (descending)
  scoredResults.sort((a, b) => b.score - a.score);

  // Always include at least one result if available, even with low score
  if (scoredResults.length === 0 && results.length > 0) {
    console.log(
      `🔄 No results matched score threshold but including top result anyway`,
    );
    const bestGuess = results[0];
    scoredResults.push({
      manga: bestGuess,
      score: 0.1, // Very low confidence
    });
  }

  console.log(
    `🏆 Ranked results: ${scoredResults.length} manga after filtering and ranking`,
  );

  // Return just the manga objects, preserving the new order
  return scoredResults.map((item) => item.manga);
}

/**
 * Search for manga by title with rate limiting
 */
export async function searchMangaByTitle(
  title: string,
  token?: string,
  config: Partial<SearchServiceConfig> = {},
  abortSignal?: AbortSignal,
): Promise<MangaMatch[]> {
  const searchConfig = { ...DEFAULT_SEARCH_CONFIG, ...config };

  // Generate cache key for this title
  const cacheKey = generateCacheKey(title);

  // If bypassing cache, explicitly clear any existing cache for this title
  if (searchConfig.bypassCache && cacheKey) {
    console.log(`🔥 Fresh search: Explicitly clearing cache for "${title}"`);

    // Check if we have this title in cache first
    if (mangaCache[cacheKey]) {
      delete mangaCache[cacheKey];
      console.log(`🧹 Removed existing cache entry for "${title}"`);

      // Also save the updated cache to persist the removal
      saveCache();
    } else {
      console.log(`🔍 No existing cache entry found for "${title}" to clear`);
    }
  } else if (!searchConfig.bypassCache) {
    // Check cache first (existing logic - only if not bypassing)
    if (isCacheValid(cacheKey)) {
      console.log(`Using cache for ${title}`);
      // Filter out Light Novels from cache results
      const filteredManga = mangaCache[cacheKey].manga.filter(
        (manga) => manga.format !== "NOVEL" && manga.format !== "LIGHT_NOVEL",
      );
      return filteredManga.map((manga) => ({
        manga,
        confidence: calculateConfidence(
          typeof manga.title === "object" && manga.title
            ? manga.title.romaji || manga.title.english || ""
            : String(manga.title || ""),
          manga,
        ),
      }));
    }
  } else {
    console.log(
      `🚨 FORCE SEARCH: Bypassing cache for "${title}" - will query AniList API directly`,
    );

    // For manual searches, ensure we're not too strict with exact matching
    if (searchConfig.exactMatchingOnly) {
      console.log(
        `🔍 MANUAL SEARCH: Ensuring exact matching is correctly configured`,
      );
      searchConfig.exactMatchingOnly = true; // Keep it true, but we've enhanced the matching logic
    }
  }

  const searchQuery = title;

  // Now we need to use the API - wait for our turn in the rate limiting queue
  await acquireRateLimit();

  // Initialize search variables
  let results: AniListManga[] = [];
  let currentPage = 1;
  let hasNextPage = true;

  // Add debug log to show we're making a network request
  console.log(
    `🌐 Making network request to AniList API for "${title}" - bypassCache=${searchConfig.bypassCache}`,
  );

  // Search until we have enough results or there are no more pages
  while (hasNextPage && results.length < searchConfig.maxSearchResults) {
    try {
      // Check if aborted before searching
      if (abortSignal && abortSignal.aborted) {
        throw new Error("Search aborted by abort signal");
      }

      let searchResult: SearchResult<AniListManga>;

      console.log(
        `🔍 Searching for "${searchQuery}" (page ${currentPage}, bypassCache=${searchConfig.bypassCache ? "true" : "false"})`,
      );

      if (searchConfig.useAdvancedSearch) {
        searchResult = await advancedSearchWithRateLimit(
          searchQuery,
          {}, // No filters for initial search
          currentPage,
          searchConfig.searchPerPage,
          token,
          false, // Don't acquire rate limit again, we already did
          // Pass bypassCache flag to search functions
          0,
          searchConfig.bypassCache,
        );
      } else {
        searchResult = await searchWithRateLimit(
          searchQuery,
          currentPage,
          searchConfig.searchPerPage,
          token,
          false, // Don't acquire rate limit again, we already did
          0,
          searchConfig.bypassCache,
        );
      }

      console.log(
        `🔍 Search response for "${searchQuery}" page ${currentPage}: ${searchResult?.Page?.media?.length || 0} results`,
      );

      // If doing a manual search, log the actual titles received for debugging
      if (searchConfig.bypassCache && searchResult?.Page?.media?.length > 0) {
        console.log(
          `🔍 Titles received from API:`,
          searchResult.Page.media.map((m) => ({
            id: m.id,
            romaji: m.title?.romaji,
            english: m.title?.english,
            native: m.title?.native,
            synonyms: m.synonyms?.length,
          })),
        );
      }

      // Validate the search result structure
      if (!searchResult || !searchResult.Page) {
        console.error(`Invalid search result for "${title}":`, searchResult);
        break; // Exit the loop but continue with whatever results we have
      }

      // Validate that media array exists
      if (!searchResult.Page.media) {
        console.error(
          `Search result for "${title}" missing media array:`,
          searchResult,
        );
        searchResult.Page.media = []; // Provide empty array to prevent errors
      }

      // Add results
      results = [...results, ...searchResult.Page.media];

      // Validate pageInfo exists
      if (!searchResult.Page.pageInfo) {
        console.error(
          `Search result for "${title}" missing pageInfo:`,
          searchResult,
        );
        break; // Exit the loop but continue with whatever results we have
      }

      // Check if there are more pages
      hasNextPage =
        searchResult.Page.pageInfo.hasNextPage &&
        currentPage < searchResult.Page.pageInfo.lastPage &&
        results.length < searchConfig.maxSearchResults;

      currentPage++;

      // If we need to fetch another page, wait for rate limit again
      if (hasNextPage) {
        await acquireRateLimit();
      }
    } catch (error: unknown) {
      // Log the error with its details to show it's being used
      if (error instanceof Error) {
        console.error(
          `Error searching for manga "${searchQuery}": ${error.message}`,
          error,
        );
      } else {
        console.error(`Error searching for manga "${searchQuery}"`, error);
      }
      break; // Break out of the loop, but continue with whatever results we have
    }
  }

  console.log(
    `🔍 Found ${results.length} raw results for "${title}" before filtering/ranking`,
  );

  // For manual searches, always ensure we show results
  let exactMatchMode = searchConfig.exactMatchingOnly;

  // If this is a manual search or we have few results, be more lenient
  if ((searchConfig.bypassCache && results.length > 0) || results.length <= 3) {
    console.log(
      `🔍 Using enhanced title matching to ensure results are displayed`,
    );
    exactMatchMode = false; // Don't be too strict with manual searches
  }

  // Filter and rank results by match quality with modified exact matching behavior
  const rankedResults = rankMangaResults(results, title, exactMatchMode);

  console.log(
    `🔍 Search complete for "${title}": Found ${results.length} results, ranked to ${rankedResults.length} relevant matches`,
  );

  // Only cache the results if we're not bypassing cache
  if (!searchConfig.bypassCache) {
    // Cache the results
    const cacheKey = generateCacheKey(title);
    mangaCache[cacheKey] = {
      manga: rankedResults,
      timestamp: Date.now(),
    };

    // Save the updated cache to localStorage
    saveCache();
  } else {
    console.log(`🔍 MANUAL SEARCH: Skipping cache save for "${title}"`);
  }

  // Filter out any Light Novels before returning results
  const filteredResults = rankedResults.filter(
    (manga) => manga.format !== "NOVEL" && manga.format !== "LIGHT_NOVEL",
  );

  // If after all filtering we have no results but the API returned some,
  // include at least the first API result regardless of score
  let finalResults = filteredResults;
  if (filteredResults.length === 0 && results.length > 0) {
    console.log(
      `⚠️ No matches passed filtering, but including raw API results anyway`,
    );
    // Include first few results from the API as low-confidence matches
    finalResults = results
      .slice(0, 3)
      .filter(
        (manga) => manga.format !== "NOVEL" && manga.format !== "LIGHT_NOVEL",
      );

    // Log what we're including
    console.log(
      `🔍 Including these API results:`,
      finalResults.map((m) => ({
        id: m.id,
        romaji: m.title?.romaji,
        english: m.title?.english,
      })),
    );
  }

  console.log(`🔍 Final result count: ${finalResults.length} manga`);

  // For manual searches with no results but API had results, always include the API results
  if (
    searchConfig.bypassCache &&
    finalResults.length === 0 &&
    results.length > 0
  ) {
    console.log(
      `⚠️ MANUAL SEARCH with no ranked results - forcing inclusion of API results`,
    );
    finalResults = results.filter(
      (manga) => manga.format !== "NOVEL" && manga.format !== "LIGHT_NOVEL",
    );
  }

  return finalResults.map((manga) => ({
    manga,
    confidence: calculateConfidence(
      typeof manga.title === "object" && manga.title
        ? manga.title.romaji || manga.title.english || ""
        : String(manga.title || ""),
      manga,
    ),
  }));
}

/**
 * Match a single Kenmei manga with AniList entries
 */
export async function matchSingleManga(
  kenmeiManga: KenmeiManga,
  token?: string,
  config: Partial<SearchServiceConfig> = {},
): Promise<MangaMatchResult> {
  const searchConfig = { ...DEFAULT_SEARCH_CONFIG, ...config };

  // Search for potential matches
  const potentialMatches = await searchMangaByTitle(
    kenmeiManga.title,
    token,
    searchConfig,
  );

  // If using exact matching and we have matches, just use the top match
  if (searchConfig.exactMatchingOnly && potentialMatches.length > 0) {
    // Calculate a match score for the top result
    const score = calculateMatchScore(
      potentialMatches[0].manga,
      kenmeiManga.title,
    );

    // If we have a good match, return it directly
    if (score > 0.7) {
      return {
        kenmeiManga,
        anilistMatches: [
          { manga: potentialMatches[0].manga, confidence: score * 100 },
        ],
        selectedMatch: potentialMatches[0].manga,
        status: "matched",
        matchDate: new Date(),
      };
    }
  }

  // Fall back to the match engine for more complex matching or no exact matches
  return findBestMatches(
    kenmeiManga,
    potentialMatches.map((match) => match.manga),
    searchConfig.matchConfig,
  );
}

/**
 * Process matches for a batch of manga
 */
export async function batchMatchManga(
  mangaList: KenmeiManga[],
  token?: string,
  config: Partial<SearchServiceConfig> = {},
  progressCallback?: (
    current: number,
    total: number,
    currentTitle?: string,
  ) => void,
  shouldCancel?: () => boolean,
  abortSignal?: AbortSignal,
): Promise<MangaMatchResult[]> {
  // Ensure we have the latest cache data
  syncWithClientCache();

  const searchConfig = { ...DEFAULT_SEARCH_CONFIG, ...config };
  const results: MangaMatchResult[] = [];

  // Create a set to track which manga have been reported in the progress
  const reportedIndices = new Set<number>();

  // Function to check if the operation should be cancelled
  const checkCancellation = () => {
    // Check the abort signal first
    if (abortSignal && abortSignal.aborted) {
      console.log("Batch matching process aborted by abort signal");
      throw new Error("Operation aborted by abort signal");
    }

    // Then check the cancellation function
    if (shouldCancel && shouldCancel()) {
      console.log("Batch matching process cancelled by user");
      throw new Error("Operation cancelled by user");
    }

    return false;
  };

  // Update progress with deduplication
  const updateProgress = (index: number, title?: string) => {
    if (progressCallback && !reportedIndices.has(index)) {
      reportedIndices.add(index);
      progressCallback(reportedIndices.size, mangaList.length, title);
    }
  };

  try {
    // First, check which manga are already in cache
    const cachedResults: Record<number, AniListManga[]> = {};
    const uncachedManga: { index: number; manga: KenmeiManga }[] = [];

    // Track manga IDs if we have them (for batch fetching)
    const knownMangaIds: { index: number; id: number }[] = [];

    // If we're bypassing cache, treat all manga as uncached
    if (searchConfig.bypassCache) {
      console.log(
        `🚨 FRESH SEARCH: Bypassing cache for all ${mangaList.length} manga titles`,
      );

      // Put all manga in the uncached list
      mangaList.forEach((manga, index) => {
        uncachedManga.push({ index, manga });
      });
    } else {
      console.log(`Checking cache for ${mangaList.length} manga titles...`);

      // Check cache for all manga first
      mangaList.forEach((manga, index) => {
        const cacheKey = generateCacheKey(manga.title);

        // If manga has a known AniList ID, we can batch fetch it
        if (manga.anilistId && Number.isInteger(manga.anilistId)) {
          knownMangaIds.push({ index, id: manga.anilistId });
        }
        // Otherwise check the cache
        else if (isCacheValid(cacheKey)) {
          // This manga is in cache
          cachedResults[index] = mangaCache[cacheKey].manga;
          console.log(`Found cached results for: ${manga.title}`);

          // Immediately update progress for cached manga
          updateProgress(index, manga.title);
        } else {
          // This manga needs to be fetched by search
          uncachedManga.push({ index, manga });
        }
      });

      console.log(
        `Found ${Object.keys(cachedResults).length} cached manga, ${knownMangaIds.length} have known IDs, ${uncachedManga.length} require searching`,
      );
    }

    // Check for cancellation
    checkCancellation();

    // First, fetch all manga with known IDs in batches (only if not bypassing cache)
    if (knownMangaIds.length > 0 && !searchConfig.bypassCache) {
      const ids = knownMangaIds.map((item) => item.id);
      console.log(`Fetching ${ids.length} manga with known IDs...`);

      // Get manga by IDs in batches, passing the abort signal
      const batchedManga = await getBatchedMangaIds(
        ids,
        token,
        shouldCancel,
        abortSignal,
      );

      // Create a map of ID to manga for easier lookup
      const mangaMap = new Map<number, AniListManga>();
      batchedManga.forEach((manga) => mangaMap.set(manga.id, manga));

      // Store the results in cachedResults by their original index
      knownMangaIds.forEach((item) => {
        const manga = mangaMap.get(item.id);
        if (manga) {
          cachedResults[item.index] = [manga]; // Store as array of one manga for consistency

          // Also store in the general cache to help future searches
          const title = mangaList[item.index].title;
          const cacheKey = generateCacheKey(title);
          mangaCache[cacheKey] = {
            manga: [manga],
            timestamp: Date.now(),
          };

          // Update progress for each found manga
          updateProgress(item.index, title);
        } else {
          // Manga ID was not found, add to uncached list for title search
          uncachedManga.push({
            index: item.index,
            manga: mangaList[item.index],
          });
        }
      });

      // Check for cancellation
      checkCancellation();
    }

    // Now process remaining uncached manga with strict concurrency control
    if (uncachedManga.length > 0) {
      // Create a semaphore to strictly limit concurrency - process one manga at a time
      const MAX_CONCURRENT = 1;
      let activeCount = 0;

      // Track processed manga to prevent duplicates
      const processedMangas = new Set<number>();

      // Create a queue that will be processed one by one
      const queue = [...uncachedManga];

      // Create a promise that we can use to wait for all processing to complete
      let resolve: (value: void | PromiseLike<void>) => void;
      let reject: (reason?: unknown) => void;
      const completionPromise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
      });

      // Track if we've been cancelled
      let isCancelled = false;

      // Function to check if we're done processing all manga
      const checkIfDone = () => {
        if ((queue.length === 0 && activeCount === 0) || isCancelled) {
          resolve();
        }
      };

      // Function to start processing the next manga in the queue
      const processNext = async () => {
        // Check for cancellation
        try {
          if (checkCancellation()) {
            isCancelled = true;
            resolve(); // Resolve to unblock the main thread
            return;
          }
        } catch (error) {
          isCancelled = true;
          reject(error);
          return;
        }

        // If the queue is empty or we're cancelled, we're done
        if (queue.length === 0 || isCancelled) {
          checkIfDone();
          return;
        }

        // If we're at max concurrency, wait
        if (activeCount >= MAX_CONCURRENT) {
          return;
        }

        // Get the next manga from the queue
        const { index, manga } = queue.shift()!;

        // Skip if this manga has already been processed
        if (processedMangas.has(index)) {
          processNext();
          return;
        }

        // Mark this manga as being processed
        processedMangas.add(index);
        activeCount++;

        try {
          // Check cancellation again before searching
          if (checkCancellation()) {
            throw new Error("Operation cancelled by user");
          }

          // Double-check cache one more time before searching
          const cacheKey = generateCacheKey(manga.title);
          if (!searchConfig.bypassCache && isCacheValid(cacheKey)) {
            cachedResults[index] = mangaCache[cacheKey].manga;
            console.log(
              `Using cache for ${manga.title} (found during processing)`,
            );
            // Update progress for this manga
            updateProgress(index, manga.title);
          } else {
            // Search for this manga
            console.log(
              `Searching for manga: ${manga.title} (${reportedIndices.size}/${mangaList.length})`,
            );

            // Update progress for this manga before search
            updateProgress(index, manga.title);

            // Check cancellation again before making the API call
            if (checkCancellation()) {
              throw new Error("Operation cancelled by user");
            }

            const potentialMatches = await searchMangaByTitle(
              manga.title,
              token,
              searchConfig,
              abortSignal, // Pass the abort signal to the search function
            );

            // Store the results
            cachedResults[index] = potentialMatches.map((match) => match.manga);
          }
        } catch (error) {
          // Check if this was a cancellation
          if (
            error instanceof Error &&
            (error.message.includes("cancelled") ||
              error.message.includes("aborted"))
          ) {
            console.error(`Search cancelled for manga: ${manga.title}`);
            isCancelled = true;
            reject(error); // Reject to stop the process
            return;
          }

          console.error(`Error searching for manga: ${manga.title}`, error);
          // Store empty result on error
          cachedResults[index] = [];
        } finally {
          // Decrement the active count and process the next manga
          activeCount--;

          // Don't try to process more if we've been cancelled
          if (!isCancelled) {
            processNext();
          }

          // Check if we're done
          checkIfDone();
        }
      };

      // Start processing up to MAX_CONCURRENT manga
      for (let i = 0; i < Math.min(MAX_CONCURRENT, uncachedManga.length); i++) {
        processNext();
      }

      try {
        // Wait for all processing to complete
        await completionPromise;
      } catch (error) {
        console.log("Processing cancelled:", error);

        // If we got here due to cancellation, return the partial results we've managed to gather
        if (
          error instanceof Error &&
          (error.message.includes("cancelled") ||
            error.message.includes("aborted"))
        ) {
          console.log(
            `Cancellation completed, returning ${results.length} partial results`,
          );

          // Process whatever results we have so far
          for (let i = 0; i < mangaList.length; i++) {
            if (cachedResults[i]) {
              const manga = mangaList[i];
              const potentialMatches = cachedResults[i].map((manga) => ({
                manga,
                confidence: calculateConfidence(
                  typeof manga.title === "object" && manga.title
                    ? manga.title.romaji || manga.title.english || ""
                    : String(manga.title || ""),
                  manga,
                ),
              }));

              results.push({
                kenmeiManga: manga,
                anilistMatches: potentialMatches,
                selectedMatch:
                  potentialMatches.length > 0
                    ? potentialMatches[0].manga
                    : undefined,
                status: "pending",
              });
            }
          }

          return results;
        }

        // If it's a different kind of error, rethrow it
        throw error;
      }

      // Check for cancellation after the batch completes
      checkCancellation();
    }

    // First fill in the results array to match the mangaList length
    for (let i = 0; i < mangaList.length; i++) {
      results[i] = {
        kenmeiManga: mangaList[i],
        anilistMatches: [],
        status: "pending",
      } as MangaMatchResult; // Use empty arrays instead of null
    }

    // Fill in the results for manga we have matches for
    for (let i = 0; i < mangaList.length; i++) {
      // Check for cancellation periodically
      if (i % 10 === 0) {
        checkCancellation();
      }

      const manga = mangaList[i];
      const potentialMatches = cachedResults[i] || [];

      // Update progress for any remaining manga
      updateProgress(i, manga.title);

      // Fix mapping to create proper MangaMatch objects
      const potentialMatchesFixed = potentialMatches.map((match) => ({
        manga: match,
        confidence: calculateConfidence(
          typeof match.title === "object" && match.title
            ? match.title.romaji || match.title.english || ""
            : String(match.title || ""),
          match,
        ),
      }));

      results[i] = {
        kenmeiManga: manga,
        anilistMatches: potentialMatchesFixed,
        selectedMatch:
          potentialMatchesFixed.length > 0
            ? potentialMatchesFixed[0].manga
            : undefined,
        status: "pending",
      };
    }

    // Filter out any null entries (though there shouldn't be any)
    return results.filter((result) => result !== null);
  } catch (error) {
    console.error("Error in batch matching process:", error);

    // If we got here due to cancellation, return whatever partial results we have
    if (
      error instanceof Error &&
      (error.message.includes("cancelled") || error.message.includes("aborted"))
    ) {
      console.log(
        `Cancellation detected, returning ${results.length} partial results`,
      );
      return results;
    }

    // Otherwise rethrow the error
    throw error;
  }
}

/**
 * Pre-search for common manga titles to populate cache
 * This can be used to speed up subsequent searches
 */
export async function preloadCommonManga(
  titles: string[],
  token?: string,
  config: Partial<SearchServiceConfig> = {},
): Promise<void> {
  const searchConfig = { ...DEFAULT_SEARCH_CONFIG, ...config };

  // Process in batches to respect rate limits
  for (let i = 0; i < titles.length; i += searchConfig.batchSize) {
    const batch = titles.slice(i, i + searchConfig.batchSize);

    // Process batch items in sequence with rate limiting
    for (let j = 0; j < batch.length; j++) {
      const title = batch[j];
      const cacheKey = generateCacheKey(title);

      // Only search if not already in cache
      if (!isCacheValid(cacheKey)) {
        await searchMangaByTitle(title, token, searchConfig);
      }
    }
  }
}

/**
 * Clear the manga cache
 */
export function clearMangaCache(): void {
  Object.keys(mangaCache).forEach((key) => {
    delete mangaCache[key];
  });
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: number;
  oldestEntry: number;
  newestEntry: number;
} {
  const keys = Object.keys(mangaCache);

  if (keys.length === 0) {
    return {
      size: 0,
      entries: 0,
      oldestEntry: 0,
      newestEntry: 0,
    };
  }

  // Calculate total cached manga entries
  let totalEntries = 0;
  let oldestTimestamp = Date.now();
  let newestTimestamp = 0;

  keys.forEach((key) => {
    const entry = mangaCache[key];
    totalEntries += entry.manga.length;

    if (entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
    }

    if (entry.timestamp > newestTimestamp) {
      newestTimestamp = entry.timestamp;
    }
  });

  return {
    size: keys.length,
    entries: totalEntries,
    oldestEntry: Math.floor((Date.now() - oldestTimestamp) / 1000 / 60), // minutes ago
    newestEntry: Math.floor((Date.now() - newestTimestamp) / 1000 / 60), // minutes ago
  };
}

/**
 * Debug and troubleshoot the cache status
 * This exposes functions to check and diagnose cache issues
 */
export const cacheDebugger = {
  /**
   * Get a summary of the current cache status
   */
  getCacheStatus(): {
    inMemoryCache: number;
    localStorage: {
      mangaCache: number;
      searchCache: number;
    };
  } {
    // Check in-memory cache
    const inMemoryCount = Object.keys(mangaCache).length;

    // Check localStorage
    let storedMangaCount = 0;
    let storedSearchCount = 0;

    if (typeof window !== "undefined") {
      try {
        const mangaCacheData = localStorage.getItem("anilist_manga_cache");
        if (mangaCacheData) {
          const parsed = JSON.parse(mangaCacheData);
          storedMangaCount = Object.keys(parsed).length;
        }

        const searchCacheData = localStorage.getItem("anilist_search_cache");
        if (searchCacheData) {
          const parsed = JSON.parse(searchCacheData);
          storedSearchCount = Object.keys(parsed).length;
        }
      } catch (e) {
        console.error("Error checking localStorage cache:", e);
      }
    }

    return {
      inMemoryCache: inMemoryCount,
      localStorage: {
        mangaCache: storedMangaCount,
        searchCache: storedSearchCount,
      },
    };
  },

  /**
   * Check if a specific manga title is in cache
   */
  checkMangaInCache(title: string): {
    found: boolean;
    cacheKey: string;
    entry?: {
      mangaCount: number;
      timestamp: number;
      age: string;
    };
  } {
    const cacheKey = generateCacheKey(title);
    const entry = mangaCache[cacheKey];

    if (!entry) {
      return { found: false, cacheKey };
    }

    // Calculate age
    const ageMs = Date.now() - entry.timestamp;
    const ageMinutes = Math.floor(ageMs / 60000);

    let age: string;
    if (ageMinutes < 60) {
      age = `${ageMinutes} minute(s)`;
    } else if (ageMinutes < 1440) {
      age = `${Math.floor(ageMinutes / 60)} hour(s)`;
    } else {
      age = `${Math.floor(ageMinutes / 1440)} day(s)`;
    }

    return {
      found: true,
      cacheKey,
      entry: {
        mangaCount: entry.manga.length,
        timestamp: entry.timestamp,
        age,
      },
    };
  },

  /**
   * Force a sync of the caches
   */
  forceSyncCaches(): void {
    syncWithClientCache();
    console.log("Cache sync forced, current status:");
    console.log(this.getCacheStatus());
  },

  /**
   * Reset all caches (both in-memory and localStorage)
   */
  resetAllCaches(): void {
    // Clear in-memory cache
    clearMangaCache();

    // Clear localStorage caches
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("anilist_manga_cache");
        localStorage.removeItem("anilist_search_cache");
        console.log("All AniList caches have been cleared");
      } catch (e) {
        console.error("Error clearing localStorage caches:", e);
      }
    }
  },

  /**
   * Clear cache entry for a specific manga title
   * @param title The manga title to clear from cache
   * @returns boolean True if an entry was cleared, false if no entry was found
   */
  clearCacheEntryForTitle(title: string): boolean {
    // Generate cache key for the title
    const mainKey = generateCacheKey(title);
    let cleared = false;

    // Check if we have this entry in the cache
    if (mangaCache[mainKey]) {
      delete mangaCache[mainKey];
      cleared = true;
    }

    // Try alternate forms of the title (English title/native title)
    // This should only match EXACT English/Native titles, not partial matches
    const titleLower = title.toLowerCase().trim();

    // Track entries to remove (to avoid modifying while iterating)
    const keysToRemove: string[] = [];

    // Look for entries that may be this exact manga but stored under a different title variant
    Object.keys(mangaCache).forEach((key) => {
      if (key === mainKey) return; // Skip the main key we already handled

      // Check if this cache entry is for this specific manga (by exact title match)
      const entries = mangaCache[key].manga;

      for (const manga of entries) {
        if (!manga.title) continue;

        // Only compare exact matches for English/romaji titles
        const romajiTitle = manga.title.romaji
          ? manga.title.romaji.toLowerCase().trim()
          : "";
        const englishTitle = manga.title.english
          ? manga.title.english.toLowerCase().trim()
          : "";

        // Only delete if it's an exact title match, not partial matches
        if (
          (romajiTitle && romajiTitle === titleLower) ||
          (englishTitle && englishTitle === titleLower)
        ) {
          keysToRemove.push(key);
          break; // No need to check other manga in this entry
        }
      }
    });

    // Remove the entries outside the loop to avoid concurrent modification
    if (keysToRemove.length > 0) {
      keysToRemove.forEach((key) => {
        delete mangaCache[key];
      });
      cleared = true;
    }

    // Save the updated cache if we cleared anything
    if (cleared) {
      saveCache();
    }

    return cleared;
  },

  /**
   * Clear cache entries for multiple manga titles at once
   * @param titles Array of manga titles to clear from cache
   * @returns number Number of cache entries cleared
   */
  clearCacheForTitles(titles: string[]): number {
    if (!titles || titles.length === 0) return 0;

    console.log(`Clearing cache for ${titles.length} manga titles...`);
    let entriesCleared = 0;
    let notFoundCount = 0;

    // Process all titles in a batch
    titles.forEach((title) => {
      if (this.clearCacheEntryForTitle(title)) {
        entriesCleared++;
      } else {
        notFoundCount++;
      }
    });

    console.log(
      `Cleared ${entriesCleared} cache entries (${notFoundCount} titles had no existing cache entries)`,
    );
    return entriesCleared;
  },

  clearAllCaches() {
    // Clear in-memory cache
    Object.keys(mangaCache).forEach((key) => {
      delete mangaCache[key];
    });

    // Clear localStorage caches
    try {
      localStorage.removeItem("anilist_manga_cache");
      localStorage.removeItem("anilist_search_cache");
      console.log("All AniList caches cleared successfully");
    } catch (e) {
      console.error("Error clearing localStorage caches:", e);
    }

    return this.getCacheStatus();
  },

  printCacheKeysFor(title: string) {
    const key = generateCacheKey(title);
    console.log(`Cache key for "${title}": ${key}`);

    // Check if we have a cache entry for this title
    if (mangaCache[key]) {
      console.log(
        `Found in-memory cache entry for "${title}" with ${mangaCache[key].manga.length} results`,
      );
    } else {
      console.log(`No in-memory cache entry found for "${title}"`);
    }

    return key;
  },

  dumpCache() {
    return {
      ...mangaCache,
    };
  },
};

/**
 * Fetch manga by IDs in batches
 */
export async function getBatchedMangaIds(
  ids: number[],
  token?: string,
  shouldCancel?: () => boolean,
  abortSignal?: AbortSignal,
): Promise<AniListManga[]> {
  if (!ids.length) return [];

  // Check for cancellation
  if (shouldCancel && shouldCancel()) {
    throw new Error("Operation cancelled by user");
  }

  // Abort if signal is aborted
  if (abortSignal && abortSignal.aborted) {
    throw new Error("Operation aborted by abort signal");
  }

  const results: AniListManga[] = [];
  const batchSize = 25; // AniList allows 25 ids per request

  // Process in batches to avoid overloading the API
  for (let i = 0; i < ids.length; i += batchSize) {
    // Check for cancellation between batches
    if (shouldCancel && shouldCancel()) {
      throw new Error("Operation cancelled by user");
    }

    // Abort if signal is aborted
    if (abortSignal && abortSignal.aborted) {
      throw new Error("Operation aborted by abort signal");
    }

    const batchIds = ids.slice(i, i + batchSize);
    try {
      const batchResults = await getMangaByIds(batchIds, token, abortSignal);
      results.push(...batchResults);
    } catch (error) {
      console.error(
        `Error fetching manga batch ${i} to ${i + batchSize}:`,
        error,
      );
      // Continue with next batch even if one fails
    }
  }

  return results;
}

/**
 * Calculate confidence percentage from match score
 * Converts the 0-1 match score to a 0-100 confidence percentage
 * Now uses more conservative thresholds to avoid inflated confidence scores
 */
function calculateConfidence(searchTitle: string, manga: AniListManga): number {
  // Calculate the match score first - we use search term and manga
  const score = calculateMatchScore(manga, searchTitle);

  if (score <= 0) {
    // No match found
    return 0;
  } else if (score >= 0.95) {
    // Almost perfect match - very high confidence, but capped at 95% to be cautious
    return 95;
  } else if (score >= 0.85) {
    // Strong match - high confidence (85-90%)
    return 85 + (score - 0.85) * 50;
  } else if (score >= 0.7) {
    // Good match - medium-high confidence (75-85%)
    return 75 + (score - 0.7) * 67;
  } else if (score >= 0.5) {
    // Reasonable match - medium confidence (60-75%)
    return 60 + (score - 0.5) * 75;
  } else if (score >= 0.3) {
    // Weak match - low confidence (40-60%)
    return 40 + (score - 0.3) * 100;
  } else {
    // Very weak match - very low confidence (10-40%)
    return Math.max(10, score * 100);
  }
}

/**
 * Clear cache for multiple manga titles at once
 * Use this when doing a batch rematch operation with bypassCache=true
 * @param titles List of manga titles to clear from cache
 * @returns Object with count of cleared entries and remaining cache size
 */
export function clearCacheForTitles(titles: string[]): {
  clearedCount: number;
  remainingCacheSize: number;
  titlesWithNoCache: number;
} {
  console.log(`Clearing cache for ${titles.length} manga titles...`);

  let clearedCount = 0;
  let titlesWithNoCache = 0;

  // Clear each title's cache entry
  for (const title of titles) {
    const cacheKey = generateCacheKey(title);

    if (mangaCache[cacheKey]) {
      delete mangaCache[cacheKey];
      clearedCount++;
    } else {
      titlesWithNoCache++;
    }
  }

  // Save the updated cache to localStorage
  if (clearedCount > 0) {
    saveCache();
  }

  console.log(
    `Cleared ${clearedCount} cache entries (${titlesWithNoCache} titles had no existing cache entries)`,
  );

  return {
    clearedCount,
    remainingCacheSize: Object.keys(mangaCache).length,
    titlesWithNoCache,
  };
}
