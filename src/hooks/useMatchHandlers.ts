import { useCallback } from "react";
import { KenmeiManga } from "../api/kenmei/types";
import { AniListManga, MangaMatchResult } from "../api/anilist/types";
import { STORAGE_KEYS, storage } from "../utils/storage";

export const useMatchHandlers = (
  matchResults: MangaMatchResult[],
  setMatchResults: React.Dispatch<React.SetStateAction<MangaMatchResult[]>>,
  setSearchTarget: React.Dispatch<
    React.SetStateAction<KenmeiManga | undefined>
  >,
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setBypassCache: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  /**
   * Find the index of a match in the results
   */
  const findMatchIndex = useCallback(
    (match: MangaMatchResult | KenmeiManga) => {
      // Determine if we're dealing with a MangaMatchResult or a KenmeiManga
      const kenmeiManga = "kenmeiManga" in match ? match.kenmeiManga : match;

      // First try to find the match by ID
      let index = matchResults.findIndex(
        (m) => m.kenmeiManga.id === kenmeiManga.id,
      );

      // If not found by ID, try alternative methods
      if (index === -1) {
        console.log(
          `Could not find match with ID ${kenmeiManga.id}, trying fallback methods...`,
        );

        // Fallback 1: Try finding by exact title match
        index = matchResults.findIndex(
          (m) => m.kenmeiManga.title === kenmeiManga.title,
        );

        if (index === -1) {
          // Fallback 2: Try finding by case-insensitive title match
          index = matchResults.findIndex(
            (m) =>
              m.kenmeiManga.title.toLowerCase() ===
              kenmeiManga.title.toLowerCase(),
          );

          if (index === -1) {
            console.error(
              `Could not find match for "${kenmeiManga.title}" to update`,
            );
            return -1;
          } else {
            console.log(
              `Found match by case-insensitive title at index ${index}`,
            );
          }
        } else {
          console.log(`Found match by exact title at index ${index}`);
        }
      } else {
        console.log(`Found match by ID at index ${index}`);
      }

      return index;
    },
    [matchResults],
  );

  /**
   * Handle manual search request
   */
  const handleManualSearch = useCallback(
    (manga: KenmeiManga) => {
      console.log("handleManualSearch called with manga:", manga);

      // Find the match
      const index = findMatchIndex(manga);
      if (index === -1) return;

      // First close any existing panel to ensure it fully remounts
      setIsSearchOpen(false);

      // Small delay to ensure state updates before reopening
      setTimeout(() => {
        setSearchTarget(manga);
        setIsSearchOpen(true);

        // Enable bypass cache for manual searches
        setBypassCache(true);
      }, 10); // Very small delay is sufficient for React to process state updates
    },
    [findMatchIndex, setIsSearchOpen, setSearchTarget, setBypassCache],
  );

  /**
   * Update match results and save to storage
   */
  const updateMatchResults = useCallback(
    (updatedResults: MangaMatchResult[]) => {
      // Set the state with the new array
      setMatchResults(updatedResults);

      // Save to storage to ensure it's consistent
      try {
        storage.setItem(
          STORAGE_KEYS.MATCH_RESULTS,
          JSON.stringify(updatedResults),
        );
        console.log("Successfully saved updated match results to storage");
      } catch (storageError) {
        console.error("Failed to save match results to storage:", storageError);
      }
    },
    [setMatchResults],
  );

  /**
   * Handle accepting a match
   */
  const handleAcceptMatch = useCallback(
    (match: MangaMatchResult) => {
      console.log("handleAcceptMatch called with match:", match);

      // Find the match
      const index = findMatchIndex(match);
      if (index === -1) return;

      console.log(
        `Accepting match for ${match.kenmeiManga.title}, current status: ${match.status}`,
      );

      // Create a copy of the results and update the status
      const updatedResults = [...matchResults];

      // Create a new object reference to ensure React detects the change
      const updatedMatch = {
        ...match,
        status: "matched" as const,
        selectedMatch: match.anilistMatches?.[0]?.manga,
        matchDate: new Date(),
      };

      // Update the array with the new object
      updatedResults[index] = updatedMatch;

      console.log(
        `Updated match status to: ${updatedMatch.status}, title: ${updatedMatch.kenmeiManga.title}`,
      );

      updateMatchResults(updatedResults);
    },
    [findMatchIndex, matchResults, updateMatchResults],
  );

  /**
   * Handle rejecting/skipping a match
   */
  const handleRejectMatch = useCallback(
    (match: MangaMatchResult) => {
      console.log("handleRejectMatch called with match:", match);

      // Find the match
      const index = findMatchIndex(match);
      if (index === -1) return;

      console.log(
        `Skipping match for ${match.kenmeiManga.title}, current status: ${match.status}`,
      );

      // Create a copy of the results and update the status
      const updatedResults = [...matchResults];

      // Create a new object reference to ensure React detects the change
      const updatedMatch = {
        ...match,
        status: "skipped" as const,
        selectedMatch: undefined,
        matchDate: new Date(),
      };

      // Update the array with the new object
      updatedResults[index] = updatedMatch;

      console.log(
        `Updated match status to: ${updatedMatch.status}, title: ${updatedMatch.kenmeiManga.title}`,
      );

      updateMatchResults(updatedResults);
    },
    [findMatchIndex, matchResults, updateMatchResults],
  );

  /**
   * Handle selecting an alternative match
   */
  const handleSelectAlternative = useCallback(
    (match: MangaMatchResult, alternativeIndex: number) => {
      console.log(
        `Swapping main match with alternative #${alternativeIndex} for "${match.kenmeiManga.title}"`,
      );

      // Find the match
      const index = findMatchIndex(match);
      if (index === -1) return;

      // Get the actual match from the most current state
      const currentMatch = matchResults[index];

      // Safety check
      if (
        !currentMatch.anilistMatches ||
        alternativeIndex >= currentMatch.anilistMatches.length
      ) {
        console.error(
          `Cannot select alternative: index ${alternativeIndex} out of bounds or no alternatives available`,
        );
        return;
      }

      // Get the selected alternative from the CURRENT match object, not the passed match parameter
      const selectedAlternative = currentMatch.anilistMatches[alternativeIndex];

      if (!selectedAlternative) {
        console.error(`Alternative at index ${alternativeIndex} is undefined`);
        return;
      }

      // Store the current main match information
      const currentMainMatch = currentMatch.selectedMatch;

      if (!currentMainMatch) {
        console.error(`Current main match is undefined, cannot perform swap`);
        return;
      }

      // Find the confidence of the current main match by looking at the first alternative
      const currentMainConfidence =
        currentMatch.anilistMatches?.[0]?.confidence;

      console.log(
        `Swapping main match "${
          currentMainMatch?.title?.english ||
          currentMainMatch?.title?.romaji ||
          "Unknown"
        }" with alternative "${
          selectedAlternative.manga.title?.english ||
          selectedAlternative.manga.title?.romaji ||
          "Unknown"
        }" (confidence: ${selectedAlternative.confidence}%)`,
      );

      // Create a deep copy of the alternatives array
      const newAnilistMatches = [
        ...currentMatch.anilistMatches.map((m) => ({ ...m })),
      ];

      // Remove the selected alternative from the array (must happen before we modify anything else)
      newAnilistMatches.splice(alternativeIndex, 1);

      // Create a new match entry for the current main that will go into alternatives
      const mainMatchAsAlternative = {
        id: currentMainMatch.id,
        manga: { ...currentMainMatch },
        confidence: currentMainConfidence || 0,
      };

      // Add the current main match as the first alternative
      newAnilistMatches.unshift(mainMatchAsAlternative);

      console.log(
        `Swapped matches: Previous main is now alternative at position 0, selected alternative is now main`,
      );

      // Create a copy of the results and update with the swap
      const updatedResults = [...matchResults];
      updatedResults[index] = {
        ...currentMatch,
        // Keep the existing status
        selectedMatch: { ...selectedAlternative.manga },
        // Update the anilistMatches array with our swapped version
        anilistMatches: newAnilistMatches,
        matchDate: new Date(),
      };

      updateMatchResults(updatedResults);
    },
    [findMatchIndex, matchResults, updateMatchResults],
  );

  /**
   * Handle resetting a match status back to pending
   */
  const handleResetToPending = useCallback(
    (match: MangaMatchResult) => {
      console.log("handleResetToPending called with match:", match);

      // Find the match
      const index = findMatchIndex(match);
      if (index === -1) return;

      console.log(
        `Resetting match for ${match.kenmeiManga.title} from ${match.status} to pending`,
      );

      // Create a copy of the results and update the status
      const updatedResults = [...matchResults];

      // Preserve the existing match data but reset status to pending
      const updatedMatch = {
        ...match,
        status: "pending" as const,
        matchDate: new Date(),
      };

      // Update the array with the new object
      updatedResults[index] = updatedMatch;

      console.log(
        `Updated match status from ${match.status} to pending for: ${updatedMatch.kenmeiManga.title}`,
      );

      updateMatchResults(updatedResults);
    },
    [findMatchIndex, matchResults, updateMatchResults],
  );

  /**
   * Handle selecting a manga from the search panel
   */
  const handleSelectSearchMatch = useCallback(
    (manga: AniListManga) => {
      const searchTarget = setSearchTarget((current) => current);
      if (!searchTarget) {
        console.error("No manga target was set for search");
        return;
      }

      console.log("Handling selection of manga from search:", manga.title);

      // Find the match
      const matchIndex = findMatchIndex(searchTarget);
      if (matchIndex === -1) return;

      // Get the existing match
      const existingMatch = matchResults[matchIndex];
      console.log(
        `Updating manga: "${existingMatch.kenmeiManga.title}" with selected match: "${manga.title.english || manga.title.romaji}"`,
      );

      // Create a copy of the results
      const updatedResults = [...matchResults];

      // Check if the selected manga is already one of the alternatives
      let alternativeIndex = -1;
      if (
        existingMatch.anilistMatches &&
        existingMatch.anilistMatches.length > 0
      ) {
        alternativeIndex = existingMatch.anilistMatches.findIndex(
          (match) => match.manga.id === manga.id,
        );
      }

      if (alternativeIndex >= 0 && existingMatch.anilistMatches) {
        // The selected manga is already in the alternatives, so just switch to it
        console.log(
          `Selected manga is alternative #${alternativeIndex}, switching instead of creating manual match`,
        );

        updatedResults[matchIndex] = {
          ...existingMatch,
          status: "matched", // Use "matched" status instead of "manual" since it's an existing alternative
          selectedMatch: existingMatch.anilistMatches[alternativeIndex].manga,
          matchDate: new Date(),
        };
      } else {
        // It's a new match not in the alternatives, create a manual match
        updatedResults[matchIndex] = {
          ...existingMatch, // Keep all existing properties
          status: "manual", // Change status to manual
          selectedMatch: manga, // Update with the new selected match
          matchDate: new Date(),
        };
      }

      // Set the results first before clearing the search state
      updateMatchResults(updatedResults);

      // Then close the search panel
      setIsSearchOpen(false);
      setSearchTarget(undefined);
    },
    [
      findMatchIndex,
      matchResults,
      updateMatchResults,
      setIsSearchOpen,
      setSearchTarget,
    ],
  );

  return {
    handleManualSearch,
    handleAcceptMatch,
    handleRejectMatch,
    handleSelectAlternative,
    handleResetToPending,
    handleSelectSearchMatch,
  };
};
