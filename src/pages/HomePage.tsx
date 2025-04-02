import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpen,
  AlertCircle,
  Clock,
  BarChart2,
  Activity,
  Download,
  Library,
  RefreshCw,
  Sparkles,
  LogOut,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface StatsState {
  total: number;
  reading: number;
  completed: number;
  onHold: number;
  dropped: number;
  planToRead: number;
  lastSync: string | null;
  syncStatus: string;
}

export function HomePage() {
  // Get auth state to check authentication status
  const { authState } = useAuth();

  // Mock state for dashboard data
  const [stats] = useState<StatsState>({
    total: 0,
    reading: 0,
    completed: 0,
    onHold: 0,
    dropped: 0,
    planToRead: 0,
    lastSync: null,
    syncStatus: "none",
  });

  return (
    <div className="container mx-auto px-4 py-6 md:px-6">
      <div className="mb-8">
        <div className="flex flex-col space-y-2">
          <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
            Dashboard
          </h1>
          <p className="max-w-2xl text-gray-600 dark:text-gray-400">
            Welcome to the Kenmei to AniList sync tool. Import and synchronize
            your manga collection.
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="group relative min-w-[250px] overflow-hidden rounded-xl border border-gray-100 bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-blue-500/10 to-transparent"></div>
          <div className="absolute -right-6 -bottom-6 h-32 w-32 transform rounded-full bg-blue-100/30 transition-transform group-hover:scale-110 dark:bg-blue-900/20"></div>
          <div className="relative z-10">
            <h2 className="mb-1 text-sm font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Imported Items
            </h2>
            <p className="mb-1 text-3xl font-bold text-blue-600 dark:text-blue-400">
              {stats.total}
            </p>
            <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Library className="mr-1 h-3.5 w-3.5 text-blue-500" />
              No items imported yet
            </p>
          </div>
          <BarChart2 className="absolute right-2 bottom-0 z-0 h-12 w-12 text-blue-200 dark:text-blue-800/50" />
        </div>

        <div className="group relative min-w-[250px] overflow-hidden rounded-xl border border-gray-100 bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-purple-500/10 to-transparent"></div>
          <div className="absolute -right-6 -bottom-6 h-32 w-32 transform rounded-full bg-purple-100/30 transition-transform group-hover:scale-110 dark:bg-purple-900/20"></div>
          <div className="relative z-10">
            <h2 className="mb-1 text-sm font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Sync Status
            </h2>
            <p className="mb-1 text-3xl font-bold text-purple-600 dark:text-purple-400">
              -
            </p>
            <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <RefreshCw className="mr-1 h-3.5 w-3.5 text-purple-500" />
              Not connected to AniList
            </p>
          </div>
          <Activity className="absolute right-2 bottom-0 z-0 h-12 w-12 text-purple-200 dark:text-purple-800/50" />
        </div>

        <div className="group relative min-w-[250px] overflow-hidden rounded-xl border border-gray-100 bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-green-500/10 to-transparent"></div>
          <div className="absolute -right-6 -bottom-6 h-32 w-32 transform rounded-full bg-green-100/30 transition-transform group-hover:scale-110 dark:bg-green-900/20"></div>
          <div className="relative z-10">
            <h2 className="mb-1 text-sm font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Last Activity
            </h2>
            <p className="mb-1 text-3xl font-bold text-green-600 dark:text-green-400">
              -
            </p>
            <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Clock className="mr-1 h-3.5 w-3.5 text-green-500" />
              No recent activity
            </p>
          </div>
          <Clock className="absolute right-2 bottom-0 z-0 h-12 w-12 text-green-200 dark:text-green-800/50" />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg sm:p-8 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              to="/import"
              className="relative flex min-h-[90px] items-center gap-3 overflow-hidden rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white shadow-sm transition-all hover:from-blue-600 hover:to-purple-700 hover:shadow-md"
            >
              <div className="absolute top-0 left-0 h-full w-full rounded-lg bg-white/5"></div>
              <div className="z-10 rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                <Download className="h-5 w-5" />
              </div>
              <div className="z-10 flex-1">
                <p className="font-medium">Import Data</p>
                <p className="text-xs text-white/80">Upload your Kenmei CSV</p>
              </div>
              <ArrowUpRight className="z-10 h-4 w-4 text-white/70" />
            </Link>

            <Link
              to="/settings"
              className={`flex min-h-[90px] items-center gap-3 rounded-lg border ${
                authState.isAuthenticated
                  ? "border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-900/20"
                  : "border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700"
              } p-4 shadow-sm transition-all hover:shadow-md ${
                authState.isAuthenticated
                  ? "hover:bg-green-100 dark:hover:bg-green-800/30"
                  : "hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              <div
                className={`rounded-lg ${
                  authState.isAuthenticated
                    ? "bg-green-100 dark:bg-green-800/40"
                    : "bg-blue-100 dark:bg-blue-900/30"
                } p-2`}
              >
                {authState.isAuthenticated ? (
                  <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {authState.isAuthenticated
                    ? "AniList Connected"
                    : "Connect to AniList"}
                </p>
                <p
                  className={`text-xs ${
                    authState.isAuthenticated
                      ? "text-green-600/80 dark:text-green-400/80"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {authState.isAuthenticated
                    ? authState.username || "Authenticated User"
                    : "Setup authentication"}
                </p>
              </div>
              {authState.isAuthenticated ? (
                <LogOut className="h-4 w-4 text-green-500 dark:text-green-400" />
              ) : (
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              )}
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg sm:p-8 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
            <BookOpen className="h-5 w-5 text-blue-500" />
            Getting Started
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white">
                1
              </div>
              <div>
                <h3 className="font-medium">Connect your AniList account</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Link your account in Settings to enable synchronization
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-sm font-semibold text-white">
                2
              </div>
              <div>
                <h3 className="font-medium">Import your Kenmei data</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Upload your CSV export file from Kenmei
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 text-sm font-semibold text-white">
                3
              </div>
              <div>
                <h3 className="font-medium">Review and sync your collection</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Verify your manga entries before syncing to AniList
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 text-sm font-semibold text-white">
                4
              </div>
              <div>
                <h3 className="font-medium">Enjoy your synchronized library</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Your Kenmei collection is now on AniList
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white/50 p-6 text-center backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Kenmei to AniList Sync Tool • Version 1.0.0
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Made with ❤️ for manga readers
        </p>
      </div>
    </div>
  );
}
