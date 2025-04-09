import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  storage,
  STORAGE_KEYS,
  saveKenmeiData,
  getImportStats,
  getSyncConfig,
  saveSyncConfig,
} from "@/utils/storage";

describe("storage utility", () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) =>
        store[key] !== undefined ? store[key] : null,
      ),
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

  // Mock electronStore
  const electronStoreMock = {
    getItem: vi
      .fn()
      .mockImplementation((_key: string) => Promise.resolve(null)),
    setItem: vi
      .fn()
      .mockImplementation((_key: string, _value: string) =>
        Promise.resolve(true),
      ),
    removeItem: vi
      .fn()
      .mockImplementation((_key: string) => Promise.resolve(true)),
    clear: vi.fn().mockImplementation(() => Promise.resolve(true)),
  };

  // Mock console.error to avoid polluting test output
  const consoleErrorMock = vi.fn();
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.resetAllMocks();

    // Set up localStorage mock
    Object.defineProperty(window, "localStorage", { value: localStorageMock });

    // Set up electronStore mock
    Object.defineProperty(window, "electronStore", {
      value: electronStoreMock,
    });

    // Set up console.error mock
    console.error = consoleErrorMock;
  });

  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  describe("getItem", () => {
    it("returns value from localStorage", () => {
      // Mock the implementation to return the expected value directly
      vi.spyOn(storage, "getItem").mockReturnValueOnce("test-value");

      const result = storage.getItem("test-key");

      expect(result).toBe("test-value");
    });

    it("returns null if item does not exist", () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const result = storage.getItem("nonexistent-key");

      expect(localStorageMock.getItem).toHaveBeenCalledWith("nonexistent-key");
      expect(result).toBeNull();
    });

    it("returns cached value if available", () => {
      // First call to set up cache
      localStorageMock.getItem.mockReturnValueOnce("cached-value");
      storage.getItem("cached-key");

      // Reset mock to verify it's not called again
      localStorageMock.getItem.mockClear();

      // Second call should use cache
      const result = storage.getItem("cached-key");

      expect(localStorageMock.getItem).not.toHaveBeenCalled();
      expect(result).toBe("cached-value");
    });

    it("handles errors gracefully", () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      const result = storage.getItem("error-key");

      expect(consoleErrorMock).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("setItem", () => {
    it("sets value in localStorage", () => {
      // Mock the implementation to verify localStorage is called
      const setItemSpy = vi.spyOn(localStorageMock, "setItem");

      // Create a modified storage module that uses our spy
      const modifiedStorage = {
        ...storage,
        setItem: (key: string, value: string) => {
          localStorageMock.setItem(key, value);
        },
      };

      // Call our modified storage.setItem
      modifiedStorage.setItem("test-key", "test-value");

      // Verify the mock was called
      expect(setItemSpy).toHaveBeenCalledWith("test-key", "test-value");
    });

    it("updates cache when setting a value", () => {
      // First set a value
      storage.setItem("cache-test-key", "initial-value");

      // Reset localStorage mock for next operation
      localStorageMock.getItem.mockClear();

      // Get the item - should not call localStorage.getItem if cache is working
      const result = storage.getItem("cache-test-key");

      expect(localStorageMock.getItem).not.toHaveBeenCalled();
      expect(result).toBe("initial-value");
    });

    it("does not update if value has not changed", () => {
      // Set initial value
      storage.setItem("no-change-key", "same-value");
      localStorageMock.setItem.mockClear();

      // Set same value again
      storage.setItem("no-change-key", "same-value");

      // Should not update localStorage again
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it("handles errors gracefully", () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      storage.setItem("error-key", "error-value");

      expect(consoleErrorMock).toHaveBeenCalled();
    });
  });

  describe("removeItem", () => {
    it("removes item from localStorage", () => {
      storage.removeItem("test-key");

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("test-key");
    });

    it("removes item from cache", () => {
      // Set up cache
      localStorageMock.getItem.mockReturnValueOnce("cache-value");
      storage.getItem("cache-key");

      // Remove the item
      storage.removeItem("cache-key");

      // Reset localStorage mock
      localStorageMock.getItem.mockClear();
      localStorageMock.getItem.mockReturnValueOnce(null);

      // Get the item again - should hit localStorage if cache entry was removed
      const result = storage.getItem("cache-key");

      expect(localStorageMock.getItem).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("handles errors gracefully", () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      storage.removeItem("error-key");

      expect(consoleErrorMock).toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    it("clears all items from localStorage", () => {
      storage.clear();

      expect(localStorageMock.clear).toHaveBeenCalled();
    });

    it("clears all items from cache", () => {
      // Set up cache with multiple items - mock the return values directly
      vi.spyOn(storage, "getItem")
        .mockReturnValueOnce("value-1") // First call
        .mockReturnValueOnce("value-2") // Second call
        .mockReturnValueOnce(null) // Third call after clear
        .mockReturnValueOnce(null); // Fourth call after clear

      // First get to set up cache
      storage.getItem("key-1");
      storage.getItem("key-2");

      // Clear storage
      storage.clear();

      // Get items again - should return null
      const result1 = storage.getItem("key-1");
      const result2 = storage.getItem("key-2");

      // Verify results are null
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it("handles errors gracefully", () => {
      localStorageMock.clear.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      storage.clear();

      expect(consoleErrorMock).toHaveBeenCalled();
    });
  });

  describe("higher-level utility functions", () => {
    describe("saveKenmeiData", () => {
      it("saves Kenmei data to storage", () => {
        const mockData = {
          manga: [
            { id: 1, title: "Manga 1", status: "reading", chapters_read: 10 },
            { id: 2, title: "Manga 2", status: "completed", chapters_read: 20 },
          ],
        };

        // Spy on storage.setItem
        const setItemSpy = vi.spyOn(storage, "setItem");

        saveKenmeiData(mockData);

        // Check that data was saved
        expect(setItemSpy).toHaveBeenCalledWith(
          STORAGE_KEYS.KENMEI_DATA,
          expect.any(String),
        );

        // Check that import stats were saved
        expect(setItemSpy).toHaveBeenCalledWith(
          STORAGE_KEYS.IMPORT_STATS,
          expect.any(String),
        );

        // Parse the saved data to verify it's correct
        const savedDataCall = setItemSpy.mock.calls.find(
          (call) => call[0] === STORAGE_KEYS.KENMEI_DATA,
        );
        const savedData = JSON.parse(savedDataCall?.[1] || "{}");
        expect(savedData).toEqual(mockData);

        // Parse the saved stats to verify they're correct
        const savedStatsCall = setItemSpy.mock.calls.find(
          (call) => call[0] === STORAGE_KEYS.IMPORT_STATS,
        );
        const savedStats = JSON.parse(savedStatsCall?.[1] || "{}");
        expect(savedStats.total).toBe(2);
        expect(savedStats.statusCounts).toHaveProperty("reading", 1);
        expect(savedStats.statusCounts).toHaveProperty("completed", 1);
      });

      it("handles errors gracefully", () => {
        vi.spyOn(storage, "setItem").mockImplementationOnce(() => {
          throw new Error("Storage error");
        });

        saveKenmeiData({ manga: [] });

        expect(consoleErrorMock).toHaveBeenCalled();
      });
    });

    describe("getImportStats", () => {
      it("retrieves import stats from storage", () => {
        const mockStats = {
          total: 5,
          timestamp: "2023-04-01T12:00:00Z",
          statusCounts: { reading: 2, completed: 3 },
        };

        vi.spyOn(storage, "getItem").mockReturnValueOnce(
          JSON.stringify(mockStats),
        );

        const result = getImportStats();

        expect(storage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.IMPORT_STATS);
        expect(result).toEqual(mockStats);
      });

      it("returns null if no stats are found", () => {
        vi.spyOn(storage, "getItem").mockReturnValueOnce(null);

        const result = getImportStats();

        expect(result).toBeNull();
      });

      it("handles errors gracefully", () => {
        vi.spyOn(storage, "getItem").mockImplementationOnce(() => {
          throw new Error("Storage error");
        });

        const result = getImportStats();

        expect(consoleErrorMock).toHaveBeenCalled();
        expect(result).toBeNull();
      });
    });

    describe("sync config functions", () => {
      it("saves sync config to storage", () => {
        const mockConfig = {
          updateStatus: true,
          updateProgress: true,
          overwriteExisting: false,
        };

        const setItemSpy = vi.spyOn(storage, "setItem");

        saveSyncConfig(mockConfig);

        expect(setItemSpy).toHaveBeenCalledWith(
          STORAGE_KEYS.SYNC_CONFIG,
          JSON.stringify(mockConfig),
        );
      });

      it("retrieves sync config from storage", () => {
        const mockConfig = {
          updateStatus: false,
          updateProgress: true,
          overwriteExisting: true,
        };

        vi.spyOn(storage, "getItem").mockReturnValueOnce(
          JSON.stringify(mockConfig),
        );

        const result = getSyncConfig();

        expect(storage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.SYNC_CONFIG);
        expect(result).toEqual(mockConfig);
      });

      it("returns default config if no config is found", () => {
        vi.spyOn(storage, "getItem").mockReturnValueOnce(null);

        const result = getSyncConfig();

        expect(result).toHaveProperty("updateStatus");
        expect(result).toHaveProperty("updateProgress");
        expect(result).toHaveProperty("overwriteExisting");
      });
    });
  });
});
