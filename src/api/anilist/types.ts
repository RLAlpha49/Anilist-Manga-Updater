/**
 * AniList API type definitions
 */

export type MediaListStatus =
  | "CURRENT"
  | "PLANNING"
  | "COMPLETED"
  | "DROPPED"
  | "PAUSED"
  | "REPEATING";

export interface AniListManga {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
  };
  format: string;
  status: string;
  chapters?: number;
}

export interface AniListMediaEntry {
  id?: number;
  mediaId: number;
  status: MediaListStatus;
  progress: number;
  private?: boolean;
  score?: number;
}

export interface AniListUser {
  id: number;
  name: string;
  avatar?: {
    large?: string;
    medium?: string;
  };
}

export interface AniListResponse<T> {
  data: T;
}
