/**
 * Parser for Kenmei export files
 */

import { KenmeiExport, KenmeiManga } from "./types";

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
    data.manga.forEach((manga: any, index: number) => {
      if (!manga.title) {
        throw new Error(`Manga at index ${index} is missing a title`);
      }

      if (!manga.status || !isValidStatus(manga.status)) {
        throw new Error(
          `Manga "${manga.title}" has an invalid status: ${manga.status}`,
        );
      }

      if (typeof manga.progress !== "number") {
        throw new Error(`Manga "${manga.title}" has an invalid progress value`);
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
