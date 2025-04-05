/**
 * AniList Synchronization Service
 * Handles batch updates and synchronization with AniList API
 */

import { request } from "./client";
import { UPDATE_MANGA_ENTRY, DELETE_MANGA_ENTRY } from "./mutations";
import { AniListMediaEntry } from "./types";

// Rate limiting constants
const MAX_REQUESTS_PER_MINUTE = 28;
const REQUEST_INTERVAL = 60000 / MAX_REQUESTS_PER_MINUTE; // Time between requests

export interface SyncResult {
  success: boolean;
  mediaId: number;
  error?: string;
  entryId?: number;
}

export interface SyncProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  skipped: number;
}

export interface SyncReport {
  totalEntries: number;
  successfulUpdates: number;
  failedUpdates: number;
  skippedEntries: number;
  errors: {
    mediaId: number;
    error: string;
  }[];
  timestamp: Date;
}

/**
 * Update a single manga entry in AniList
 */
export async function updateMangaEntry(
  entry: AniListMediaEntry,
  token: string,
): Promise<SyncResult> {
  if (!token) {
    return {
      success: false,
      mediaId: entry.mediaId,
      error: "No authentication token provided",
    };
  }

  try {
    const variables = {
      mediaId: entry.mediaId,
      status: entry.status,
      progress: entry.progress || 0,
      private: entry.private || false,
      score: entry.score || 0,
    };

    const response = await request(UPDATE_MANGA_ENTRY, variables, token);

    if (response.data?.SaveMediaListEntry?.id) {
      return {
        success: true,
        mediaId: entry.mediaId,
        entryId: response.data.SaveMediaListEntry.id,
      };
    } else {
      return {
        success: false,
        mediaId: entry.mediaId,
        error: "Update failed: No entry ID returned",
      };
    }
  } catch (error) {
    console.error("Error updating manga entry:", error);
    return {
      success: false,
      mediaId: entry.mediaId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete a manga entry in AniList
 */
export async function deleteMangaEntry(
  entryId: number,
  token: string,
): Promise<{ success: boolean; error?: string }> {
  if (!token) {
    return {
      success: false,
      error: "No authentication token provided",
    };
  }

  try {
    const variables = {
      id: entryId,
    };

    const response = await request(DELETE_MANGA_ENTRY, variables, token);

    if (response.data?.DeleteMediaListEntry?.deleted) {
      return {
        success: true,
      };
    } else {
      return {
        success: false,
        error: "Delete failed: Entry was not deleted",
      };
    }
  } catch (error) {
    console.error("Error deleting manga entry:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Process a batch of manga updates with rate limiting and progress tracking
 */
export async function syncMangaBatch(
  entries: AniListMediaEntry[],
  token: string,
  onProgress?: (progress: SyncProgress) => void,
  abortSignal?: AbortSignal,
): Promise<SyncReport> {
  const results: SyncResult[] = [];
  const errors: { mediaId: number; error: string }[] = [];

  const progress: SyncProgress = {
    total: entries.length,
    completed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  };

  // Send initial progress update
  if (onProgress) {
    onProgress({ ...progress });
  }

  // Process entries with rate limiting
  for (let i = 0; i < entries.length; i++) {
    // Check if operation should be aborted
    if (abortSignal?.aborted) {
      console.log("Sync operation aborted by user");
      break;
    }

    const entry = entries[i];

    try {
      // Apply rate limiting
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL));
      }

      // Perform update
      const result = await updateMangaEntry(entry, token);
      results.push(result);

      // Update progress counters
      progress.completed++;
      if (result.success) {
        progress.successful++;
      } else {
        progress.failed++;
        errors.push({
          mediaId: entry.mediaId,
          error: result.error || "Unknown error",
        });
      }
    } catch (error) {
      // Handle unexpected errors
      progress.completed++;
      progress.failed++;

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        mediaId: entry.mediaId,
        error: errorMessage,
      });

      console.error(`Error updating entry ${entry.mediaId}:`, error);
    }

    // Send progress update
    if (onProgress) {
      onProgress({ ...progress });
    }
  }

  // Create final report
  const report: SyncReport = {
    totalEntries: entries.length,
    successfulUpdates: progress.successful,
    failedUpdates: progress.failed,
    skippedEntries: progress.skipped,
    errors,
    timestamp: new Date(),
  };

  console.log("Sync completed:", report);
  return report;
}

/**
 * Retry failed updates from a previous sync
 */
export async function retryFailedUpdates(
  entries: AniListMediaEntry[],
  failedMediaIds: number[],
  token: string,
  onProgress?: (progress: SyncProgress) => void,
  abortSignal?: AbortSignal,
): Promise<SyncReport> {
  // Filter entries to only include previously failed ones
  const entriesToRetry = entries.filter((entry) =>
    failedMediaIds.includes(entry.mediaId),
  );

  // Run the sync with only the failed entries
  return syncMangaBatch(entriesToRetry, token, onProgress, abortSignal);
}
