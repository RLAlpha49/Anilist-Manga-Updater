import React, { useState, useEffect, useRef } from "react";
import { ErrorMessage } from "../components/ui/error-message";
import { ErrorType, createError, AppError } from "../utils/errorHandling";
import { Button } from "../components/ui/button";
import {
  CheckCircle,
  RefreshCw,
  Trash2,
  Key,
  Database,
  UserCircle,
  Clock,
  AlertTriangle,
  Settings,
  Link,
  ExternalLink,
  XCircle,
  RotateCw,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { APICredentials } from "../types/auth";
import { DEFAULT_ANILIST_CONFIG, DEFAULT_AUTH_PORT } from "../config/anilist";
import { storage } from "../utils/storage";

export function SettingsPage() {
  const {
    authState,
    login,
    logout,
    isLoading,
    error: authError,
    statusMessage,
    setCredentialSource,
    updateCustomCredentials,
    customCredentials,
  } = useAuth();

  // Add a ref to track the previous credential source to prevent loops
  const prevCredentialSourceRef = useRef<"default" | "custom">(
    authState.credentialSource,
  );

  const [error, setError] = useState<AppError | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [cachesToClear, setCachesToClear] = useState({
    search: true,
    manga: true,
    review: true,
    import: true,
    other: true,
  });
  const [useCustomCredentials, setUseCustomCredentials] = useState(
    authState.credentialSource === "custom",
  );
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState(
    `http://localhost:${DEFAULT_AUTH_PORT}/callback`,
  );

  // Track previous credential values to prevent unnecessary updates
  const prevCredentialsRef = useRef({
    id: "",
    secret: "",
    uri: "",
  });

  // Update error state when auth error changes
  useEffect(() => {
    if (authError) {
      setError(createError(ErrorType.AUTHENTICATION, authError));
    } else {
      setError(null);
    }
  }, [authError]);

  // Update credential source when toggle changes, but avoid infinite loop
  useEffect(() => {
    const newSource = useCustomCredentials ? "custom" : "default";
    // Only update if actually changed and not from authState sync
    if (newSource !== prevCredentialSourceRef.current) {
      prevCredentialSourceRef.current = newSource;
      setCredentialSource(newSource);
    }
  }, [useCustomCredentials, setCredentialSource]);

  // Update local state if authState.credentialSource changes externally
  useEffect(() => {
    if (authState.credentialSource !== prevCredentialSourceRef.current) {
      prevCredentialSourceRef.current = authState.credentialSource;
      setUseCustomCredentials(authState.credentialSource === "custom");
    }
  }, [authState.credentialSource]);

  // Update custom credentials when fields change
  useEffect(() => {
    if (useCustomCredentials && clientId && clientSecret && redirectUri) {
      // Only update if values actually changed
      if (
        clientId !== prevCredentialsRef.current.id ||
        clientSecret !== prevCredentialsRef.current.secret ||
        redirectUri !== prevCredentialsRef.current.uri
      ) {
        // Update the ref
        prevCredentialsRef.current = {
          id: clientId,
          secret: clientSecret,
          uri: redirectUri,
        };

        // Update context
        updateCustomCredentials(clientId, clientSecret, redirectUri);
      }
    }
  }, [
    useCustomCredentials,
    clientId,
    clientSecret,
    redirectUri,
    updateCustomCredentials,
  ]);

  // Reset error when auth state changes
  useEffect(() => {
    if (authState.isAuthenticated) {
      setError(null);
    }
  }, [authState.isAuthenticated]);

  // Add a timeout to detect stuck loading state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (isLoading) {
      // If loading state persists for more than 20 seconds, trigger a refresh
      timeoutId = setTimeout(() => {
        console.log(
          "Loading state persisted for too long - triggering refresh",
        );
        handleRefreshPage();
      }, 20000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading]);

  // Add a useEffect to load custom credential settings from localStorage on initial mount
  useEffect(() => {
    try {
      // Load custom credentials toggle state
      const savedUseCustom = storage.getItem("useCustomCredentials");
      if (savedUseCustom) {
        setUseCustomCredentials(JSON.parse(savedUseCustom));
      }

      // Load saved custom credentials if they exist
      const savedCustomCreds = storage.getItem("customCredentials");
      if (savedCustomCreds) {
        const credentials = JSON.parse(savedCustomCreds);
        setClientId(credentials.clientId || "");
        setClientSecret(credentials.clientSecret || "");
        setRedirectUri(
          credentials.redirectUri ||
            `http://localhost:${DEFAULT_AUTH_PORT}/callback`,
        );

        // Also update context with saved credentials
        if (
          credentials.clientId &&
          credentials.clientSecret &&
          credentials.redirectUri
        ) {
          updateCustomCredentials(
            credentials.clientId,
            credentials.clientSecret,
            credentials.redirectUri,
          );
        }
      }
    } catch (err) {
      console.error("Failed to load saved credential settings:", err);
    }
  }, []);

  // Save custom credentials toggle state whenever it changes
  useEffect(() => {
    storage.setItem(
      "useCustomCredentials",
      JSON.stringify(useCustomCredentials),
    );
  }, [useCustomCredentials]);

  // Save custom credentials whenever they change
  useEffect(() => {
    if (clientId || clientSecret || redirectUri) {
      storage.setItem(
        "customCredentials",
        JSON.stringify({
          clientId,
          clientSecret,
          redirectUri,
        }),
      );
    }
  }, [clientId, clientSecret, redirectUri]);

  // Initialize fields from customCredentials prop when it changes
  useEffect(() => {
    if (customCredentials) {
      // Use refs to avoid unnecessary state updates
      if (clientId !== customCredentials.clientId) {
        setClientId(customCredentials.clientId);
      }
      if (clientSecret !== customCredentials.clientSecret) {
        setClientSecret(customCredentials.clientSecret);
      }
      if (redirectUri !== customCredentials.redirectUri) {
        setRedirectUri(customCredentials.redirectUri);
      }
    }
  }, [customCredentials]);

  const handleLogin = async () => {
    try {
      // Create credentials object based on source
      const credentials: APICredentials = useCustomCredentials
        ? {
            source: "custom",
            clientId,
            clientSecret,
            redirectUri,
          }
        : {
            source: "default",
            clientId: DEFAULT_ANILIST_CONFIG.clientId,
            clientSecret: DEFAULT_ANILIST_CONFIG.clientSecret,
            redirectUri: DEFAULT_ANILIST_CONFIG.redirectUri,
          };

      await login(credentials);
    } catch (err: unknown) {
      setError(
        createError(
          ErrorType.AUTHENTICATION,
          err instanceof Error
            ? err.message
            : "Failed to authenticate with AniList. Please try again.",
        ),
      );
    }
  };

  const handleCancelAuth = () => {
    window.electronAuth.cancelAuth();
  };

  const handleClearCache = async () => {
    try {
      // Start clearing process and show loading state
      setCacheCleared(false);
      setIsClearing(true);
      setError(null);

      // Get all cache clearing functions
      const { clearMangaCache, cacheDebugger } = await import(
        "../api/matching/manga-search-service"
      );
      const { clearSearchCache } = await import("../api/anilist/client");
      const { STORAGE_KEYS } = await import("../utils/storage");

      console.log("🧹 Starting selective cache clearing...");

      // Define which localStorage keys belong to which cache type
      const cacheKeysByType = {
        search: ["anilist_search_cache"],
        manga: ["anilist_manga_cache"],
        review: [
          "match_results",
          "manga_matches",
          "review_progress",
          "pending_manga",
          "matching_progress",
        ],
        import: ["kenmei_data", "import_history", "import_stats"],
        other: [
          "title_cache",
          "format_cache",
          "alternative_titles_cache",
          "user_manga_list",
          "anilist_user_manga",
          "cache_version",
        ],
      };

      // Additional keys from STORAGE_KEYS constant
      if (STORAGE_KEYS) {
        Object.entries(STORAGE_KEYS).forEach(([key, value]) => {
          if (typeof value === "string") {
            // Add to appropriate category based on key name
            if (key.includes("MATCH") || key.includes("REVIEW")) {
              if (!cacheKeysByType.review.includes(value)) {
                cacheKeysByType.review.push(value);
              }
            } else if (key.includes("IMPORT")) {
              if (!cacheKeysByType.import.includes(value)) {
                cacheKeysByType.import.push(value);
              }
            } else if (key.includes("CACHE")) {
              if (!cacheKeysByType.other.includes(value)) {
                cacheKeysByType.other.push(value);
              }
            }
          }
        });
      }

      // Keep track of which caches were cleared for user feedback
      const clearedCacheTypes = [];

      // Clear Search Cache if selected
      if (cachesToClear.search) {
        clearSearchCache();
        clearedCacheTypes.push("search");
        console.log("🧹 Search cache cleared");
      }

      // Clear Manga Cache if selected
      if (cachesToClear.manga) {
        clearMangaCache();
        clearedCacheTypes.push("manga");
        console.log("🧹 Manga cache cleared");
      }

      // If both search and manga are selected, use the full reset
      if (cachesToClear.search && cachesToClear.manga) {
        cacheDebugger.resetAllCaches();
        console.log("🧹 All in-memory caches reset");
      }

      // Get all localStorage keys to clear based on selections
      const keysToRemove: string[] = [];

      Object.entries(cachesToClear).forEach(([type, selected]) => {
        if (selected && cacheKeysByType[type as keyof typeof cacheKeysByType]) {
          keysToRemove.push(
            ...cacheKeysByType[type as keyof typeof cacheKeysByType],
          );
        }
      });

      // Remove duplicates
      const uniqueKeysToRemove = [...new Set(keysToRemove)];

      console.log(
        "🧹 Clearing the following localStorage keys:",
        uniqueKeysToRemove,
      );

      // Clear selected localStorage keys
      uniqueKeysToRemove.forEach((cacheKey) => {
        try {
          localStorage.removeItem(cacheKey);
          console.log(`🧹 Cleared cache: ${cacheKey}`);
        } catch (e) {
          console.warn(`Failed to clear cache: ${cacheKey}`, e);
        }
      });

      // Clear IndexedDB if any cache is selected
      if (Object.values(cachesToClear).some(Boolean)) {
        try {
          const DBDeleteRequest =
            window.indexedDB.deleteDatabase("anilist-cache");
          DBDeleteRequest.onsuccess = () =>
            console.log("🧹 Successfully deleted IndexedDB database");
          DBDeleteRequest.onerror = () =>
            console.error("Error deleting IndexedDB database");
          clearedCacheTypes.push("indexeddb");
        } catch (e) {
          console.warn("Failed to clear IndexedDB:", e);
        }
      }

      console.log("🧹 Selected caches cleared");

      // Show success message
      setCacheCleared(true);

      // Create a summary of cleared caches for user feedback
      const clearedSummary = Object.entries(cachesToClear)
        .filter(([, selected]) => selected)
        .map(([type]) => `✅ Cleared ${type} cache`)
        .join("\n");

      // Show a detailed summary to the user
      try {
        window.alert(
          "Cache Cleared Successfully!\n\n" +
            clearedSummary +
            "\n\nYou may need to restart the application for all changes to take effect.",
        );
      } catch (e) {
        console.warn("Failed to show alert:", e);
      }

      setTimeout(() => setCacheCleared(false), 5000);

      // Remove loading state
      setIsClearing(false);
    } catch (error) {
      console.error("Error clearing cache:", error);
      setError(
        createError(
          ErrorType.SYSTEM,
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while clearing cache",
        ),
      );
      setIsClearing(false);
    }
  };

  const dismissError = () => {
    setError(null);
  };

  const handleRefreshPage = () => {
    // Clear error states and status messages
    setError(null);
    window.location.reload();
  };

  return (
    <div className="container mx-auto px-4 py-6 md:px-6">
      <div className="mb-8">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
              Settings
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshPage}
              className="flex items-center gap-1"
              title="Refresh page state"
            >
              <RotateCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
          <p className="max-w-2xl text-gray-600 dark:text-gray-400">
            Configure your AniList authentication and manage application
            settings.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-8">
          <ErrorMessage
            message={error.message}
            type={error.type}
            dismiss={dismissError}
            retry={
              error.type === ErrorType.AUTHENTICATION ? handleLogin : undefined
            }
          />
        </div>
      )}

      {statusMessage && !error && (
        <div className="mb-8 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/30">
          <div className="flex items-center">
            <div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-800">
              <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Authentication Status
              </h3>
              <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                {statusMessage}
              </div>
            </div>
            {isLoading && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelAuth}
                className="flex items-center gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/50"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              <Key className="h-4 w-4" />
            </div>
            AniList Authentication
          </h2>

          {/* API Credentials Toggle */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Settings className="h-4 w-4" />
              API Credentials
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Use custom API credentials
              </span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={useCustomCredentials}
                  onChange={(e) => setUseCustomCredentials(e.target.checked)}
                  disabled={authState.isAuthenticated}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-indigo-600 peer-focus:ring-4 peer-focus:ring-indigo-300 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:bg-indigo-500 dark:peer-focus:ring-indigo-800"></div>
              </label>
            </div>

            {authState.isAuthenticated && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mr-1 inline-block h-3 w-3" />
                You must log out before changing API credentials
              </p>
            )}

            {/* Custom Credentials Fields */}
            {useCustomCredentials && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Client ID
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    disabled={authState.isAuthenticated || isLoading}
                    placeholder="Your AniList Client ID"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-md border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    disabled={authState.isAuthenticated || isLoading}
                    placeholder="Your AniList Client Secret"
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                    <Link className="h-3.5 w-3.5" />
                    Redirect URI
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                    value={redirectUri}
                    onChange={(e) => setRedirectUri(e.target.value)}
                    disabled={authState.isAuthenticated || isLoading}
                    placeholder={`http://localhost:${DEFAULT_AUTH_PORT}/callback`}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Must match the redirect URI registered in your AniList app
                    settings
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  You can get these by registering a new client on{" "}
                  <a
                    href="https://anilist.co/settings/developer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    AniList Developer Settings
                  </a>
                </p>
              </div>
            )}
          </div>

          {authState.isAuthenticated ? (
            <div>
              <div className="mb-6 flex flex-col items-center gap-4 rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-purple-50 p-6 text-center dark:border-indigo-800/30 dark:from-indigo-900/20 dark:to-purple-900/20">
                <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-indigo-200 bg-white shadow-md dark:border-indigo-700 dark:bg-gray-800">
                  <img
                    src={authState.avatarUrl}
                    alt={authState.username}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-xl font-medium">{authState.username}</p>
                  <div className="mt-1 flex items-center justify-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Session expires in{" "}
                      {authState.expiresAt
                        ? Math.round(
                            (authState.expiresAt - Date.now()) / 3600000,
                          )
                        : 0}{" "}
                      hours
                    </span>
                  </div>
                </div>

                <div className="mt-2 w-full rounded-lg border border-indigo-100 bg-white p-3 text-sm dark:border-indigo-800/30 dark:bg-gray-800">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="mr-1 h-3 w-3" /> Connected
                  </span>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Your AniList account is connected and ready to sync.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleLogin}
                  disabled={isLoading}
                  variant="outline"
                  className="flex flex-1 items-center justify-center gap-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Token
                </Button>
                <Button
                  onClick={logout}
                  variant="destructive"
                  className="flex flex-1 items-center justify-center gap-2"
                >
                  <UserCircle className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="mb-6 flex flex-1 flex-col items-center rounded-xl border border-yellow-100 bg-gradient-to-br from-yellow-50 to-amber-50 p-6 text-center dark:border-yellow-800/20 dark:from-yellow-900/10 dark:to-amber-900/10">
                <div className="mb-4 rounded-full bg-yellow-100 p-3 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <p className="mb-1 text-lg font-medium">Not Connected</p>
                <p className="mb-4 max-w-md text-gray-600 dark:text-gray-400">
                  You need to authenticate with AniList to sync your manga
                  collection and manage your library.
                </p>
                <div className="my-2 h-1 w-16 rounded-full bg-gradient-to-r from-yellow-300 to-amber-300 dark:from-yellow-600 dark:to-amber-600"></div>
                <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                  This will open AniList&apos;s authentication page in a new
                  window.
                </p>
              </div>

              <Button
                onClick={handleLogin}
                disabled={
                  isLoading ||
                  (useCustomCredentials &&
                    (!clientId || !clientSecret || !redirectUri))
                }
                className={`w-full justify-center py-3 ${isLoading ? "bg-indigo-400" : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"} flex items-center gap-2 rounded-lg font-medium text-white shadow-md transition-all hover:shadow-lg`}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="mr-2 -ml-1 h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  "Connect to AniList"
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <Database className="h-4 w-4" />
            </div>
            Data Management
          </h2>

          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50 p-6 dark:border-gray-700/50 dark:from-gray-800/50 dark:to-blue-900/10">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-medium">
                <Trash2 className="h-4 w-4 text-blue-500" />
                Clear Local Cache
              </h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Select which types of cached data to remove. Your AniList
                authentication will not be affected.
              </p>

              <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-800/30 dark:bg-blue-900/10">
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-blue-100/50 dark:hover:bg-blue-800/20">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 dark:border-blue-600 dark:bg-gray-700"
                    checked={cachesToClear.search}
                    onChange={(e) =>
                      setCachesToClear({
                        ...cachesToClear,
                        search: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Search Cache
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    (search results)
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-blue-100/50 dark:hover:bg-blue-800/20">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 dark:border-blue-600 dark:bg-gray-700"
                    checked={cachesToClear.manga}
                    onChange={(e) =>
                      setCachesToClear({
                        ...cachesToClear,
                        manga: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Manga Cache
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    (manga metadata)
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-blue-100/50 dark:hover:bg-blue-800/20">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 dark:border-blue-600 dark:bg-gray-700"
                    checked={cachesToClear.review}
                    onChange={(e) =>
                      setCachesToClear({
                        ...cachesToClear,
                        review: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Review Cache
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    (matching results)
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-blue-100/50 dark:hover:bg-blue-800/20">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 dark:border-blue-600 dark:bg-gray-700"
                    checked={cachesToClear.import}
                    onChange={(e) =>
                      setCachesToClear({
                        ...cachesToClear,
                        import: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Import Cache
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    (import history)
                  </span>
                </label>
                <label className="col-span-2 flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-blue-100/50 dark:hover:bg-blue-800/20">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 dark:border-blue-600 dark:bg-gray-700"
                    checked={cachesToClear.other}
                    onChange={(e) =>
                      setCachesToClear({
                        ...cachesToClear,
                        other: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Other Caches
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    (miscellaneous data)
                  </span>
                </label>

                <div className="col-span-2 mt-2 flex justify-between border-t border-blue-100 pt-2 dark:border-blue-800/30">
                  <button
                    onClick={() =>
                      setCachesToClear({
                        search: true,
                        manga: true,
                        review: true,
                        import: true,
                        other: true,
                      })
                    }
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() =>
                      setCachesToClear({
                        search: false,
                        manga: false,
                        review: false,
                        import: false,
                        other: false,
                      })
                    }
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <Button
                onClick={handleClearCache}
                variant="outline"
                disabled={
                  isClearing || !Object.values(cachesToClear).some(Boolean)
                }
                className={`flex w-full items-center justify-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 ${
                  cacheCleared
                    ? "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    : ""
                }`}
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Clearing Cache...
                  </>
                ) : cacheCleared ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Cache Cleared Successfully
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Clear Selected Caches
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Application Info Section */}
      <div className="mt-8 rounded-lg border border-gray-100 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-medium">About KenmeiToAniList</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Version
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">1.0.0</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              API Credentials
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {authState.credentialSource === "default"
                ? "Using default"
                : "Using custom"}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Authentication Status
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {authState.isAuthenticated ? "Connected" : "Not connected"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
