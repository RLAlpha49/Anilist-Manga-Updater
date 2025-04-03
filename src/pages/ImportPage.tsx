import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { DataTable } from "../components/import/DataTable";
import {
  saveKenmeiData,
  getSavedMatchResults,
} from "../utils/storage";

export function ImportPage() {
  const navigate = useNavigate();
  const [importData, setImportData] = useState<KenmeiData | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [previousMatchCount, setPreviousMatchCount] = useState(0);

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
      // Save the imported data to local storage
      saveKenmeiData(importData);

      // Show success state briefly before redirecting
      setImportSuccess(true);

      // Redirect to the review page after a short delay
      setTimeout(() => {
        navigate({ to: "/review" });
      }, 1500);
    } catch (err) {
      // Handle any errors that might occur during storage
      console.error("Storage error:", err);
      handleError(
        createError(
          ErrorType.STORAGE,
          "Failed to save import data. Please try again.",
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

  useEffect(() => {
    // Check if we have previous match results
    const savedResults = getSavedMatchResults();
    if (savedResults && Array.isArray(savedResults)) {
      const reviewedCount = savedResults.filter(
        (m) =>
          m.status === "matched" ||
          m.status === "manual" ||
          m.status === "skipped",
      ).length;

      setPreviousMatchCount(reviewedCount);
    }
  }, []);

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
              successfully imported. Redirecting to review page...
            </p>
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
            <DataTable data={importData.manga} itemsPerPage={50} />
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
                  Processing...
                </>
              ) : (
                "Continue to Review"
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
          {previousMatchCount > 0 && (
            <div className="mt-2 rounded-md bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              <span className="font-medium">Note:</span> You have{" "}
              {previousMatchCount} previously matched manga entries. Your
              matching progress will be preserved when proceeding to the next
              step.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
