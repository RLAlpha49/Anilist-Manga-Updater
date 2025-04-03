import { ipcMain } from "electron";
import fetch from "node-fetch";

const API_URL = "https://graphql.anilist.co";

// Cache settings
const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 minutes

// Simple in-memory cache
interface Cache<T> {
  [key: string]: {
    data: T;
    timestamp: number;
  };
}

// Search cache
const searchCache: Cache<Record<string, unknown>> = {};

/**
 * Make a GraphQL request to the AniList API
 * @param query GraphQL query or mutation
 * @param variables Variables for the query
 * @param token Optional access token for authenticated requests
 * @returns Promise resolving to the response data
 */
async function requestAniList(
  query: string,
  variables?: Record<string, unknown>,
  token?: string,
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw {
      status: response.status,
      statusText: response.statusText,
      errors: errorData.errors,
      message: errorData.errors?.[0]?.message || response.statusText,
    };
  }

  return await response.json();
}

/**
 * Generate a cache key from search parameters
 */
function generateCacheKey(
  query: string,
  variables: Record<string, unknown> = {},
): string {
  return `${query.substr(0, 50)}_${JSON.stringify(variables)}`;
}

/**
 * Check if a cache entry is valid
 */
function isCacheValid<T>(cache: Cache<T>, key: string): boolean {
  const entry = cache[key];
  if (!entry) return false;

  const now = Date.now();
  return now - entry.timestamp < CACHE_EXPIRATION;
}

/**
 * Setup IPC handlers for AniList API requests
 */
export function setupAniListAPI() {
  // Handle graphQL requests
  ipcMain.handle("anilist:request", async (_, query, variables, token) => {
    try {
      console.log("Handling AniList API request in main process");

      // Check if it's a search request and if we should use cache
      const isSearchQuery = query.includes("Page(") && variables?.search;

      if (isSearchQuery) {
        const cacheKey = generateCacheKey(query, variables);

        if (isCacheValid(searchCache, cacheKey)) {
          console.log(`Using cached search results for: ${variables.search}`);
          return {
            success: true,
            data: searchCache[cacheKey].data,
          };
        }
      }

      const response = await requestAniList(query, variables, token);

      // Cache search results
      if (isSearchQuery && response.data) {
        const cacheKey = generateCacheKey(query, variables);
        searchCache[cacheKey] = {
          data: response,
          timestamp: Date.now(),
        };
      }

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error("Error in anilist:request:", error);
      return {
        success: false,
        error,
      };
    }
  });

  // Handle token exchange
  ipcMain.handle("anilist:exchangeToken", async (_, params) => {
    try {
      const { clientId, clientSecret, redirectUri, code } = params;

      // Format the request body
      const tokenRequestBody = {
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      };

      const response = await fetch("https://anilist.co/api/v2/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(tokenRequestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API error: ${response.status} ${errorData}`);
      }

      const data = await response.json();

      return {
        success: true,
        token: data,
      };
    } catch (error) {
      console.error("Error in anilist:exchangeToken:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Clear search cache
  ipcMain.handle("anilist:clearCache", (_, searchQuery) => {
    if (searchQuery) {
      // Clear specific cache entries
      Object.keys(searchCache).forEach((key) => {
        if (key.includes(searchQuery)) {
          delete searchCache[key];
        }
      });
    } else {
      // Clear all cache
      Object.keys(searchCache).forEach((key) => {
        delete searchCache[key];
      });
    }

    return { success: true };
  });
}
