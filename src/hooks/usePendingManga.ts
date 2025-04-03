import { useState, useEffect } from "react";
import { KenmeiManga } from "../api/kenmei/types";
import { MangaMatchResult } from "../api/anilist/types";
import { STORAGE_KEYS, storage } from "../utils/storage";

/**
 * Custom hook to manage pending manga that need to be processed
 */
export const usePendingManga = () => {
  const [pendingManga, setPendingManga] = useState<KenmeiManga[]>([]);

  // Debug effect for pendingManga
  useEffect(() => {
    console.log(
      `pendingManga state updated: ${pendingManga.length} manga pending`,
    );
  }, [pendingManga]);

  // Persist pendingManga on unmount if process wasn't completed
  useEffect(() => {
    return () => {
      // Only save if we have pending manga and we're not in an active process
      if (pendingManga.length > 0 && !window.matchingProcessState?.isRunning) {
        console.log(
          `Component unmounting - ensuring ${pendingManga.length} pending manga are saved to storage`,
        );
        // Save the current pending manga to ensure it persists
        storage.setItem(
          STORAGE_KEYS.PENDING_MANGA,
          JSON.stringify(pendingManga),
        );
      }
    };
  }, [pendingManga]);

  /**
   * Save pending manga to storage
   */
  const savePendingManga = (mangaList: KenmeiManga[]) => {
    try {
      if (mangaList.length > 0) {
        console.log(
          `Saving ${mangaList.length} unprocessed manga for potential resume`,
        );
        storage.setItem(STORAGE_KEYS.PENDING_MANGA, JSON.stringify(mangaList));
        setPendingManga(mangaList);
        console.log(
          `Successfully saved ${mangaList.length} pending manga to storage`,
        );
      } else {
        // Clear pending manga when empty
        console.log("Clearing pending manga from storage");
        storage.removeItem(STORAGE_KEYS.PENDING_MANGA);
        setPendingManga([]);
        console.log("Successfully cleared pending manga from storage");
      }
    } catch (error) {
      console.error("Failed to save pending manga to storage:", error);
    }
  };

  /**
   * Calculate pending manga that still need to be processed
   */
  const calculatePendingManga = (
    processedResults: MangaMatchResult[],
    allManga: KenmeiManga[],
  ) => {
    // Create a set of all processed manga IDs for faster lookup
    const processedIds = new Set(processedResults.map((r) => r.kenmeiManga.id));

    // Find manga that haven't been processed yet
    const pendingManga = allManga.filter((m) => !processedIds.has(m.id));

    if (pendingManga.length > 0) {
      console.log(
        `Found ${pendingManga.length} manga that still need to be processed`,
      );
    }

    return pendingManga;
  };

  /**
   * Load pending manga from storage
   */
  const loadPendingManga = (): KenmeiManga[] | null => {
    console.log("Checking for pending manga in storage...");
    const pendingMangaJson = storage.getItem(STORAGE_KEYS.PENDING_MANGA);

    if (pendingMangaJson) {
      try {
        const pendingMangaData = JSON.parse(pendingMangaJson) as KenmeiManga[];
        if (pendingMangaData.length > 0) {
          console.log(
            `Found ${pendingMangaData.length} pending manga from interrupted operation`,
          );
          setPendingManga(pendingMangaData);
          console.log("Setting pendingManga state with found pending manga");
          return pendingMangaData;
        } else {
          console.log("Pending manga list was empty");
        }
      } catch (e) {
        console.error("Failed to parse pending manga from storage:", e);
      }
    } else {
      console.log("No pending manga found in storage");
    }

    return null;
  };

  return {
    pendingManga,
    setPendingManga,
    savePendingManga,
    calculatePendingManga,
    loadPendingManga,
  };
};
