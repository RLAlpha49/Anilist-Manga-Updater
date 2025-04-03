// Define the window interface for TypeScript
declare global {
  interface Window {
    electronStore: {
      getItem: (key: string) => Promise<string | null>;
      setItem: (key: string, value: string) => Promise<boolean>;
      removeItem: (key: string) => Promise<boolean>;
      clear: () => Promise<boolean>;
    };
  }
}

// Cache to avoid redundant storage operations
const storageCache: Record<string, string> = {};

/**
 * Storage utility to abstract storage operations
 * This replaces direct localStorage usage with electron-store for persistence
 */
export const storage = {
  /**
   * Get an item from storage
   * @param key The key of the item to get
   * @returns The stored value or null if not found
   */
  getItem: (key: string): string | null => {
    try {
      // Check cache first to avoid redundant reads
      if (key in storageCache) {
        return storageCache[key];
      }

      // For compatibility with existing code, we need to return synchronously
      // But electronStore API is asynchronous, so we fall back to localStorage
      const value = localStorage.getItem(key);

      // Cache the value
      if (value !== null) {
        storageCache[key] = value;
      }

      // Asynchronously update from electron-store if available (won't affect current return)
      if (window.electronStore) {
        window.electronStore.getItem(key).catch((error) => {
          // Only log errors in development
          if (process.env.NODE_ENV === "development") {
            console.error(
              `Error retrieving ${key} from electron-store:`,
              error,
            );
          }
        });
      }

      return value;
    } catch (error) {
      console.error(`Error getting item from storage: ${key}`, error);
      return null;
    }
  },

  /**
   * Set an item in storage
   * @param key The key to store the value under
   * @param value The value to store
   */
  setItem: (key: string, value: string): void => {
    try {
      // Check if value changed to avoid redundant operations
      if (storageCache[key] === value) {
        return;
      }

      // Update cache
      storageCache[key] = value;

      // Store in localStorage for compatibility
      localStorage.setItem(key, value);

      // Also store in electronStore if available
      if (window.electronStore) {
        window.electronStore.setItem(key, value).catch((error) => {
          // Only log errors in development
          if (process.env.NODE_ENV === "development") {
            console.error(`Error storing ${key} in electron-store:`, error);
          }
        });
      }
    } catch (error) {
      console.error(`Error setting item in storage: ${key}`, error);
    }
  },

  /**
   * Remove an item from storage
   * @param key The key of the item to remove
   */
  removeItem: (key: string): void => {
    try {
      // Remove from cache
      delete storageCache[key];

      // Remove from localStorage for compatibility
      localStorage.removeItem(key);

      // Also remove from electronStore if available
      if (window.electronStore) {
        window.electronStore.removeItem(key).catch((error) => {
          // Only log errors in development
          if (process.env.NODE_ENV === "development") {
            console.error(`Error removing ${key} from electron-store:`, error);
          }
        });
      }
    } catch (error) {
      console.error(`Error removing item from storage: ${key}`, error);
    }
  },

  /**
   * Clear all items from storage
   */
  clear: (): void => {
    try {
      // Clear cache
      Object.keys(storageCache).forEach((key) => {
        delete storageCache[key];
      });

      // Clear localStorage for compatibility
      localStorage.clear();

      // Also clear electronStore if available
      if (window.electronStore) {
        window.electronStore.clear().catch((error) => {
          // Only log errors in development
          if (process.env.NODE_ENV === "development") {
            console.error("Error clearing electron-store:", error);
          }
        });
      }
    } catch (error) {
      console.error("Error clearing storage", error);
    }
  },
};

// Storage keys
export const STORAGE_KEYS = {
  KENMEI_DATA: "kenmei_data",
  IMPORT_STATS: "import_stats",
  MATCH_RESULTS: "match_results",
  CACHE_VERSION: "cache_version",
};

// Current cache version - increment this when incompatible changes are made to the data structure
export const CURRENT_CACHE_VERSION = 1;

/**
 * Save Kenmei manga data to storage
 * @param data The Kenmei data to save
 */
export function saveKenmeiData(data: any): void {
  try {
    storage.setItem(STORAGE_KEYS.KENMEI_DATA, JSON.stringify(data));

    // Also save import stats for quick access on dashboard
    const stats = {
      total: data.manga?.length || 0,
      timestamp: new Date().toISOString(),
      statusCounts: getStatusCountsFromData(data),
    };

    storage.setItem(STORAGE_KEYS.IMPORT_STATS, JSON.stringify(stats));

    // Save the current cache version if not already saved
    if (!storage.getItem(STORAGE_KEYS.CACHE_VERSION)) {
      storage.setItem(
        STORAGE_KEYS.CACHE_VERSION,
        CURRENT_CACHE_VERSION.toString(),
      );
    }
  } catch (error) {
    console.error("Error saving Kenmei data to storage", error);
  }
}

/**
 * Get Kenmei manga data from storage
 * @returns The saved Kenmei data or null if not found
 */
export function getKenmeiData(): any {
  try {
    const data = storage.getItem(STORAGE_KEYS.KENMEI_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error retrieving Kenmei data from storage", error);
    return null;
  }
}

/**
 * Get import statistics from storage
 * @returns The import stats or null if not found
 */
export function getImportStats(): any {
  try {
    const stats = storage.getItem(STORAGE_KEYS.IMPORT_STATS);
    return stats ? JSON.parse(stats) : null;
  } catch (error) {
    console.error("Error retrieving import stats from storage", error);
    return null;
  }
}

/**
 * Calculate status counts from Kenmei data
 * @param data The Kenmei data
 * @returns An object with counts for each status
 */
function getStatusCountsFromData(data: any): Record<string, number> {
  if (!data?.manga?.length) return {};

  return data.manga.reduce(
    (acc: Record<string, number>, manga: any) => {
      const status = manga.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
}

/**
 * Get saved match results from storage
 * @returns The saved match results or null if not found or incompatible
 */
export function getSavedMatchResults() {
  try {
    // Check cache version compatibility
    const savedVersion = parseInt(
      storage.getItem(STORAGE_KEYS.CACHE_VERSION) || "0",
      10,
    );
    if (savedVersion !== CURRENT_CACHE_VERSION && savedVersion !== 0) {
      console.warn(
        `Cache version mismatch. Saved: ${savedVersion}, Current: ${CURRENT_CACHE_VERSION}`,
      );
      return null; // Consider the cache invalid if versions don't match
    }

    const savedResults = storage.getItem(STORAGE_KEYS.MATCH_RESULTS);
    return savedResults ? JSON.parse(savedResults) : null;
  } catch (error) {
    console.error("Error retrieving saved match results from storage", error);
    return null;
  }
}

/**
 * Merge new match results with existing ones to preserve user progress
 * @param newResults The new matching results
 * @returns Merged results with preserved user progress
 */
export function mergeMatchResults(newResults: any[]) {
  try {
    // Get existing results
    const existingResults = getSavedMatchResults();
    if (
      !existingResults ||
      !Array.isArray(existingResults) ||
      existingResults.length === 0
    ) {
      console.log("No existing match results to merge, using new results");
      return newResults;
    }

    console.log(
      `Merging ${newResults.length} new results with ${existingResults.length} existing results`,
    );

    // Create a map of existing results for quick lookup by both ID and title
    const existingById = new Map();
    const existingByTitle = new Map();

    existingResults.forEach((match) => {
      if (match.kenmeiManga?.id) {
        existingById.set(match.kenmeiManga.id.toString(), match);
      }
      if (match.kenmeiManga?.title) {
        existingByTitle.set(match.kenmeiManga.title.toLowerCase(), match);
      }
    });

    // Process new results, preserving user progress from existing matches
    const mergedResults = newResults.map((newMatch) => {
      // Try to find existing match by ID first
      let existingMatch = newMatch.kenmeiManga?.id
        ? existingById.get(newMatch.kenmeiManga.id.toString())
        : undefined;

      // If not found by ID, try title (case insensitive)
      if (!existingMatch && newMatch.kenmeiManga?.title) {
        existingMatch = existingByTitle.get(
          newMatch.kenmeiManga.title.toLowerCase(),
        );
      }

      // If we found a match AND it has user progress (not pending), preserve it
      if (existingMatch && existingMatch.status !== "pending") {
        console.log(
          `Preserving existing ${existingMatch.status} match for "${newMatch.kenmeiManga?.title}"`,
        );

        // Take new anilist matches but keep user's selected match and status
        return {
          ...newMatch,
          status: existingMatch.status,
          selectedMatch: existingMatch.selectedMatch,
          matchDate: existingMatch.matchDate,
        };
      }

      // Otherwise use the new match
      return newMatch;
    });

    console.log(`Merged results: ${mergedResults.length} total items`);

    // Check how many preserved matches we have
    const preservedCount = mergedResults.filter(
      (m) => m.status !== "pending",
    ).length;
    console.log(
      `Preserved ${preservedCount} user reviews from previous imports`,
    );

    return mergedResults;
  } catch (error) {
    console.error("Error merging match results", error);
    return newResults; // Fall back to new results on error
  }
}
