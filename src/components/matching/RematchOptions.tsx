import React from "react";
import { StatusFilterOptions } from "../../types/matching";
import { MangaMatchResult } from "../../api/anilist/types";
import { KenmeiManga } from "../../api/kenmei/types";

interface RematchOptionsProps {
  selectedStatuses: StatusFilterOptions;
  onChangeSelectedStatuses: (statuses: StatusFilterOptions) => void;
  matchResults: MangaMatchResult[];
  allManga: KenmeiManga[];
  rematchWarning: string | null;
  onRematchByStatus: () => void;
  onCloseOptions: () => void;
}

export const RematchOptions: React.FC<RematchOptionsProps> = ({
  selectedStatuses,
  onChangeSelectedStatuses,
  matchResults,
  allManga,
  rematchWarning,
  onRematchByStatus,
  onCloseOptions,
}) => {
  const toggleStatus = (status: keyof StatusFilterOptions) => {
    onChangeSelectedStatuses({
      ...selectedStatuses,
      [status]: !selectedStatuses[status],
    });
  };

  const resetToDefault = () => {
    onChangeSelectedStatuses({
      pending: true,
      skipped: true,
      conflict: false,
      matched: false,
      manual: false,
      unmatched: true,
    });
  };

  // Calculate the total count of manga to be rematched
  const calculateTotalCount = () => {
    return Object.entries(selectedStatuses)
      .filter(([, selected]) => selected)
      .reduce((count, [status]) => {
        if (status === "unmatched") {
          return count + (allManga.length - matchResults.length);
        }
        return count + matchResults.filter((m) => m.status === status).length;
      }, 0);
  };

  return (
    <div className="mb-6 rounded-md bg-gray-50 p-4 dark:bg-gray-800">
      <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
        Select which manga statuses to rematch
      </h3>

      {rematchWarning && (
        <div className="mb-4 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/30">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
                {rematchWarning}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <label className="flex items-center rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
          <input
            type="checkbox"
            checked={selectedStatuses.pending}
            onChange={() => toggleStatus("pending")}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Pending ({matchResults.filter((m) => m.status === "pending").length}
            )
          </span>
        </label>
        <label className="flex items-center rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
          <input
            type="checkbox"
            checked={selectedStatuses.skipped}
            onChange={() => toggleStatus("skipped")}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Skipped ({matchResults.filter((m) => m.status === "skipped").length}
            )
          </span>
        </label>
        <label className="flex items-center rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
          <input
            type="checkbox"
            checked={selectedStatuses.conflict}
            onChange={() => toggleStatus("conflict")}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Conflict (
            {matchResults.filter((m) => m.status === "conflict").length})
          </span>
        </label>
        <label className="flex items-center rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
          <input
            type="checkbox"
            checked={selectedStatuses.matched}
            onChange={() => toggleStatus("matched")}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Matched ({matchResults.filter((m) => m.status === "matched").length}
            )
          </span>
        </label>
        <label className="flex items-center rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
          <input
            type="checkbox"
            checked={selectedStatuses.manual}
            onChange={() => toggleStatus("manual")}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Manual ({matchResults.filter((m) => m.status === "manual").length})
          </span>
        </label>
        <label className="flex items-center rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
          <input
            type="checkbox"
            checked={selectedStatuses.unmatched}
            onChange={() => toggleStatus("unmatched")}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Unmatched (
            {(() => {
              // Calculate unmatched count
              const displayedCount = allManga.length - matchResults.length;
              console.log(
                `RematchOptions: Base unmatched count = ${displayedCount} (${allManga.length} total - ${matchResults.length} processed)`,
              );

              // Always try the title-based approach first since IDs are undefined
              const processedTitles = new Set(
                matchResults.map((r) => r.kenmeiManga.title.toLowerCase()),
              );

              // Find manga that don't have matching titles
              const titleBasedCount = allManga.filter(
                (m) => !processedTitles.has(m.title.toLowerCase()),
              ).length;

              console.log(
                `RematchOptions: Title-based unmatched count = ${titleBasedCount}`,
              );

              // If title-based count seems reasonable, use it
              if (titleBasedCount >= 0 && titleBasedCount <= allManga.length) {
                return titleBasedCount;
              }

              // Only as a fallback, if displayedCount seems reasonable, use it
              if (displayedCount >= 0 && displayedCount <= allManga.length) {
                return displayedCount;
              }

              // Last resort - numerical difference
              return Math.max(0, allManga.length - matchResults.length);
            })()}
            )
          </span>
        </label>
      </div>
      <div className="mt-4 flex space-x-3">
        <button
          onClick={onRematchByStatus}
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          Fresh Search Selected ({calculateTotalCount()})
        </button>
        <button
          onClick={resetToDefault}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          Reset to Default
        </button>
        <button
          onClick={onCloseOptions}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
