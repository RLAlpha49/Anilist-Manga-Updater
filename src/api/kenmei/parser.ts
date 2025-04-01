/**
 * Parser for Kenmei export files
 */

import { KenmeiExport, KenmeiManga, KenmeiStatus } from "./types";

/**
 * Parse a Kenmei export file
 * @param fileContent The content of the Kenmei export file as text
 * @returns Parsed Kenmei data
 * @throws Error if the file cannot be parsed
 */
export function parseKenmeiExport(fileContent: string): KenmeiExport {
  try {
    const data = JSON.parse(fileContent);

    // Validate the structure of the data
    if (!data.manga || !Array.isArray(data.manga)) {
      throw new Error("Invalid Kenmei export: missing or invalid manga array");
    }

    // Validate each manga entry
    data.manga.forEach((manga: KenmeiManga, index: number) => {
      if (!manga.title) {
        throw new Error(`Manga at index ${index} is missing a title`);
      }

      if (!manga.status || !isValidStatus(manga.status)) {
        throw new Error(
          `Manga "${manga.title}" has an invalid status: ${manga.status}`,
        );
      }

      if (typeof manga.chapters_read !== "number") {
        throw new Error(
          `Manga "${manga.title}" has an invalid chapters_read value`,
        );
      }
    });

    return data as KenmeiExport;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid JSON format in export file");
    }
    throw error;
  }
}

/**
 * Check if a status value is valid
 * @param status The status to check
 * @returns Whether the status is valid
 */
function isValidStatus(status: string): boolean {
  return [
    "reading",
    "completed",
    "on_hold",
    "dropped",
    "plan_to_read",
  ].includes(status);
}

export const parseKenmeiCsvExport = (csvString: string): KenmeiExport => {
  try {
    // Split the CSV into lines and remove any empty lines
    const lines = csvString
      .split("\n")
      .filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      throw new Error("CSV file does not contain enough data");
    }

    // Get headers from the first line
    const headers = lines[0].split(",").map((header) => header.trim());

    // Validate required headers
    const requiredHeaders = ["title", "status"];
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`CSV is missing required header: ${required}`);
      }
    }

    // Parse manga entries
    const manga: KenmeiManga[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((value) => value.trim());

      // Create an object mapping headers to values
      const entry: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (index < values.length) {
          entry[header] = values[index];
        }
      });

      // Convert to proper types
      const mangaEntry: KenmeiManga = {
        id: parseInt(entry.id || "0"),
        title: entry.title,
        status: validateStatus(entry.status),
        score: parseFloat(entry.score || "0"),
        url: entry.series_url || "",
        cover_url: undefined,
        chapters_read: parseInt(entry.last_chapter_read || "0"),
        total_chapters: undefined,
        notes: entry.notes || "",
        created_at: entry.last_read_at || new Date().toISOString(),
        updated_at: entry.last_read_at || new Date().toISOString(),
      };

      manga.push(mangaEntry);
    }

    // Create the export object
    const kenmeiExport: KenmeiExport = {
      export_date: new Date().toISOString(),
      user: {
        username: "CSV Import User",
        id: 0,
      },
      manga,
    };

    return kenmeiExport;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse CSV: ${error.message}`);
    }
    throw new Error("Failed to parse CSV: Unknown error");
  }
};

// Helper function to validate status
function validateStatus(status: string | undefined): KenmeiStatus {
  // Handle undefined or empty status
  if (!status) {
    return "reading";
  }

  const validStatuses: KenmeiStatus[] = [
    "reading",
    "completed",
    "on_hold",
    "dropped",
    "plan_to_read",
  ];
  const normalized = status.toLowerCase().replace(" ", "_");

  if (validStatuses.includes(normalized as KenmeiStatus)) {
    return normalized as KenmeiStatus;
  }

  // Map common variations
  if (normalized === "planning" || normalized === "plan") return "plan_to_read";
  if (normalized === "hold" || normalized === "paused") return "on_hold";
  if (normalized === "complete" || normalized === "finished")
    return "completed";
  if (normalized === "read" || normalized === "current") return "reading";

  // Default if no match
  return "reading";
}
