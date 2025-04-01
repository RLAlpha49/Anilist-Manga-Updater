import React, { useState } from "react";
import { ErrorMessage } from "../components/ui/error-message";
import { ErrorType, createError, AppError } from "../utils/errorHandling";
import { Button } from "../components/ui/button";
import {
  CheckCircle,
  RefreshCw,
  Trash2,
  Shield,
  Key,
  Database,
  UserCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface AuthState {
  isAuthenticated: boolean;
  username?: string;
  avatarUrl?: string;
  expiresAt?: number;
}

export function SettingsPage() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // This would normally open an OAuth flow with AniList
      // For demonstration, we'll simulate a network error sometimes
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.7) {
            reject(new Error("Authentication failed"));
          } else {
            resolve();
          }
        }, 1500);
      });

      // If successful, update auth state
      setAuthState({
        isAuthenticated: true,
        username: "DemoUser",
        avatarUrl:
          "https://s4.anilist.co/file/anilistcdn/user/avatar/large/default.png",
        expiresAt: Date.now() + 86400000, // 24 hours from now
      });
    } catch {
      setError(
        createError(
          ErrorType.AUTHENTICATION,
          "Failed to authenticate with AniList. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthState({ isAuthenticated: false });
  };

  const handleClearCache = () => {
    // Simulate clearing cache
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  const dismissError = () => {
    setError(null);
  };

  return (
    <div className="container mx-auto px-4 py-6 md:px-6">
      <div className="mb-8">
        <div className="flex flex-col space-y-2">
          <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
            Settings
          </h1>
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

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              <Key className="h-4 w-4" />
            </div>
            AniList Authentication
          </h2>

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
                  onClick={handleLogout}
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
                disabled={isLoading}
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
                This will remove all cached data, including import history and
                temporary files. Your AniList authentication will not be
                affected.
              </p>
              <Button
                onClick={handleClearCache}
                variant="outline"
                className="flex w-full items-center justify-center gap-2 border-blue-300 py-2.5 text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                {cacheCleared ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Cache Cleared
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Clear Cache
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-purple-50 p-6 dark:border-gray-700/50 dark:from-gray-800/50 dark:to-purple-900/10">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-medium">
                <Shield className="h-4 w-4 text-purple-500" />
                Application Info
              </h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center justify-between rounded border border-gray-200 bg-white/80 p-2 dark:border-gray-700 dark:bg-gray-800/80">
                  <span className="font-medium">Version</span>
                  <span>1.0.0</span>
                </div>
                <div className="flex items-center justify-between rounded border border-gray-200 bg-white/80 p-2 dark:border-gray-700 dark:bg-gray-800/80">
                  <span className="font-medium">Last Updated</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between rounded border border-gray-200 bg-white/80 p-2 dark:border-gray-700 dark:bg-gray-800/80">
                  <span className="font-medium">Built with</span>
                  <span>Electron, React, TailwindCSS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
