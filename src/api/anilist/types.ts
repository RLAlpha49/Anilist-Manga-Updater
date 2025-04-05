/**
 * AniList API type definitions
 */

import { KenmeiManga } from "../kenmei/types";

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
  synonyms?: string[];
  description?: string;
  format: string;
  status: string;
  chapters?: number;
  volumes?: number;
  countryOfOrigin?: string;
  source?: string;
  coverImage?: {
    large?: string;
    medium?: string;
  };
  genres?: string[];
  tags?: {
    id: number;
    name: string;
    category?: string;
  }[];
  startDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
  staff?: {
    edges: {
      node: {
        id: number;
        name: {
          full: string;
        };
        role: string;
      };
    }[];
  };
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

export interface PageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
  perPage: number;
}

export interface SearchResult<T> {
  Page: {
    pageInfo: PageInfo;
    media: T[];
  };
}

// Manga match types
export interface MangaMatch {
  coverImage?:
    | {
        medium?: string;
        large?: string;
      }
    | string;
  format?: string;
  status?: string;
  chapters?: number;
  title?: string;
  id?: number;
  manga: AniListManga;
  confidence: number;
}

export type MatchStatus = "pending" | "matched" | "manual" | "skipped";

export interface MangaMatchResult {
  kenmeiManga: KenmeiManga;
  anilistMatches?: MangaMatch[];
  selectedMatch?: AniListManga;
  status: MatchStatus;
  matchDate?: Date;
}

/**
 * A simplified representation of a user's AniList media entry
 */
export interface UserMediaEntry {
  id: number;
  mediaId: number;
  status: string;
  progress: number;
  score: number;
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
  };
}

/**
 * A map of mediaId to media entries for quick lookup
 */
export type UserMediaList = Record<number, UserMediaEntry>;
