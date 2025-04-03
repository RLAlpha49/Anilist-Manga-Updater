import React, { useState, useEffect } from "react";
import { KenmeiMangaItem } from "../../types/kenmei";

interface DataTableProps {
  data: KenmeiMangaItem[];
  itemsPerPage?: number;
}

export function DataTable({ data, itemsPerPage = 50 }: DataTableProps) {
  const [visibleData, setVisibleData] = useState<KenmeiMangaItem[]>([]);
  const [displayCount, setDisplayCount] = useState(itemsPerPage);

  // Load more items when scrolling near the bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // If we're 80% of the way down, load more items
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      // Don't exceed the original data length
      setDisplayCount((prev) => Math.min(prev + itemsPerPage, data.length));
    }
  };

  // Update visible data when display count changes
  useEffect(() => {
    setVisibleData(data.slice(0, displayCount));
  }, [data, displayCount]);

  // Reset when data changes
  useEffect(() => {
    setDisplayCount(itemsPerPage);
    setVisibleData(data.slice(0, itemsPerPage));
  }, [data, itemsPerPage]);

  // Determine which columns to show based on data
  const hasScore = data.some(
    (item) => item.score !== undefined && item.score > 0,
  );
  const hasChapters = data.some(
    (item) => item.chapters_read !== undefined && item.chapters_read > 0,
  );
  const hasVolumes = data.some(
    (item) => item.volumes_read !== undefined && item.volumes_read > 0,
  );
  const hasNotes = data.some((item) => item.notes && item.notes.trim() !== "");
  const hasLastRead = data.some((item) => item.updated_at || item.created_at);

  // Format date to a readable format
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return "-";
    }
  };

  return (
    <div
      className="max-h-[500px] overflow-x-hidden overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700"
      onScroll={handleScroll}
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(156, 163, 175, 0.5) transparent",
      }}
    >
      <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
          <tr>
            {/* Title column - flexible width that can shrink */}
            <th className="w-auto max-w-[250px] min-w-[80px] px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Title
            </th>

            {/* Status column - smaller fixed width */}
            <th className="w-1/6 px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Status
            </th>

            {/* Conditional columns - show only if data exists */}
            {hasChapters && (
              <th className="w-24 px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                Ch
              </th>
            )}

            {hasVolumes && (
              <th className="w-24 px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                Vol
              </th>
            )}

            {hasScore && (
              <th className="w-24 px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                Score
              </th>
            )}

            {hasLastRead && (
              <th className="w-32 px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                Last Read
              </th>
            )}

            {hasNotes && (
              <th className="w-1/6 px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                Notes
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
          {visibleData.map((item, index) => (
            <tr
              key={index}
              className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td
                className="max-w-[250px] min-w-[80px] overflow-hidden px-4 py-3 text-sm font-medium text-ellipsis whitespace-nowrap text-gray-900 dark:text-gray-100"
                title={item.title}
              >
                {item.title}
              </td>

              <td className="px-3 py-3 text-sm">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    item.status === "reading"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      : item.status === "completed"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                        : item.status === "on_hold"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                          : item.status === "dropped"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {item.status.replace(/_/g, " ")}
                </span>
              </td>

              {hasChapters && (
                <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {item.chapters_read || "-"}
                </td>
              )}

              {hasVolumes && (
                <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {item.volumes_read || "-"}
                </td>
              )}

              {hasScore && (
                <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {item.score ? item.score.toFixed(1) : "-"}
                </td>
              )}

              {hasLastRead && (
                <td
                  className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400"
                  title={item.updated_at || item.created_at}
                >
                  {formatDate(item.updated_at || item.created_at)}
                </td>
              )}

              {hasNotes && (
                <td
                  className="max-w-xs truncate px-3 py-3 text-sm text-gray-500 dark:text-gray-400"
                  title={item.notes}
                >
                  {item.notes || "-"}
                </td>
              )}
            </tr>
          ))}

          {/* Show loading indicator when not all items are loaded */}
          {visibleData.length < data.length && (
            <tr>
              <td
                colSpan={
                  2 +
                  (hasChapters ? 1 : 0) +
                  (hasVolumes ? 1 : 0) +
                  (hasScore ? 1 : 0) +
                  (hasLastRead ? 1 : 0) +
                  (hasNotes ? 1 : 0)
                }
                className="py-4 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg
                    className="h-4 w-4 animate-spin text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Loading more...</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Information footer */}
      <div className="bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        Showing {visibleData.length} of {data.length} entries
      </div>
    </div>
  );
}
