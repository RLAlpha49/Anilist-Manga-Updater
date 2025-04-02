import React, { useState, useRef } from "react";
import { UploadCloud, File, FileText } from "lucide-react";
import { Button } from "../ui/button";
import { KenmeiData } from "../../types/kenmei";
import { createError, ErrorType, AppError } from "../../utils/errorHandling";
import { parseKenmeiCsvExport } from "../../api/kenmei/parser";

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
        
        // Use our parser function from api/kenmei/parser.ts
        const parsedData = parseKenmeiCsvExport(content);
        
        if (!parsedData || !parsedData.manga || parsedData.manga.length === 0) {
          onError(
            createError(
              ErrorType.VALIDATION,
              "No manga entries found in the CSV file. Please check the file format.",
            ),
          );
          return;
        }
        
        // Convert to our app's expected format
        const kenmeiData: KenmeiData = {
          version: "1.0.0",
          exported_at: parsedData.export_date,
          manga: parsedData.manga.map(manga => ({
            title: manga.title,
            status: manga.status,
            score: manga.score,
            chapters_read: manga.chapters_read,
            volumes_read: manga.volumes_read,
            created_at: manga.created_at,
            updated_at: manga.updated_at,
            notes: manga.notes,
            url: manga.url,
          })),
        };
        
        onFileLoaded(kenmeiData);
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
