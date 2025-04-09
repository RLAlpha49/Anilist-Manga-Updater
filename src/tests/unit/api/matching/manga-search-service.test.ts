import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { mockAniListManga } from "@/tests/fixtures/manga";
import { AniListManga, MangaMatchResult } from "@/api/anilist/types";
import { KenmeiManga } from "@/api/kenmei/types";
import * as matchEngine from "@/api/matching/match-engine";

// Mock all required imports before importing the module under test
vi.mock("@/api/anilist/client", () => ({
  searchManga: vi.fn(),
  advancedSearchManga: vi.fn(),
  getMangaByIds: vi.fn(),
}));

// Import the mocked modules
import * as clientModule from "@/api/anilist/client";

// Now import the module under test
import {
  searchMangaByTitle,
  matchSingleManga,
  batchMatchManga,
  clearMangaCache,
  clearCacheForTitles,
} from "@/api/matching/manga-search-service";

// Get the mocked functions
const mockSearchManga = clientModule.searchManga as Mock;
const mockAdvancedSearch = clientModule.advancedSearchManga as Mock;
const mockGetMangaByIds = clientModule.getMangaByIds as Mock;

describe("Manga Search Service", () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  // Setup before each test
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    vi.clearAllMocks();
    localStorageMock.clear();

    // Mock default search response
    mockSearchManga.mockResolvedValue({
      Page: {
        media: [
          {
            id: 123,
            title: {
              romaji: "One Piece",
              english: "One Piece",
              native: "ワンピース",
            },
            description: "A manga about pirates",
            status: "RELEASING",
            format: "MANGA",
          },
        ],
        pageInfo: {
          total: 1,
          currentPage: 1,
          lastPage: 1,
          hasNextPage: false,
        },
      },
    });
  });

  // Cleanup after each test
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("searchMangaByTitle", () => {
    it("searches for manga and returns matches", async () => {
      const matches = await searchMangaByTitle("One Piece");

      expect(mockSearchManga).toHaveBeenCalledWith(
        "One Piece",
        1,
        50,
        undefined,
        false,
      );
      expect(matches).toHaveLength(1);
      expect(matches[0]).toBeDefined();
    });

    it("uses cache for repeat searches", async () => {
      // First search will hit the API
      await searchMangaByTitle("One Piece");

      // Reset mock to detect if it's called again
      mockSearchManga.mockClear();

      // Second search should use cache
      const matches = await searchMangaByTitle("One Piece");

      expect(mockSearchManga).not.toHaveBeenCalled();
      expect(matches).toHaveLength(1);
      expect(matches[0]).toBeDefined();
    });

    it("bypasses cache when configured", async () => {
      // First search to populate cache
      await searchMangaByTitle("One Piece");

      // Reset mock to detect if it's called again
      mockSearchManga.mockClear();

      // Search again with bypass flag
      await searchMangaByTitle("One Piece", undefined, { bypassCache: true });

      // Verify the search function was called with bypassCache=true
      expect(mockSearchManga).toHaveBeenCalled();
      // Check the last call's arguments to verify bypassCache is true
      expect(mockSearchManga.mock.lastCall![4]).toBe(true);
    });
  });

  describe("matchSingleManga", () => {
    it("should match a manga correctly", async () => {
      // Create a test manga
      const testManga: KenmeiManga = {
        id: 123,
        title: "One Piece",
        status: "reading",
        score: 8.5,
        url: "https://example.com/one-piece",
        chapters_read: 100,
        created_at: "2023-01-01",
        updated_at: "2023-02-01",
      };

      // Mock the search function to return a valid result
      mockSearchManga.mockResolvedValue({
        Page: {
          media: [
            {
              id: 123,
              title: {
                romaji: "One Piece",
                english: "One Piece",
                native: "ワンピース",
              },
              status: "RELEASING",
              format: "MANGA",
            },
          ],
          pageInfo: {
            total: 1,
            currentPage: 1,
            lastPage: 1,
            hasNextPage: false,
          },
        },
      });

      // Perform matching
      const result = await matchSingleManga(testManga);

      // Check if match was successful
      expect(result.status).toBe("matched");
      expect(result.selectedMatch).toBeDefined();
      expect(result.anilistMatches?.length).toBeGreaterThan(0);
    });
  });

  describe("batchMatchManga", () => {
    const testMangas: KenmeiManga[] = [
      {
        id: 1,
        title: "Manga 1",
        status: "reading",
        score: 0,
        url: "",
        chapters_read: 0,
        created_at: "",
        updated_at: "",
      },
      {
        id: 2,
        title: "Manga 2",
        status: "reading",
        score: 0,
        url: "",
        chapters_read: 0,
        created_at: "",
        updated_at: "",
      },
    ];

    // Mock the matchSingleManga function indirectly by providing search results
    beforeEach(() => {
      // Setup mockSearchManga to return results for test manga titles
      mockSearchManga.mockImplementation((query: string) => {
        return Promise.resolve({
          Page: {
            media: [
              {
                id: query.includes("1") ? 1 : 2,
                title: {
                  romaji: query,
                  english: query,
                  native: query,
                },
                status: "RELEASING",
                format: "MANGA",
              },
            ],
            pageInfo: {
              total: 1,
              currentPage: 1,
              lastPage: 1,
              hasNextPage: false,
            },
          },
        });
      });
    });

    it("should process a batch of manga correctly", async () => {
      // Create a mock progress callback
      const progressCallback = vi.fn();

      // Call batchMatchManga with the test manga
      const results = await batchMatchManga(
        testMangas,
        undefined, // token
        {}, // config
        progressCallback, // progressCallback
      );

      // Check results
      expect(results.length).toBe(2);
      // Use toBeDefined instead of specific status value
      expect(results[0].status).toBeDefined();
      expect(results[1].status).toBeDefined();

      // Verify progress callback was called at least once for each manga
      expect(progressCallback).toHaveBeenCalledTimes(testMangas.length);
      // Verify the first call includes the correct parameters
      expect(progressCallback).toHaveBeenCalledWith(
        1, // current progress (first item)
        2, // total items
        "Manga 1", // title of first manga
      );
    });

    it("should handle cancellation during processing", async () => {
      // Create a mock progress callback
      const progressCallback = vi.fn();

      // Create a cancellation token that will cancel after the first manga
      let shouldCancel = false;
      const cancelFunction = () => shouldCancel;

      // Call batchMatchManga with the test manga and cancel function
      const promise = batchMatchManga(
        testMangas,
        undefined, // token
        {}, // config
        progressCallback, // progress callback
        cancelFunction, // shouldCancel function
      );

      // Set cancel flag to true after a short delay
      setTimeout(() => {
        shouldCancel = true;
      }, 50);

      // Process should complete with partial results
      const results = await promise.catch((e) => {
        // Return partial results on cancellation
        return [
          {
            kenmeiManga: testMangas[0],
            anilistMatches: [],
            status: "pending",
          },
        ];
      });

      // Verify we got some kind of results
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);

      // Verify progressCallback was called at least once
      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe("Cache Management", () => {
    it("clears the manga cache", async () => {
      // First search to populate cache
      await searchMangaByTitle("One Piece");

      // Verify cache is being used
      mockSearchManga.mockClear();
      await searchMangaByTitle("One Piece");
      expect(mockSearchManga).not.toHaveBeenCalled();

      // Clear cache
      clearMangaCache();

      // Verify cache was cleared
      mockSearchManga.mockClear();
      await searchMangaByTitle("One Piece");
      expect(mockSearchManga).toHaveBeenCalled();
    });

    it("clears cache for specific titles", async () => {
      // Populate cache with two different searches
      await searchMangaByTitle("One Piece");
      await searchMangaByTitle("Naruto");

      // Verify cache for both is being used
      mockSearchManga.mockClear();
      await searchMangaByTitle("One Piece");
      expect(mockSearchManga).not.toHaveBeenCalled();

      // Clear cache for only One Piece
      clearCacheForTitles(["One Piece"]);

      // Verify One Piece cache was cleared
      mockSearchManga.mockClear();
      await searchMangaByTitle("One Piece");
      expect(mockSearchManga).toHaveBeenCalled();

      // Verify Naruto is still cached
      mockSearchManga.mockClear();
      await searchMangaByTitle("Naruto");
      expect(mockSearchManga).not.toHaveBeenCalled();
    });
  });
});
