import React, { useState } from "react";
import { FileDropZone } from "../components/import/FileDropZone";
import { ErrorMessage } from "../components/ui/error-message";
import { ErrorType, AppError, createError } from "../utils/errorHandling";
import { KenmeiData, KenmeiMangaItem } from "../types/kenmei";
import {
  FileCheck,
  BarChart,
  FilesIcon,
  CheckCircle2,
  Clock,
} from "lucide-react";

export function ImportPage() {
  const [importData, setImportData] = useState<KenmeiData | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleFileLoaded = (data: KenmeiData) => {
    setImportData(data);
    setError(null);
    setImportSuccess(false);
  };

  const handleError = (error: AppError) => {
    setError(error);
    setImportData(null);
    setImportSuccess(false);
  };

  const handleImport = async () => {
    if (!importData) {
      return;
    }

    setIsLoading(true);
    try {
      // This simulates an API call that might fail
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          // Randomly fail to demonstrate error handling
          if (Math.random() > 0.7) {
            reject(new Error("Network connection failed"));
          } else {
            resolve();
          }
        }, 1500);
      });

      // If successful, we would normally process the data
      console.log("Import successful!", importData);

      // Show success state
      setImportSuccess(true);

      // In a real app, we would show a success message and redirect
    } catch {
      // Demonstrate our error handling
      handleError(
        createError(
          ErrorType.NETWORK,
          "Failed to upload data to the server. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const dismissError = () => {
    setError(null);
  };

  const resetForm = () => {
    setImportData(null);
    setError(null);
    setImportSuccess(false);
  };

  // Get status counts
  const getStatusCounts = () => {
    if (!importData?.manga) return {};

    return importData.manga.reduce(
      (acc: Record<string, number>, manga: KenmeiMangaItem) => {
        const status = manga.status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="container mx-auto px-4 py-6 md:px-6">
      <div className="mb-8">
        <div className="flex flex-col space-y-2">
          <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
            Import Your Manga
          </h1>
          <p className="max-w-2xl text-gray-600 dark:text-gray-400">
            Transfer your manga collection from Kenmei to AniList with a single
            file import.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-8">
          <ErrorMessage
            message={error.message}
            type={error.type}
            dismiss={dismissError}
            retry={importData ? handleImport : undefined}
          />
        </div>
      )}

      {importSuccess ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto max-w-md py-8 text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mb-2 text-2xl font-bold">Import Successful!</h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Your {importData?.manga.length} manga entries have been
              successfully imported to AniList.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={resetForm}
                className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-purple-700"
              >
                Import Another File
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      ) : !importData ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                <FilesIcon className="h-5 w-5 text-blue-500" />
                Upload Kenmei Export File
              </h2>
              <p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-400">
                Drag and drop your Kenmei export file here, or click to select a
                file. We support{" "}
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  .csv
                </span>{" "}
                files exported from Kenmei.
              </p>
              <FileDropZone
                onFileLoaded={handleFileLoaded}
                onError={handleError}
              />
            </div>
            <div className="md:col-span-1">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/50">
                <h3 className="mb-4 font-medium text-gray-900 dark:text-gray-100">
                  How to export from Kenmei
                </h3>
                <ol className="list-inside list-decimal space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <li>Log into your Kenmei account</li>
                  <li>Go to Settings &gt; Dashboard</li>
                  <li>Select CSV format</li>
                  <li>Click &quot;Export&quot;</li>
                  <li>Click &quot;Download&quot;</li>
                  <li>Save the file to your computer</li>
                  <li>Upload the saved file here</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
            <FileCheck className="h-5 w-5 text-green-500" />
            File Ready for Import
          </h2>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex items-center rounded-lg bg-blue-50 p-5 dark:bg-blue-900/20">
              <div className="mr-4 rounded-full bg-blue-100 p-3 dark:bg-blue-800">
                <BarChart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Total Entries
                </p>
                <p className="text-2xl font-bold">{importData.manga.length}</p>
              </div>
            </div>

            {Object.entries(statusCounts).map(([status, count]) => (
              <div
                key={status}
                className={`flex items-center rounded-lg p-5 ${
                  status === "reading"
                    ? "bg-green-50 dark:bg-green-900/20"
                    : status === "completed"
                      ? "bg-purple-50 dark:bg-purple-900/20"
                      : status === "dropped"
                        ? "bg-red-50 dark:bg-red-900/20"
                        : "bg-gray-50 dark:bg-gray-700/50"
                }`}
              >
                <div
                  className={`mr-4 rounded-full p-3 ${
                    status === "reading"
                      ? "bg-green-100 dark:bg-green-800"
                      : status === "completed"
                        ? "bg-purple-100 dark:bg-purple-800"
                        : status === "dropped"
                          ? "bg-red-100 dark:bg-red-800"
                          : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <Clock
                    className={`h-6 w-6 ${
                      status === "reading"
                        ? "text-green-600 dark:text-green-400"
                        : status === "completed"
                          ? "text-purple-600 dark:text-purple-400"
                          : status === "dropped"
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-600 dark:text-gray-400"
                    }`}
                  />
                </div>
                <div>
                  <p
                    className={`text-sm ${
                      status === "reading"
                        ? "text-green-600 dark:text-green-400"
                        : status === "completed"
                          ? "text-purple-600 dark:text-purple-400"
                          : status === "dropped"
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() +
                      status.slice(1).replace("_", " ")}
                  </p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h3 className="mb-3 text-lg font-medium">Manga Entries</h3>
            <div className="mb-4 max-h-72 overflow-y-auto rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Status
                    </th>
                    {statusCounts["reading"] > 0 && (
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                        Chapters
                      </th>
                    )}
                    {importData.manga.some((m) => m.score !== undefined) && (
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                        Score
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                  {importData.manga
                    .slice(0, 10)
                    .map((item: KenmeiMangaItem, idx: number) => (
                      <tr
                        key={idx}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                          {item.title}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              item.status === "reading"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : item.status === "completed"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                                  : item.status === "dropped"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {item.status.replace("_", " ")}
                          </span>
                        </td>
                        {statusCounts["reading"] > 0 && (
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {item.chapters_read || 0}
                          </td>
                        )}
                        {importData.manga.some(
                          (m) => m.score !== undefined,
                        ) && (
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {item.score || "-"}
                          </td>
                        )}
                      </tr>
                    ))}
                  {importData.manga.length > 10 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="bg-gray-50 px-6 py-4 text-center text-sm text-gray-500 dark:bg-gray-800/50 dark:text-gray-400"
                      >
                        + {importData.manga.length - 10} more items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              onClick={handleImport}
              disabled={isLoading}
              className="flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg
                    className="mr-2 -ml-1 h-4 w-4 animate-spin text-white"
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
                  Importing...
                </>
              ) : (
                "Import to AniList"
              )}
            </button>
            <button
              onClick={resetForm}
              disabled={isLoading}
              className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
