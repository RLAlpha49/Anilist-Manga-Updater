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
  title: string;
  status: KenmeiStatus;
  progress: number;
  score?: number;
  last_read_at?: string;
  private?: boolean;
}

export interface KenmeiExport {
  manga: KenmeiManga[];
}

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
