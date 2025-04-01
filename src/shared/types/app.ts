/**
 * Application-wide shared types
 */

export interface AppConfig {
  theme: "light" | "dark" | "system";
  cacheDuration: number; // days
  apiRequestTimeout: number; // milliseconds
  maxConcurrentRequests: number;
  titleMatchThreshold: number; // 0-1
}

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

export interface AuthState {
  token?: string;
  expiresAt?: number;
  userId?: number;
  username?: string;
}

export interface CacheData {
  lastUpdated: number;
  expiresAt: number;
  data: unknown;
}
