import React, { useState, useRef } from "react";
import { UploadCloud, File, FileText } from "lucide-react";
import { Button } from "../ui/button";
import { KenmeiData, KenmeiMangaItem } from "../../types/kenmei";
import { createError, ErrorType, AppError } from "../../utils/errorHandling";

interface FileDropZoneProps {
  onFileLoaded: (data: KenmeiData) => void;
  onError: (error: AppError) => void;
}

export function FileDropZone({ onFileLoaded, onError }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setFileSize(file.size);

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      onError(
        createError(
          ErrorType.VALIDATION,
          "Invalid file format. Please upload a CSV file.",
        ),
      );
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError(
        createError(
          ErrorType.VALIDATION,
          "File is too large. Maximum size is 10MB.",
        ),
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          throw new Error("Failed to read file");
        }

        const content = event.target.result as string;
        // Parse CSV content
        const parsedData = parseCSV(content);

        if (!parsedData || parsedData.manga.length === 0) {
          onError(
            createError(
              ErrorType.VALIDATION,
              "No manga entries found in the CSV file. Please check the file format.",
            ),
          );
          return;
        }

        onFileLoaded(parsedData);
      } catch (err) {
        console.error("CSV parsing error:", err);
        onError(
          createError(
            ErrorType.VALIDATION,
            "Failed to parse CSV file. Please ensure it's a valid Kenmei export file.",
          ),
        );
      }
    };

    reader.onerror = () => {
      onError(
        createError(ErrorType.UNKNOWN, "Error reading file. Please try again."),
      );
    };

    reader.readAsText(file);
  };

  // Parse CSV content into KenmeiData
  const parseCSV = (csvContent: string): KenmeiData => {
    // Split by lines and get header row and data rows
    const lines = csvContent
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "");
    if (lines.length < 2) {
      throw new Error(
        "CSV file must contain at least a header row and one data row",
      );
    }

    // Parse header row to get column indices
    const headers = parseCSVLine(lines[0]);

    // Find required column indices
    const titleIndex = headers.findIndex((h) =>
      h.toLowerCase().includes("title"),
    );
    const statusIndex = headers.findIndex((h) =>
      h.toLowerCase().includes("status"),
    );
    const scoreIndex = headers.findIndex((h) =>
      h.toLowerCase().includes("score"),
    );
    const chaptersReadIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("chapters") &&
        h.toLowerCase().includes("read"),
    );

    if (titleIndex === -1 || statusIndex === -1) {
      throw new Error("CSV file must contain 'title' and 'status' columns");
    }

    // Parse manga entries
    const manga = lines
      .slice(1)
      .map((line) => {
        const values = parseCSVLine(line);
        if (values.length <= Math.max(titleIndex, statusIndex)) {
          return null; // Skip invalid lines
        }

        const entry = {
          title: values[titleIndex],
          status: values[statusIndex] || "reading",
          score:
            scoreIndex !== -1 ? parseFloat(values[scoreIndex]) || 0 : undefined,
          chapters_read:
            chaptersReadIndex !== -1
              ? parseInt(values[chaptersReadIndex]) || 0
              : undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Validate required fields
        if (!entry.title || !entry.status) {
          return null;
        }

        return entry;
      })
      .filter(Boolean) as KenmeiMangaItem[];

    return {
      version: "1.0.0",
      exported_at: new Date().toISOString(),
      manga,
    };
  };

  // Helper function to parse a CSV line correctly (handles quotes, etc.)
  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        // Toggle quotes state
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    // Don't forget the last field
    result.push(current.trim());
    return result;
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " bytes";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-all ${
        isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-300 hover:border-blue-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-gray-800/50"
      }`}
      onClick={handleButtonClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileSelect}
      />

      {!fileName ? (
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="mb-2 rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-medium">Upload Kenmei CSV Export</h3>
          <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">
            Drag and drop your Kenmei CSV export file here
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            or click to browse your files
          </p>
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
              onClick={(e) => {
                e.stopPropagation();
                handleButtonClick();
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Select CSV File
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
            <File className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mb-1 text-lg font-medium">{fileName}</h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {fileSize && formatFileSize(fileSize)}
          </p>
          <Button
            size="sm"
            type="button"
            className="bg-blue-600 text-white shadow-sm hover:bg-blue-700"
            onClick={(e) => {
              e.stopPropagation();
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
                fileInputRef.current.click();
              }
            }}
          >
            Choose Different File
          </Button>
        </div>
      )}
    </div>
  );
}
