import React from "react";
import { MatchingProgress, TimeEstimate } from "../../types/matching";
import { formatTimeRemaining } from "../../utils/timeUtils";

interface MatchingProgressProps {
  isCancelling: boolean;
  progress: MatchingProgress;
  statusMessage: string;
  detailMessage: string | null;
  timeEstimate: TimeEstimate;
  onCancelProcess: () => void;
  bypassCache?: boolean;
  freshSearch?: boolean;
}

export const MatchingProgressPanel: React.FC<MatchingProgressProps> = ({
  isCancelling,
  progress,
  statusMessage,
  detailMessage,
  timeEstimate,
  onCancelProcess,
  bypassCache,
  freshSearch,
}) => {
  return (
    <div className="mb-8 rounded-lg border p-6 shadow-sm">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold">
          {isCancelling
            ? "Cancelling..."
            : statusMessage || "Matching your manga..."}
        </h2>

        {detailMessage && (
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            {detailMessage}
          </p>
        )}
      </div>

      {/* Progress Bar - Fixed for dark mode */}
      <div className="mb-2 h-4 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="bg-primary h-4 rounded-full transition-all duration-300 dark:bg-blue-500"
          style={{
            width: `${progress.total ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0}%`,
          }}
        />
      </div>

      {/* Progress Text */}
      <div className="mb-4 text-center text-sm text-gray-600 dark:text-gray-300">
        {/* Time Estimate */}
        {progress.current > 0 && timeEstimate.estimatedRemainingSeconds > 0 && (
          <div className="mt-1">
            Estimated time remaining:{" "}
            {formatTimeRemaining(timeEstimate.estimatedRemainingSeconds)}
          </div>
        )}
      </div>

      {/* Current Manga Display */}
      {progress.currentTitle && (
        <div className="mb-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Currently processing:{" "}
            <span className="font-medium">{progress.currentTitle}</span>
          </p>
        </div>
      )}

      {/* Cache indicator */}
      {(bypassCache || freshSearch) && (
        <div className="mb-4 text-center text-sm text-blue-600 dark:text-blue-400">
          Performing fresh searches from AniList
        </div>
      )}

      {/* Cancel Button */}
      <div className="text-center">
        <button
          onClick={onCancelProcess}
          className={`rounded-md px-4 py-2 transition-colors ${
            isCancelling
              ? "cursor-not-allowed bg-gray-400 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
              : "bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
          }`}
          disabled={isCancelling}
        >
          {isCancelling ? "Cancelling..." : "Cancel Process"}
        </button>
      </div>
    </div>
  );
};
