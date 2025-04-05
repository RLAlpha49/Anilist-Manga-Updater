/**
 * AniList Synchronization Service
 * Handles batch updates and synchronization with AniList API
 */

import { request } from "./client";
import {
  DELETE_MANGA_ENTRY,
  generateUpdateMangaEntryMutation,
} from "./mutations";
import { AniListMediaEntry } from "./types";

// Rate limiting constants
const MAX_REQUESTS_PER_MINUTE = 28;
const REQUEST_INTERVAL = 60000 / MAX_REQUESTS_PER_MINUTE; // Time between requests

export interface SyncResult {
  success: boolean;
  mediaId: number;
  error?: string;
  entryId?: number;
  rateLimited: boolean;
  retryAfter: number | null;
}

export interface SyncProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  skipped: number;
  currentEntry: {
    mediaId: number;
    title: string;
    coverImage: string;
  } | null;
  currentStep: number | null;
  totalSteps: number | null;
  rateLimited: boolean;
  retryAfter: number | null; // Time in milliseconds until next retry
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
  // Generate an operation ID for tracking in logs early
  const operationId = `${entry.mediaId}-${Date.now().toString(36).substring(4, 10)}`;

  // Build log prefix with sync type information
  const syncType = entry.syncMetadata?.useIncrementalSync
    ? `INCREMENTAL[step=${entry.syncMetadata.step || 1}/${3}]`
    : "STANDARD";

  const retryInfo = entry.syncMetadata?.isRetry
    ? `RETRY[#${entry.syncMetadata.retryCount || 1}]`
    : "";

  console.log(
    `🔄 [${operationId}] ${syncType} ${retryInfo} Starting update for entry ${entry.mediaId} (${entry.title || "Untitled"})`,
  );

  if (!token) {
    console.error(`❌ [${operationId}] No authentication token provided`);
    return {
      success: false,
      mediaId: entry.mediaId,
      error: "No authentication token provided",
      rateLimited: false,
      retryAfter: null,
    };
  }

  try {
    // Build variables object with only the variables that should be sent
    const variables: Record<string, string | number | boolean> = {
      mediaId: entry.mediaId, // Always include mediaId
    };

    // Only include variables that are actually needed
    if (entry.previousValues) {
      // For existing entries, only include fields that have changed
      if (entry.status !== entry.previousValues.status) {
        variables.status = entry.status;
      }

      if (entry.progress !== entry.previousValues.progress) {
        variables.progress = entry.progress;
      }

      if (entry.score !== entry.previousValues.score) {
        variables.score = entry.score || 0;
      }

      // Only include private flag if it's explicitly set
      if (entry.private !== undefined) {
        variables.private = entry.private;
      }
    } else {
      // For new entries, include all defined fields
      variables.status = entry.status;

      if (typeof entry.progress === "number" && entry.progress > 0) {
        variables.progress = entry.progress;
      }

      if (typeof entry.score === "number" && entry.score > 0) {
        variables.score = entry.score;
      }

      if (entry.private !== undefined) {
        variables.private = entry.private;
      }
    }

    // Handle incremental sync steps
    if (entry.syncMetadata?.step) {
      const step = entry.syncMetadata.step;

      // Step 1: Only update progress by +1 from previous value
      if (step === 1) {
        // Reset variables and only include mediaId and progress
        Object.keys(variables).forEach((key) => {
          if (key !== "mediaId") delete variables[key];
        });

        // For step 1, we increment by +1 from previous progress
        const previousProgress = entry.previousValues?.progress || 0;
        variables.progress = previousProgress + 1;

        console.log(
          `📊 [${operationId}] Incremental sync step 1: Updating progress from ${previousProgress} to ${variables.progress} (incrementing by 1)`,
        );
      }

      // Step 2: Update progress to final value
      else if (step === 2) {
        // Reset variables and include only mediaId and progress
        Object.keys(variables).forEach((key) => {
          if (key !== "mediaId") delete variables[key];
        });

        // Set to final progress value only (no other variables)
        variables.progress = entry.progress;

        console.log(
          `📊 [${operationId}] Incremental sync step 2: Updating progress to final value ${entry.progress}`,
        );
      }

      // Step 3: Update status and score (all remaining variables)
      else if (step === 3) {
        // Reset variables and include status and score
        Object.keys(variables).forEach((key) => {
          if (key !== "mediaId") delete variables[key];
        });

        // Always include status in step 3 if it's changed
        if (
          entry.previousValues &&
          entry.status !== entry.previousValues.status
        ) {
          variables.status = entry.status;
        } else if (!entry.previousValues) {
          // For new entries
          variables.status = entry.status;
        }

        // Include score if available and changed
        if (
          entry.previousValues &&
          entry.score !== entry.previousValues.score &&
          entry.score
        ) {
          variables.score = entry.score;
        } else if (!entry.previousValues && entry.score) {
          // For new entries
          variables.score = entry.score;
        }

        // Include private flag if set
        if (entry.private !== undefined) {
          variables.private = entry.private;
        }

        // Build info string for logging
        const changes = [];
        if (variables.status) changes.push(`status to ${variables.status}`);
        if (variables.score) changes.push(`score to ${variables.score}`);
        if (variables.private !== undefined)
          changes.push(`private to ${variables.private}`);

        const updateInfo =
          changes.length > 0 ? changes.join(", ") : "no additional fields";
        console.log(
          `📊 [${operationId}] Incremental sync step 3: Updating ${updateInfo}`,
        );
      }
    }

    // Log the variables being sent
    console.log(
      `📦 [${operationId}] Variables:`,
      JSON.stringify(variables, null, 2),
    );

    // Generate a dynamic mutation with only the needed variables
    const mutation = generateUpdateMangaEntryMutation(variables);

    // Define the expected response structure to handle both direct and nested formats
    interface SaveMediaListEntryData {
      SaveMediaListEntry?: {
        id: number;
        status: string;
        progress: number;
        private: boolean;
        score: number;
      };
      data?: {
        SaveMediaListEntry?: {
          id: number;
          status: string;
          progress: number;
          private: boolean;
          score: number;
        };
      };
    }

    // Make the API request with optimized variables and mutation
    const response = await request<SaveMediaListEntryData>(
      mutation,
      variables,
      token,
    );

    // Check for GraphQL errors
    if (response.errors && response.errors.length > 0) {
      const errorMessages = response.errors
        .map((err) => err.message)
        .join(", ");
      console.error(`❌ [${operationId}] GraphQL errors:`, response.errors);

      // Check for rate limiting errors
      const isRateLimited = response.errors.some(
        (err) =>
          err.message.toLowerCase().includes("rate limit") ||
          err.message.toLowerCase().includes("too many requests"),
      );

      if (isRateLimited) {
        // Extract retry-after info if available
        let retryAfter = 60000; // Default to 60 seconds if not specified

        // Try to extract a specific retry time from error message or extensions
        for (const err of response.errors) {
          if (err.extensions?.retryAfter) {
            retryAfter = Number(err.extensions.retryAfter) * 1000; // Convert to milliseconds
            break;
          }

          // Try to extract from message using regex
          const timeMatch = err.message.match(/(\d+)\s*(?:second|sec|s)/i);
          if (timeMatch && timeMatch[1]) {
            retryAfter = Number(timeMatch[1]) * 1000;
            break;
          }
        }

        console.warn(
          `⚠️ [${operationId}] Rate limited! Will retry after ${retryAfter / 1000} seconds`,
        );

        return {
          success: false,
          mediaId: entry.mediaId,
          error: `Rate limited: ${errorMessages}`,
          rateLimited: true,
          retryAfter,
        };
      }

      return {
        success: false,
        mediaId: entry.mediaId,
        error: `GraphQL error: ${errorMessages}`,
        rateLimited: false,
        retryAfter: null,
      };
    }

    // Handle nested response structure - check both standard and nested formats
    const responseData = response.data?.data
      ? response.data.data
      : response.data;

    // Check if the entry was created/updated successfully
    if (responseData?.SaveMediaListEntry?.id) {
      console.log(
        `✅ [${operationId}] Successfully updated entry with ID ${responseData.SaveMediaListEntry.id}`,
      );
      return {
        success: true,
        mediaId: entry.mediaId,
        entryId: responseData.SaveMediaListEntry.id,
        rateLimited: false,
        retryAfter: null,
      };
    } else {
      // Log the full response for debugging
      console.error(
        `❌ [${operationId}] Missing SaveMediaListEntry in response:`,
        JSON.stringify(response, null, 2),
      );
      return {
        success: false,
        mediaId: entry.mediaId,
        error: "Update failed: No entry ID returned in response",
        rateLimited: false,
        retryAfter: null,
      };
    }
  } catch (error) {
    // Get a detailed error message
    const errorMessage =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);

    console.error(
      `❌ [${operationId}] Error updating entry ${entry.mediaId}:`,
      error,
    );

    // Try to get more detailed information from the error object
    if (error instanceof Error) {
      console.error(`   [${operationId}] Error type: ${error.name}`);
      console.error(`   [${operationId}] Error message: ${error.message}`);
      console.error(
        `   [${operationId}] Stack trace:`,
        error.stack || "No stack trace available",
      );
    }

    // Handle network errors specifically
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error(
        `   [${operationId}] Network error detected. Possible connectivity issue.`,
      );
    }

    // Log the entry details that caused the error
    console.error(`   [${operationId}] Entry details:`, {
      mediaId: entry.mediaId,
      title: entry.title,
      status: entry.status,
      progress: entry.progress,
      score: entry.score,
    });

    // Check for server error (500)
    let is500Error =
      (error instanceof Error &&
        (error.message.includes("500") ||
          error.message.includes("Internal Server Error"))) ||
      (typeof error === "object" &&
        error !== null &&
        "status" in error &&
        (error as { status?: number }).status === 500);

    // Check if the error message contains JSON with a 500 status
    if (!is500Error && typeof errorMessage === "string") {
      try {
        // Try to parse error message as JSON
        if (
          errorMessage.includes('"status": 500') ||
          errorMessage.includes('"status":500') ||
          errorMessage.includes("Internal Server Error")
        ) {
          is500Error = true;
        }
      } catch {
        // Ignore parsing errors
      }
    }

    if (is500Error) {
      console.warn(
        `⚠️ [${operationId}] 500 Server Error detected. Will perform automatic retry.`,
      );

      // Set a short retry delay (3 seconds)
      const retryDelay = 3000;

      return {
        success: false,
        mediaId: entry.mediaId,
        error: `Server Error (500): ${errorMessage}. Automatic retry scheduled.`,
        rateLimited: true, // Use rate limited mechanism for retry
        retryAfter: retryDelay,
      };
    }

    return {
      success: false,
      mediaId: entry.mediaId,
      error: errorMessage,
      rateLimited: false,
      retryAfter: null,
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
  // Generate an operation ID for tracking in logs
  const operationId = `del-${entryId}-${Date.now().toString(36).substring(4, 10)}`;

  console.log(
    `🗑️ [${operationId}] Starting delete operation for entry ID ${entryId}`,
  );

  if (!token) {
    console.error(`❌ [${operationId}] No authentication token provided`);
    return {
      success: false,
      error: "No authentication token provided",
    };
  }

  try {
    const variables = {
      id: entryId,
    };

    console.log(
      `📦 [${operationId}] Variables:`,
      JSON.stringify(variables, null, 2),
    );

    // Define the expected response structure
    interface DeleteMediaListEntryData {
      DeleteMediaListEntry?: {
        deleted: boolean;
      };
      data?: {
        DeleteMediaListEntry?: {
          deleted: boolean;
        };
      };
    }

    const response = await request<DeleteMediaListEntryData>(
      DELETE_MANGA_ENTRY,
      variables,
      token,
    );

    // Check for GraphQL errors
    if (response.errors && response.errors.length > 0) {
      const errorMessages = response.errors
        .map((err) => err.message)
        .join(", ");
      console.error(
        `❌ [${operationId}] GraphQL errors for delete operation:`,
        response.errors,
      );
      return {
        success: false,
        error: `GraphQL error: ${errorMessages}`,
      };
    }

    // Handle nested response structure
    const responseData = response.data?.data
      ? response.data.data
      : response.data;

    if (responseData?.DeleteMediaListEntry?.deleted) {
      console.log(
        `✅ [${operationId}] Successfully deleted entry with ID ${entryId}`,
      );
      return {
        success: true,
      };
    } else {
      console.error(
        `❌ [${operationId}] Missing DeleteMediaListEntry in response:`,
        JSON.stringify(response, null, 2),
      );
      return {
        success: false,
        error: "Delete failed: Entry was not deleted",
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `❌ [${operationId}] Error deleting manga entry ${entryId}:`,
      error,
    );

    // Try to get more detailed information from the error object
    if (error instanceof Error) {
      console.error(`   [${operationId}] Error type: ${error.name}`);
      console.error(`   [${operationId}] Error message: ${error.message}`);
      console.error(
        `   [${operationId}] Stack trace:`,
        error.stack || "No stack trace available",
      );
    }

    return {
      success: false,
      error: errorMessage,
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
    currentEntry: null,
    currentStep: null,
    totalSteps: null,
    rateLimited: false,
    retryAfter: null,
  };

  // Send initial progress update
  if (onProgress) {
    onProgress({ ...progress });
  }

  // Group entries by mediaId for handling incremental sync properly
  const entriesByMediaId: Record<number, AniListMediaEntry[]> = {};

  // Organize entries by mediaId
  entries.forEach((entry) => {
    // For incremental sync entries, we need to process them step by step
    if (entry.syncMetadata?.useIncrementalSync) {
      // Create entry objects for each step
      const stepCount = 3; // We use 3 steps for incremental sync

      // Create a separate entry for each step
      for (let step = 1; step <= stepCount; step++) {
        const stepEntry = { ...entry };

        // Update the syncMetadata for this step
        stepEntry.syncMetadata = {
          ...entry.syncMetadata,
          step: step,
        };

        // Add to the group
        if (!entriesByMediaId[entry.mediaId]) {
          entriesByMediaId[entry.mediaId] = [];
        }
        entriesByMediaId[entry.mediaId].push(stepEntry);
      }
    } else {
      // Regular non-incremental entry
      if (!entriesByMediaId[entry.mediaId]) {
        entriesByMediaId[entry.mediaId] = [];
      }
      entriesByMediaId[entry.mediaId].push(entry);
    }
  });

  // Track API calls completed for internal progress
  let apiCallsCompleted = 0;

  // Process all entries grouped by mediaId
  for (const [mediaId, entriesForMediaId] of Object.entries(entriesByMediaId)) {
    // Check for cancellation at the start of each manga processing
    if (abortSignal?.aborted) {
      console.log("Sync operation aborted by user");
      break; // Immediately exit the loop without processing remaining entries
    }

    // Sort entries by step for incremental sync
    entriesForMediaId.sort((a, b) => {
      const stepA = a.syncMetadata?.step || 0;
      const stepB = b.syncMetadata?.step || 0;
      return stepA - stepB;
    });

    // Get the first entry for this mediaId to access media details
    const firstEntry = entriesForMediaId[0];
    const isIncremental =
      entriesForMediaId.length > 1 &&
      firstEntry.syncMetadata?.useIncrementalSync;

    // Update progress with current entry info - this stays the same for all steps
    progress.currentEntry = {
      mediaId: parseInt(mediaId),
      title: firstEntry.title || `Manga #${mediaId}`,
      coverImage: firstEntry.coverImage || "",
    };

    // Set step information for incremental sync
    if (isIncremental) {
      progress.totalSteps = entriesForMediaId.length;
    } else {
      progress.currentStep = null;
      progress.totalSteps = null;
    }

    // Process all required steps/entries for this manga
    let entrySuccess = true;
    let entryError: string | undefined;

    for (let i = 0; i < entriesForMediaId.length; i++) {
      // Check for cancellation before each step
      if (abortSignal?.aborted) {
        console.log("Sync operation aborted by user");
        break; // Exit the loop for this manga's steps
      }

      const entry = entriesForMediaId[i];

      // Set current step in progress for incremental sync
      if (isIncremental) {
        progress.currentStep = entry.syncMetadata?.step || i + 1;
      }

      // Update UI to show what we're working on
      if (onProgress) {
        onProgress({ ...progress });
      }

      try {
        // Apply rate limiting
        if (apiCallsCompleted > 0) {
          await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL));
        }

        // Perform update
        const result = await updateMangaEntry(entry, token);
        results.push(result);
        apiCallsCompleted++;

        // Handle rate limiting with countdown
        if (result.rateLimited && result.retryAfter) {
          // Update progress to show rate limiting
          progress.rateLimited = true;
          progress.retryAfter = result.retryAfter;

          // Send progress update to show rate limiting status
          if (onProgress) {
            onProgress({ ...progress });
          }

          // Set up countdown timer
          const retryAfterMs = result.retryAfter;
          const startTime = Date.now();
          const endTime = startTime + retryAfterMs;

          // Update countdown every second
          const countdownInterval = setInterval(() => {
            const currentTime = Date.now();
            const remainingMs = Math.max(0, endTime - currentTime);

            progress.retryAfter = remainingMs;

            if (onProgress) {
              onProgress({ ...progress });
            }

            if (remainingMs <= 0 || abortSignal?.aborted) {
              clearInterval(countdownInterval);
            }
          }, 1000);

          // Wait for the retry time
          await new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
              clearInterval(countdownInterval);
              progress.rateLimited = false;
              progress.retryAfter = null;

              if (onProgress) {
                onProgress({ ...progress });
              }

              resolve(null);
            }, retryAfterMs);

            // If aborted, clear the timeout
            if (abortSignal) {
              abortSignal.addEventListener("abort", () => {
                clearTimeout(timeoutId);
                clearInterval(countdownInterval);
                resolve(null);
              });
            }
          });

          // Retry this entry (decrement i so we try again)
          i--;
          continue;
        }

        // Track success/failure
        if (!result.success) {
          entrySuccess = false;
          entryError = result.error;
          // For incremental sync, break on first failure
          if (isIncremental) break;
        }
      } catch (error) {
        apiCallsCompleted++;
        entrySuccess = false;
        entryError = error instanceof Error ? error.message : String(error);

        const errorOpId = `err-${mediaId}-${entry.syncMetadata?.step || 0}-${Date.now().toString(36).substring(4, 10)}`;
        console.error(
          `❌ [${errorOpId}] Error updating entry ${mediaId}:`,
          error,
        );

        // Log more detailed info about the entry that failed
        console.error(`   [${errorOpId}] Entry details:`, {
          mediaId: entry.mediaId,
          title: entry.title,
          status: entry.status,
          progress: entry.progress,
          score: entry.score,
          incremental: isIncremental,
          step: entry.syncMetadata?.step || "N/A",
        });

        // For incremental sync, break on first error
        if (isIncremental) break;
      }
    }

    // Update progress counters based on the overall entry success
    progress.completed++;
    if (entrySuccess) {
      progress.successful++;
    } else {
      progress.failed++;
      errors.push({
        mediaId: parseInt(mediaId),
        error: entryError || "Unknown error",
      });
    }

    // Clear current entry after all steps are processed
    progress.currentEntry = null;
    progress.currentStep = null;

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

  console.log(
    `🔄 Retrying ${entriesToRetry.length} failed updates out of ${entries.length} total entries`,
  );

  // Add retry metadata to each entry
  entriesToRetry.forEach((entry) => {
    // Initialize the syncMetadata if it doesn't exist
    if (!entry.syncMetadata) {
      entry.syncMetadata = {
        useIncrementalSync: false,
        targetProgress: entry.progress,
        progress: entry.progress,
        isRetry: true,
        retryTimestamp: Date.now(),
        retryCount: 1,
      };
    } else {
      // Update existing syncMetadata
      entry.syncMetadata = {
        ...entry.syncMetadata,
        isRetry: true,
        retryTimestamp: Date.now(),
        retryCount: (entry.syncMetadata.retryCount || 0) + 1,
      };
    }
  });

  // Run the sync with only the failed entries
  return syncMangaBatch(entriesToRetry, token, onProgress, abortSignal);
}
