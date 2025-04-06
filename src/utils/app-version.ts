/**
 * App version utility
 * Provides a centralized way to access the application version throughout the app
 */

// For renderer process (React)
export const getAppVersion = (): string => {
  // In renderer process, get from env variable set by the main process
  return import.meta.env.VITE_APP_VERSION || "1.0.0";
};

// For main process (Electron) - use dynamic import since app is only available in main
export const getAppVersionElectron = async (): Promise<string> => {
  try {
    // Only import app in Electron main process
    if (typeof window === "undefined") {
      const electron = await import("electron");
      return electron.app.getVersion();
    }
    // Fallback for renderer process
    return getAppVersion();
  } catch {
    // Fallback if app is not available
    return process.env.npm_package_version || "1.0.0";
  }
};

// Use this to display version with v prefix
export const getFormattedAppVersion = (): string => {
  return `v${getAppVersion()}`;
};
