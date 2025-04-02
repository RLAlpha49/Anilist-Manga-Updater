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
