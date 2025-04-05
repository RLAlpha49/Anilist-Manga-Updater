/**
 * Hook for managing AniList synchronization
 */

import { useState, useCallback } from "react";
import {
  syncMangaBatch,
  SyncReport,
  SyncProgress,
} from "../api/anilist/sync-service";
import { AniListMediaEntry } from "../api/anilist/types";
import {
  exportSyncErrorLog,
  exportSyncReport,
  saveSyncReportToHistory,
} from "../utils/export-utils";

interface SynchronizationState {
  isActive: boolean;
  progress: SyncProgress | null;
  report: SyncReport | null;
  error: string | null;
  abortController: AbortController | null;
}

interface SynchronizationActions {
  startSync: (entries: AniListMediaEntry[], token: string) => Promise<void>;
  cancelSync: () => void;
  exportErrors: () => void;
  exportReport: () => void;
  reset: () => void;
}

/**
 * Hook that provides methods and state for managing AniList synchronization
 */
export function useSynchronization(): [
  SynchronizationState,
  SynchronizationActions,
] {
  const [state, setState] = useState<SynchronizationState>({
    isActive: false,
    progress: null,
    report: null,
    error: null,
    abortController: null,
  });

  // Start a synchronization operation
  const startSync = useCallback(
    async (entries: AniListMediaEntry[], token: string) => {
      if (state.isActive) {
        console.warn("Sync is already in progress");
        return;
      }

      if (!entries.length) {
        setState((prev) => ({
          ...prev,
          error: "No entries to synchronize",
        }));
        return;
      }

      if (!token) {
        setState((prev) => ({
          ...prev,
          error: "No authentication token available",
        }));
        return;
      }

      try {
        // Create new AbortController for this operation
        const abortController = new AbortController();

        // Update state to show sync is active
        setState((prev) => ({
          ...prev,
          isActive: true,
          error: null,
          abortController,
          progress: {
            total: entries.length,
            completed: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
          },
        }));

        console.log("entries", entries);

        // // Start the sync process
        // const report = await syncMangaBatch(
        //   entries,
        //   token,
        //   (progress) => {
        //     setState(prev => ({
        //       ...prev,
        //       progress
        //     }));
        //   },
        //   abortController.signal
        // );

        // // Save report to history
        // saveSyncReportToHistory(report);

        // // Update state with results
        // setState(prev => ({
        //   ...prev,
        //   isActive: false,
        //   report,
        //   abortController: null
        // }));
      } catch (error) {
        console.error("Sync operation failed:", error);
        setState((prev) => ({
          ...prev,
          isActive: false,
          error: error instanceof Error ? error.message : String(error),
          abortController: null,
        }));
      }
    },
    [state.isActive],
  );

  // Cancel active synchronization
  const cancelSync = useCallback(() => {
    if (state.abortController) {
      state.abortController.abort();
      setState((prev) => ({
        ...prev,
        isActive: false,
        error: "Synchronization cancelled by user",
        abortController: null,
      }));
    }
  }, [state.abortController]);

  // Export errors to file
  const exportErrors = useCallback(() => {
    if (state.report) {
      exportSyncErrorLog(state.report);
    }
  }, [state.report]);

  // Export full report to file
  const exportReport = useCallback(() => {
    if (state.report) {
      exportSyncReport(state.report);
    }
  }, [state.report]);

  // Reset the synchronization state
  const reset = useCallback(() => {
    setState({
      isActive: false,
      progress: null,
      report: null,
      error: null,
      abortController: null,
    });
  }, []);

  return [
    state,
    {
      startSync,
      cancelSync,
      exportErrors,
      exportReport,
      reset,
    },
  ];
}
