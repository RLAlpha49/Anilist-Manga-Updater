import React from "react";
import { ApiError } from "../../types/matching";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

interface ErrorDisplayProps {
  error: string;
  detailedError: ApiError | null;
  onRetry: () => void;
  onClearPendingManga?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  detailedError,
  onRetry,
  onClearPendingManga,
}) => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto flex h-full max-w-6xl flex-col px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Review Your Manga
        </h1>
      </header>

      <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-start">
          <AlertCircle className="mr-3 h-5 w-5 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
              Error Matching Manga
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-400">
              <p>{error}</p>

              {detailedError && (
                <div className="mt-4">
                  <details className="cursor-pointer">
                    <summary className="font-medium">
                      View Technical Details
                    </summary>
                    <pre className="mt-2 max-h-60 overflow-auto rounded-md bg-red-100 p-4 font-mono text-xs text-red-900 dark:bg-red-950 dark:text-red-200">
                      {JSON.stringify(detailedError, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
              <button
                onClick={onRetry}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
              >
                Retry Matching
              </button>
              <button
                onClick={() => {
                  if (onClearPendingManga) {
                    onClearPendingManga();
                  }
                  navigate({ to: "/import" });
                }}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Back to Import
              </button>
              <button
                onClick={() => navigate({ to: "/settings" })}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Debug buttons */}
      <div className="mt-4">
        <button
          onClick={async () => {
            try {
              const { cacheDebugger } = await import(
                "../../api/matching/manga-search-service"
              );
              const status = cacheDebugger.getCacheStatus();
              console.log("Current cache status:", status);
              alert(
                `Cache Status:\n- In Memory: ${status.inMemoryCache} entries\n- LocalStorage: ${status.localStorage.mangaCache} manga entries, ${status.localStorage.searchCache} search entries`,
              );
            } catch (e) {
              console.error("Failed to check cache status:", e);
            }
          }}
          className="text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          aria-label="Debug cache status"
        >
          Check Cache Status
        </button>
        <button
          onClick={async () => {
            try {
              const { cacheDebugger } = await import(
                "../../api/matching/manga-search-service"
              );
              if (
                window.confirm(
                  "Are you sure you want to clear all caches? This will require re-fetching all manga data.",
                )
              ) {
                cacheDebugger.resetAllCaches();

                // Also clear pending manga data
                if (onClearPendingManga) {
                  onClearPendingManga();
                }

                alert("All caches have been cleared.");
              }
            } catch (e) {
              console.error("Failed to reset caches:", e);
            }
          }}
          className="ml-4 text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          aria-label="Reset all caches"
        >
          Reset Caches
        </button>
      </div>
    </div>
  );
};
