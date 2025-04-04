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
  Link,
  ExternalLink,
  XCircle,
  RotateCw,
  InfoIcon,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { APICredentials } from "../types/auth";
import { DEFAULT_ANILIST_CONFIG, DEFAULT_AUTH_PORT } from "../config/anilist";
import { storage } from "../utils/storage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";

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

  // Handler for opening external links in the default browser
  const handleOpenExternal = (url: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.electronAPI?.shell?.openExternal) {
      window.electronAPI.shell.openExternal(url);
    } else {
      // Fallback to regular link behavior if not in Electron
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

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

  const calculateExpiryTime = () => {
    if (!authState.expiresAt) return "unknown";

    const hoursRemaining = Math.round(
      (authState.expiresAt - Date.now()) / 3600000,
    );

    if (hoursRemaining > 24) {
      const days = Math.floor(hoursRemaining / 24);
      const hours = hoursRemaining % 24;
      return `${days}d ${hours}h`;
    }

    return `${hoursRemaining}h`;
  };

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <div className="mb-8 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent">
            Settings
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshPage}
            className="flex items-center gap-1.5"
            title="Refresh page state"
          >
            <RotateCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Configure your AniList authentication and manage application settings.
        </p>
      </div>

      {error && (
        <div className="mb-6">
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
        <Alert className="mb-6" variant="default">
          <ExternalLink className="h-4 w-4" />
          <AlertTitle>Authentication Status</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{statusMessage}</span>
            {isLoading && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelAuth}
                className="ml-auto flex items-center gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:w-auto">
          <TabsTrigger value="account" className="flex items-center gap-1.5">
            <UserCircle className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-1.5">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <Card className="overflow-hidden border-none shadow-md">
            <CardHeader className="mr-2 ml-2 rounded-t-lg rounded-b-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
              <CardTitle className="mt-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                  <Key className="h-4 w-4" />
                </div>
                AniList Authentication
              </CardTitle>
              <CardDescription className="mb-2">
                Connect your AniList account to sync your manga collection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* API Credentials Control */}
              <div className="bg-muted/40 rounded-lg border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-medium">API Credentials</h3>
                    <p className="text-muted-foreground text-xs">
                      Choose which API credentials to use for authentication
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Custom
                    </span>
                    <Switch
                      checked={useCustomCredentials}
                      onCheckedChange={setUseCustomCredentials}
                      disabled={authState.isAuthenticated}
                    />
                  </div>
                </div>

                {authState.isAuthenticated && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      You must log out before changing API credentials
                    </AlertDescription>
                  </Alert>
                )}

                {/* Custom Credentials Fields */}
                {useCustomCredentials && (
                  <div className="space-y-3">
                    <div className="grid gap-1.5">
                      <label className="text-xs font-medium">Client ID</label>
                      <input
                        type="text"
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        disabled={authState.isAuthenticated || isLoading}
                        placeholder="Your AniList Client ID"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-medium">
                        Client Secret
                      </label>
                      <input
                        type="password"
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        disabled={authState.isAuthenticated || isLoading}
                        placeholder="Your AniList Client Secret"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-medium">
                        <Link className="h-3.5 w-3.5" />
                        Redirect URI
                      </label>
                      <input
                        type="text"
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        value={redirectUri}
                        onChange={(e) => setRedirectUri(e.target.value)}
                        disabled={authState.isAuthenticated || isLoading}
                        placeholder={`http://localhost:${DEFAULT_AUTH_PORT}/callback`}
                      />
                      <p className="text-muted-foreground text-xs">
                        Must match the redirect URI registered in your AniList
                        app settings
                      </p>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      You can get these by registering a new client on{" "}
                      <a
                        href="https://anilist.co/settings/developer"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        onClick={handleOpenExternal(
                          "https://anilist.co/settings/developer",
                        )}
                      >
                        AniList Developer Settings
                      </a>
                    </p>
                  </div>
                )}
              </div>

              {authState.isAuthenticated ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-gradient-to-b from-indigo-50 to-purple-50 p-6 dark:from-indigo-950/30 dark:to-purple-950/30">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="relative">
                        <div className="border-background h-20 w-20 overflow-hidden rounded-full border-4 shadow-xl">
                          <img
                            src={authState.avatarUrl}
                            alt={authState.username}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <Badge className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 p-0">
                          <CheckCircle className="h-3 w-3" />
                        </Badge>
                      </div>

                      <div className="text-center">
                        <h3 className="text-xl font-semibold">
                          {authState.username}
                        </h3>
                        <div className="text-muted-foreground mt-1 flex items-center justify-center gap-1.5 text-sm">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Expires in {calculateExpiryTime()}</span>
                        </div>
                        <a
                          href={`https://anilist.co/user/${authState.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-800/40"
                          onClick={handleOpenExternal(
                            `https://anilist.co/user/${authState.username}`,
                          )}
                        >
                          <ExternalLink className="h-3 w-3" />
                          View AniList Profile
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleLogin}
                      disabled={isLoading}
                      variant="outline"
                      className="flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh Token
                    </Button>
                    <Button
                      onClick={logout}
                      variant="destructive"
                      className="flex items-center justify-center gap-2"
                    >
                      <UserCircle className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-600">
                      Not Connected
                    </AlertTitle>
                    <AlertDescription className="text-amber-600">
                      You need to authenticate with AniList to sync your manga
                      collection.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handleLogin}
                    disabled={
                      isLoading ||
                      (useCustomCredentials &&
                        (!clientId || !clientSecret || !redirectUri))
                    }
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    size="lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4 animate-spin"
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
                      </div>
                    ) : (
                      "Connect to AniList"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card className="overflow-hidden border-none shadow-md">
            <CardHeader className="mr-2 ml-2 rounded-t-lg rounded-b-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <CardTitle className="mt-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                  <Database className="h-4 w-4" />
                </div>
                Data Management
              </CardTitle>
              <CardDescription className="mb-2">
                Manage your local data and clear application caches.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <Trash2 className="h-4 w-4 text-blue-500" />
                    Clear Local Cache
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    Select which types of cached data to remove. Your AniList
                    authentication will not be affected.
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="hover:bg-muted flex items-center gap-2 rounded-md p-2">
                      <input
                        type="checkbox"
                        className="border-primary text-primary h-4 w-4 rounded"
                        checked={cachesToClear.search}
                        onChange={(e) =>
                          setCachesToClear({
                            ...cachesToClear,
                            search: e.target.checked,
                          })
                        }
                      />
                      <div>
                        <span className="text-sm font-medium">
                          Search Cache
                        </span>
                        <p className="text-muted-foreground text-xs">
                          Search results
                        </p>
                      </div>
                    </label>

                    <label className="hover:bg-muted flex items-center gap-2 rounded-md p-2">
                      <input
                        type="checkbox"
                        className="border-primary text-primary h-4 w-4 rounded"
                        checked={cachesToClear.manga}
                        onChange={(e) =>
                          setCachesToClear({
                            ...cachesToClear,
                            manga: e.target.checked,
                          })
                        }
                      />
                      <div>
                        <span className="text-sm font-medium">Manga Cache</span>
                        <p className="text-muted-foreground text-xs">
                          Manga metadata
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="hover:bg-muted flex items-center gap-2 rounded-md p-2">
                      <input
                        type="checkbox"
                        className="border-primary text-primary h-4 w-4 rounded"
                        checked={cachesToClear.review}
                        onChange={(e) =>
                          setCachesToClear({
                            ...cachesToClear,
                            review: e.target.checked,
                          })
                        }
                      />
                      <div>
                        <span className="text-sm font-medium">
                          Review Cache
                        </span>
                        <p className="text-muted-foreground text-xs">
                          Matching results
                        </p>
                      </div>
                    </label>

                    <label className="hover:bg-muted flex items-center gap-2 rounded-md p-2">
                      <input
                        type="checkbox"
                        className="border-primary text-primary h-4 w-4 rounded"
                        checked={cachesToClear.import}
                        onChange={(e) =>
                          setCachesToClear({
                            ...cachesToClear,
                            import: e.target.checked,
                          })
                        }
                      />
                      <div>
                        <span className="text-sm font-medium">
                          Import Cache
                        </span>
                        <p className="text-muted-foreground text-xs">
                          Import history
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <label className="hover:bg-muted flex items-center gap-2 rounded-md p-2">
                  <input
                    type="checkbox"
                    className="border-primary text-primary h-4 w-4 rounded"
                    checked={cachesToClear.other}
                    onChange={(e) =>
                      setCachesToClear({
                        ...cachesToClear,
                        other: e.target.checked,
                      })
                    }
                  />
                  <div>
                    <span className="text-sm font-medium">Other Caches</span>
                    <p className="text-muted-foreground text-xs">
                      Miscellaneous application data
                    </p>
                  </div>
                </label>

                <Separator />

                <div className="flex justify-between">
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400"
                    onClick={() =>
                      setCachesToClear({
                        search: true,
                        manga: true,
                        review: true,
                        import: true,
                        other: true,
                      })
                    }
                  >
                    Select All
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400"
                    onClick={() =>
                      setCachesToClear({
                        search: false,
                        manga: false,
                        review: false,
                        import: false,
                        other: false,
                      })
                    }
                  >
                    Deselect All
                  </Button>
                </div>

                <Button
                  onClick={handleClearCache}
                  variant={cacheCleared ? "outline" : "default"}
                  disabled={
                    isClearing || !Object.values(cachesToClear).some(Boolean)
                  }
                  className={`w-full ${
                    cacheCleared
                      ? "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/40"
                      : ""
                  }`}
                >
                  {isClearing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Clearing Cache...
                    </>
                  ) : cacheCleared ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Cache Cleared Successfully
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear Selected Caches
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Application Info Section */}
      <Card className="mt-6 border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            About KenmeiToAniList
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <InfoIcon className="text-muted-foreground h-4 w-4" />
                <p className="text-xs font-medium">Version</p>
              </div>
              <p className="text-muted-foreground ml-6 text-sm">1.0.0</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Key className="text-muted-foreground h-4 w-4" />
                <p className="text-xs font-medium">API Credentials</p>
              </div>
              <p className="text-muted-foreground ml-6 text-sm">
                {authState.credentialSource === "default"
                  ? "Using default"
                  : "Using custom"}
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <UserCircle className="text-muted-foreground h-4 w-4" />
                <p className="text-xs font-medium">Authentication Status</p>
              </div>
              <p className="text-muted-foreground ml-6 text-sm">
                {authState.isAuthenticated ? (
                  <span className="flex items-center gap-1">
                    <Badge
                      variant="default"
                      className="h-1.5 w-1.5 rounded-full bg-green-500 p-0"
                    />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Badge
                      variant="destructive"
                      className="h-1.5 w-1.5 rounded-full p-0"
                    />
                    Not connected
                  </span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
