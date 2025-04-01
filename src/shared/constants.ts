/**
 * Application-wide constants
 */

// AniList API constants
export const ANILIST_API_URL = "https://graphql.anilist.co";
export const ANILIST_OAUTH_URL = "https://anilist.co/api/v2/oauth/authorize";
export const ANILIST_TOKEN_URL = "https://anilist.co/api/v2/oauth/token";

// Default application configuration
export const DEFAULT_CONFIG = {
  theme: "system",
  cacheDuration: 7, // days
  apiRequestTimeout: 10000, // 10 seconds
  maxConcurrentRequests: 5,
  titleMatchThreshold: 0.7,
} as const;

// Default window size
export const DEFAULT_WINDOW_SIZE = {
  width: 1000,
  height: 800,
  isMaximized: false,
} as const;

// Cache keys
export const CACHE_KEYS = {
  TITLE_CACHE: "title_cache",
  FORMAT_CACHE: "format_cache",
  ALTERNATIVE_TITLES_CACHE: "alternative_titles_cache",
  USER_MANGA_LIST: "user_manga_list",
} as const;

// IPC channels
export const IPC_CHANNELS = {
  // File operations
  OPEN_FILE: "open-file",
  SAVE_FILE: "save-file",

  // Authentication
  GET_AUTH_STATE: "get-auth-state",
  SET_AUTH_STATE: "set-auth-state",
  CLEAR_AUTH_STATE: "clear-auth-state",

  // AniList operations
  SEARCH_MANGA: "search-manga",
  GET_USER_MANGA_LIST: "get-user-manga-list",
  UPDATE_MANGA_ENTRY: "update-manga-entry",

  // Cache operations
  GET_CACHE: "get-cache",
  SET_CACHE: "set-cache",
  CLEAR_CACHE: "clear-cache",

  // Settings
  GET_SETTINGS: "get-settings",
  SET_SETTINGS: "set-settings",

  // Window management
  MINIMIZE_WINDOW: "minimize-window",
  MAXIMIZE_WINDOW: "maximize-window",
  CLOSE_WINDOW: "close-window",

  // Theme
  GET_THEME: "get-theme",
  SET_THEME: "set-theme",
} as const;
