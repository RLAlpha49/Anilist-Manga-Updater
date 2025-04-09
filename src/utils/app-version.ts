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

// Check for updates by comparing current version with the latest GitHub release
export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  releaseUrl: string;
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/RLAlpha49/kenmei-to-anilist/releases/latest",
    );

    if (!response.ok) {
      return {
        hasUpdate: false,
        latestVersion: "",
        releaseUrl: "",
      };
    }

    const data = await response.json();
    const latestVersion = data.tag_name?.replace(/^v/, "") || "";
    const currentVersion = getAppVersion();

    // Simple version comparison (this could be more sophisticated)
    const hasUpdate =
      latestVersion &&
      currentVersion &&
      compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate,
      latestVersion,
      releaseUrl: data.html_url || "",
    };
  } catch (error) {
    console.error("Error checking for updates:", error);
    return {
      hasUpdate: false,
      latestVersion: "",
      releaseUrl: "",
    };
  }
}

// Simple version comparison utility
function compareVersions(v1: string, v2: string): number {
  const v1Parts = v1.split(".").map(Number);
  const v2Parts = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }

  return 0;
}
