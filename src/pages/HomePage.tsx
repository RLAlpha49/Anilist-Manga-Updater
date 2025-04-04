import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
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
  ClipboardCheck,
  ExternalLink,
  ChevronRight,
  LineChart,
  PanelLeftOpen,
  Settings,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getImportStats } from "../utils/storage";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../components/ui/carousel";

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

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

// Feature cards for the carousel
const featureCards = [
  {
    title: "Import From Kenmei",
    description:
      "Easily import your entire manga collection from Kenmei CSV export.",
    icon: <PanelLeftOpen className="h-6 w-6" />,
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "Smart Matching",
    description:
      "Intelligent algorithm matches your manga to AniList entries with high accuracy.",
    icon: <Settings className="h-6 w-6" />,
    color: "from-purple-500 to-fuchsia-600",
  },
  {
    title: "One-Click Sync",
    description:
      "Synchronize your entire collection to AniList with a single click after reviewing.",
    icon: <CheckCheck className="h-6 w-6" />,
    color: "from-green-500 to-emerald-600",
  },
];

export function HomePage() {
  // Get auth state to check authentication status
  const { authState } = useAuth();

  // State for dashboard data
  const [stats, setStats] = useState<StatsState>({
    total: 0,
    reading: 0,
    completed: 0,
    onHold: 0,
    dropped: 0,
    planToRead: 0,
    lastSync: null,
    syncStatus: "none",
  });

  // Load import stats from storage on component mount
  useEffect(() => {
    const importStats = getImportStats();
    if (importStats) {
      // Update stats from stored data
      const statusCounts = importStats.statusCounts || {};
      setStats({
        ...stats,
        total: importStats.total || 0,
        reading: statusCounts.reading || 0,
        completed: statusCounts.completed || 0,
        dropped: statusCounts.dropped || 0,
        onHold: statusCounts.on_hold || 0,
        planToRead: statusCounts.plan_to_read || 0,
        lastSync: importStats.timestamp || null,
      });
    }
  }, []);

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";

    try {
      const date = new Date(dateString);
      return (
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch {
      return "Invalid date";
    }
  };

  return (
    <motion.div
      className="container mx-auto px-4 py-8 md:px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="mb-10"
        variants={itemVariants}
        initial="hidden"
        animate="show"
      >
        <div className="flex flex-col space-y-3">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Dashboard
            </span>
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Welcome to the Kenmei to AniList sync tool. Import and synchronize
            your manga collection with ease.
          </p>
          <Separator className="mt-4" />
        </div>
      </motion.div>

      {/* Feature Carousel */}
      <motion.div
        className="mb-10"
        variants={itemVariants}
        initial="hidden"
        animate="show"
      >
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {featureCards.map((feature, index) => (
              <CarouselItem
                key={index}
                className="pl-4 md:basis-1/2 lg:basis-1/3"
              >
                <div className="p-1">
                  <Card className="overflow-hidden border-none shadow-md">
                    <div className={`h-2 bg-gradient-to-r ${feature.color}`} />
                    <CardContent className="p-6">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-300">
                        {feature.icon}
                      </div>
                      <h3 className="mb-2 text-xl font-semibold">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="mt-4 flex justify-end gap-2">
            <CarouselPrevious className="static translate-y-0" />
            <CarouselNext className="static translate-y-0" />
          </div>
        </Carousel>
      </motion.div>

      <motion.div
        className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-none bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md transition-all hover:shadow-lg dark:from-blue-950/40 dark:to-indigo-950/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl text-blue-700 dark:text-blue-400">
                <Library className="mr-2 h-5 w-5" />
                Imported Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <p className="mb-2 text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.total}
                </p>
                <div className="text-muted-foreground flex items-center text-sm">
                  <Clock className="mr-1 h-3.5 w-3.5 text-blue-500" />
                  {stats.total > 0
                    ? `Last imported: ${formatDate(stats.lastSync)}`
                    : "No items imported yet"}
                </div>
                <BarChart2 className="absolute right-0 bottom-0 h-16 w-16 text-blue-200 dark:text-blue-900/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-none bg-gradient-to-br from-purple-50 to-fuchsia-50 shadow-md transition-all hover:shadow-lg dark:from-purple-950/40 dark:to-fuchsia-950/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl text-purple-700 dark:text-purple-400">
                <Activity className="mr-2 h-5 w-5" />
                Reading Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <p className="mb-2 text-4xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.reading}
                </p>
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                  <Badge
                    variant="outline"
                    className="bg-green-100/50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  >
                    {stats.completed} Completed
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-amber-100/50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                  >
                    {stats.onHold} On Hold
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-blue-100/50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  >
                    {stats.planToRead} Plan to Read
                  </Badge>
                </div>
                <LineChart className="absolute right-0 bottom-0 h-16 w-16 text-purple-200 dark:text-purple-900/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-none bg-gradient-to-br from-green-50 to-emerald-50 shadow-md transition-all hover:shadow-lg dark:from-green-950/40 dark:to-emerald-950/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl text-green-700 dark:text-green-400">
                <ClipboardCheck className="mr-2 h-5 w-5" />
                Match Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <p className="mb-2 text-4xl font-bold text-green-600 dark:text-green-400">
                  {stats.total > 0 ? "Ready" : "-"}
                </p>
                <div className="text-muted-foreground flex items-center text-sm">
                  {stats.total > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-green-100/50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    >
                      Review matches now
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-gray-100/50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400"
                    >
                      Import data first
                    </Badge>
                  )}
                </div>
                <RefreshCw className="absolute right-0 bottom-0 h-16 w-16 text-green-200 dark:text-green-900/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-2"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Sparkles className="mr-2 h-5 w-5 text-blue-500" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Get started with these common tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Button
                  asChild
                  variant="outline"
                  className="h-auto justify-start gap-3 border-blue-200 bg-blue-50 px-4 py-3 text-left transition-all hover:border-blue-300 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:hover:border-blue-800 dark:hover:bg-blue-900/40"
                >
                  <Link to="/import">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800">
                      <Download className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">Import Data</p>
                      <p className="text-xs opacity-70">
                        Upload your Kenmei CSV
                      </p>
                    </div>
                    <ChevronRight className="text-muted-foreground h-4 w-4" />
                  </Link>
                </Button>

                {stats.total > 0 ? (
                  <Button
                    asChild
                    variant="outline"
                    className="h-auto justify-start gap-3 border-green-200 bg-green-50 px-4 py-3 text-left transition-all hover:border-green-300 hover:bg-green-100 dark:border-green-900 dark:bg-green-950/30 dark:hover:border-green-800 dark:hover:bg-green-900/40"
                  >
                    <Link to="/review">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-200 dark:bg-green-800">
                        <ClipboardCheck className="h-5 w-5 text-green-700 dark:text-green-300" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">Review Matches</p>
                        <p className="text-xs opacity-70">
                          Check your manga matches
                        </p>
                      </div>
                      <ChevronRight className="text-muted-foreground h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="outline"
                    className={`h-auto justify-start gap-3 px-4 py-3 text-left transition-all ${
                      authState.isAuthenticated
                        ? "border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100 dark:border-green-900 dark:bg-green-950/30 dark:hover:border-green-800 dark:hover:bg-green-900/40"
                        : "border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:hover:border-blue-800 dark:hover:bg-blue-900/40"
                    }`}
                  >
                    <Link to="/settings">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          authState.isAuthenticated
                            ? "bg-green-200 dark:bg-green-800"
                            : "bg-blue-200 dark:bg-blue-800"
                        }`}
                      >
                        {authState.isAuthenticated ? (
                          <UserCheck className="h-5 w-5 text-green-700 dark:text-green-300" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">
                          {authState.isAuthenticated
                            ? "AniList Connected"
                            : "Connect to AniList"}
                        </p>
                        <p className="text-xs opacity-70">
                          {authState.isAuthenticated
                            ? authState.username || "Authenticated User"
                            : "Setup authentication"}
                        </p>
                      </div>
                      {authState.isAuthenticated ? (
                        <LogOut className="text-muted-foreground h-4 w-4" />
                      ) : (
                        <ChevronRight className="text-muted-foreground h-4 w-4" />
                      )}
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <BookOpen className="mr-2 h-5 w-5 text-blue-500" />
                Getting Started
              </CardTitle>
              <CardDescription>
                Follow these steps to sync your manga collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <motion.div
                  className="hover:bg-accent/50 flex items-start gap-4 rounded-lg p-4 transition-all"
                  whileHover={{ x: 4 }}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white shadow-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium">
                      Connect your AniList account
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Link your account in Settings to enable synchronization
                    </p>
                    {authState.isAuthenticated && (
                      <Badge className="mt-2 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50">
                        Completed
                      </Badge>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  className="hover:bg-accent/50 flex items-start gap-4 rounded-lg p-4 transition-all"
                  whileHover={{ x: 4 }}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-sm font-semibold text-white shadow-sm">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium">Import your Kenmei data</h3>
                    <p className="text-muted-foreground text-sm">
                      Upload your CSV export file from Kenmei
                    </p>
                    {stats.total > 0 && (
                      <Badge className="mt-2 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50">
                        Completed
                      </Badge>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  className="hover:bg-accent/50 flex items-start gap-4 rounded-lg p-4 transition-all"
                  whileHover={{ x: 4 }}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 text-sm font-semibold text-white shadow-sm">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium">Review your matches</h3>
                    <p className="text-muted-foreground text-sm">
                      Verify your manga matches and make corrections if needed
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  className="hover:bg-accent/50 flex items-start gap-4 rounded-lg p-4 transition-all"
                  whileHover={{ x: 4 }}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 text-sm font-semibold text-white shadow-sm">
                    4
                  </div>
                  <div>
                    <h3 className="font-medium">Synchronize to AniList</h3>
                    <p className="text-muted-foreground text-sm">
                      Send your reviewed matches to your AniList account
                    </p>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} initial="hidden" animate="show">
        <Card className="border-none bg-gradient-to-r from-gray-50 to-gray-100 shadow-sm transition-all hover:shadow-md dark:from-gray-950/80 dark:to-gray-900/80">
          <CardContent className="flex flex-col items-center justify-center space-y-2 py-6">
            <p className="text-muted-foreground text-sm">
              Kenmei to AniList Sync Tool • Version 1.0.0
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-normal">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Stable Release
                </div>
              </Badge>
              <a
                href="https://github.com/RLAlpha49/KenmeiToAnilist"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex items-center text-xs font-medium transition-colors"
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                GitHub
              </a>
            </div>
            <p className="text-muted-foreground/60 text-xs">
              Made with ❤️ for manga readers
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
