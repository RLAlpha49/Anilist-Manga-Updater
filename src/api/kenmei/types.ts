/**
 * Types for Kenmei data processing
 */

export type KenmeiStatus =
  | "reading"
  | "completed"
  | "on_hold"
  | "dropped"
  | "plan_to_read";

export interface KenmeiManga {
  id: number;
  title: string;
  status: KenmeiStatus;
  score: number;
  url: string;
  cover_url?: string;
  chapters_read: number;
  total_chapters?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface KenmeiExport {
  export_date: string;
  user: {
    username: string;
    id: number;
  };
  manga: KenmeiManga[];
}

export const parseKenmeiExport = (jsonString: string): KenmeiExport => {
  try {
    const parsed = JSON.parse(jsonString);

    // Basic validation
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid Kenmei export: Not a valid JSON object");
    }

    if (!parsed.export_date || !parsed.user || !Array.isArray(parsed.manga)) {
      throw new Error("Invalid Kenmei export: Missing required fields");
    }

    return parsed as KenmeiExport;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse Kenmei export: ${error.message}`);
    }
    throw new Error("Failed to parse Kenmei export: Unknown error");
  }
};

export interface MangaMatch {
  kenmei: KenmeiManga;
  anilist: {
    id: number;
    title: {
      romaji: string;
      english: string | null;
      native: string | null;
    };
    matchConfidence: number;
  } | null;
}

// Status mapping from Kenmei to AniList
export const STATUS_MAPPING: Record<KenmeiStatus, string> = {
  reading: "CURRENT",
  completed: "COMPLETED",
  on_hold: "PAUSED",
  dropped: "DROPPED",
  plan_to_read: "PLANNING",
};
