import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  syncMangaBatch,
  SyncProgress,
  SyncReport,
  retryFailedUpdates,
} from "../api/anilist/sync-service";
import { AniListMediaEntry } from "../api/anilist/types";
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

interface SyncManagerProps {
  entries: AniListMediaEntry[];
  token: string;
  onComplete?: (report: SyncReport) => void;
  onCancel?: () => void;
}

const SyncManager: React.FC<SyncManagerProps> = ({
  entries,
  token,
  onComplete,
  onCancel,
}) => {
  const [progress, setProgress] = useState<SyncProgress>({
    total: entries.length,
    completed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  });

  const [status, setStatus] = useState<
    "idle" | "syncing" | "completed" | "failed"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SyncReport | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Calculate progress percentage
  const progressPercentage =
    progress.total > 0
      ? Math.floor((progress.completed / progress.total) * 100)
      : 0;

  // Handle sync operation
  const startSync = useCallback(async () => {
    if (entries.length === 0) {
      setError("No entries to synchronize");
      return;
    }

    if (!token) {
      setError("No authentication token available");
      return;
    }

    try {
      setStatus("syncing");
      setError(null);

      // Create new abort controller for this operation
      abortControllerRef.current = new AbortController();

      // Start the sync operation
      const syncReport = await syncMangaBatch(
        entries,
        token,
        (progress) => setProgress(progress),
        abortControllerRef.current.signal,
      );

      // Update state with results
      setReport(syncReport);
      setStatus(syncReport.failedUpdates > 0 ? "failed" : "completed");

      // Notify parent component
      if (onComplete) {
        onComplete(syncReport);
      }
    } catch (error) {
      console.error("Sync operation failed:", error);
      setError(error instanceof Error ? error.message : String(error));
      setStatus("failed");
    } finally {
      abortControllerRef.current = null;
    }
  }, [entries, token, onComplete]);

  // Handle cancel operation
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setError("Sync operation cancelled by user");
      setStatus("failed");
    }

    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Handle retry failed updates
  const handleRetry = useCallback(async () => {
    if (!report || !report.errors.length) {
      return;
    }

    try {
      setStatus("syncing");
      setError(null);

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      // Get failed media IDs
      const failedMediaIds = report.errors.map((error) => error.mediaId);

      // Retry failed updates
      const retryReport = await retryFailedUpdates(
        entries,
        failedMediaIds,
        token,
        (progress) => setProgress(progress),
        abortControllerRef.current.signal,
      );

      setReport(retryReport);
      setStatus(retryReport.failedUpdates > 0 ? "failed" : "completed");

      if (onComplete) {
        onComplete(retryReport);
      }
    } catch (error) {
      console.error("Retry operation failed:", error);
      setError(error instanceof Error ? error.message : String(error));
      setStatus("failed");
    } finally {
      abortControllerRef.current = null;
    }
  }, [report, entries, token, onComplete]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>AniList Synchronization</CardTitle>
        <CardDescription>
          Updating {entries.length} manga entries to your AniList account
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Progress bar */}
        <div className="mb-4">
          <div className="mb-2 flex justify-between">
            <span className="text-sm font-medium">
              Progress: {progress.completed} of {progress.total} entries
            </span>
            <span className="text-sm font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Success/Error counters */}
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div className="flex items-center rounded-md bg-green-50 p-3 dark:bg-green-900/20">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium">Successful</p>
              <p className="text-xl font-bold">{progress.successful}</p>
            </div>
          </div>

          <div className="flex items-center rounded-md bg-red-50 p-3 dark:bg-red-900/20">
            <XCircle className="mr-2 h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium">Failed</p>
              <p className="text-xl font-bold">{progress.failed}</p>
            </div>
          </div>

          <div className="flex items-center rounded-md bg-gray-50 p-3 dark:bg-gray-800">
            <div>
              <p className="text-sm font-medium">Remaining</p>
              <p className="text-xl font-bold">
                {progress.total - progress.completed}
              </p>
            </div>
          </div>
        </div>

        {/* Status message */}
        {status === "syncing" && (
          <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
            <AlertTitle>Synchronization in progress</AlertTitle>
            <AlertDescription>
              Please wait while your manga entries are being updated on AniList.
            </AlertDescription>
          </Alert>
        )}

        {status === "completed" && (
          <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Synchronization complete</AlertTitle>
            <AlertDescription>
              All manga entries have been successfully updated on AniList.
            </AlertDescription>
          </Alert>
        )}

        {status === "failed" && (
          <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertTitle>Synchronization failed</AlertTitle>
            <AlertDescription>
              {error ||
                `${progress.failed} entries failed to update. You can retry the failed entries.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Error details */}
        {report && report.errors.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium">Error Details:</h3>
            <div className="max-h-40 overflow-y-auto rounded-md border">
              <ul className="divide-y">
                {report.errors.map((error, index) => (
                  <li key={index} className="p-2 text-sm">
                    <span className="font-medium">
                      Media ID {error.mediaId}:
                    </span>{" "}
                    {error.error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end space-x-2">
        {status === "idle" && (
          <>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={startSync}>Start Synchronization</Button>
          </>
        )}

        {status === "syncing" && (
          <Button variant="destructive" onClick={handleCancel}>
            Cancel Sync
          </Button>
        )}

        {(status === "completed" || status === "failed") && (
          <>
            <Button variant="outline" onClick={onCancel}>
              Close
            </Button>

            {status === "failed" && report && report.errors.length > 0 && (
              <Button onClick={handleRetry}>Retry Failed Updates</Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default SyncManager;
