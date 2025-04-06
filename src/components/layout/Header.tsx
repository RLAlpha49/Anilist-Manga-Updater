import React from "react";
import { Link } from "@tanstack/react-router";
import ToggleTheme from "../ToggleTheme";
import { Button } from "../ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "../ui/navigation-menu";
import {
  Minimize2,
  Maximize2,
  X,
  Home,
  Download,
  ClipboardCheck,
  Settings as SettingsIcon,
  ArrowUpDown as SyncIcon,
} from "lucide-react";
import {
  minimizeWindow,
  maximizeWindow,
  closeWindow,
} from "../../helpers/window_helpers";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { motion } from "framer-motion";

export function Header() {
  return (
    <TooltipProvider>
      <header className="border-border bg-background/90 sticky top-0 z-40 border-b backdrop-blur-sm">
        <div className="draglayer w-full">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              {/* Logo and title */}
              <Link to="/" className="non-draggable flex items-center">
                <motion.div
                  className="mr-2 flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-purple-600 text-white"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="font-bold">K2A</span>
                </motion.div>
                <h1 className="overflow-hidden font-mono text-lg font-bold whitespace-nowrap">
                  <span className="hidden bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent min-[44rem]:inline">
                    Kenmei to AniList
                  </span>
                  <span className="inline bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent max-[44rem]:inline min-[44rem]:hidden">
                    K2A
                  </span>
                </h1>
              </Link>

              {/* Always visible navigation - icon-only on small screens, icon+text on larger screens */}
              <div className="non-draggable">
                <NavigationMenu>
                  <NavigationMenuList className="flex">
                    <NavigationMenuItem>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to="/">
                            <NavigationMenuLink
                              className={navigationMenuTriggerStyle()}
                            >
                              <Home className="h-4 w-4 flex-shrink-0" />
                              <span className="ml-2 max-lg:hidden">Home</span>
                            </NavigationMenuLink>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="lg:hidden">
                          Home
                        </TooltipContent>
                      </Tooltip>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to="/import">
                            <NavigationMenuLink
                              className={navigationMenuTriggerStyle()}
                            >
                              <Download className="h-4 w-4 flex-shrink-0" />
                              <span className="ml-2 max-lg:hidden">Import</span>
                            </NavigationMenuLink>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="lg:hidden">
                          Import
                        </TooltipContent>
                      </Tooltip>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to="/review">
                            <NavigationMenuLink
                              className={navigationMenuTriggerStyle()}
                            >
                              <ClipboardCheck className="h-4 w-4 flex-shrink-0" />
                              <span className="ml-2 max-lg:hidden">Review</span>
                            </NavigationMenuLink>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="lg:hidden">
                          Review
                        </TooltipContent>
                      </Tooltip>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to="/sync">
                            <NavigationMenuLink
                              className={navigationMenuTriggerStyle()}
                            >
                              <SyncIcon className="h-4 w-4 flex-shrink-0" />
                              <span className="ml-2 max-lg:hidden">Sync</span>
                            </NavigationMenuLink>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="lg:hidden">
                          Sync
                        </TooltipContent>
                      </Tooltip>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to="/settings">
                            <NavigationMenuLink
                              className={navigationMenuTriggerStyle()}
                            >
                              <SettingsIcon className="h-4 w-4 flex-shrink-0" />
                              <span className="ml-2 max-lg:hidden">
                                Settings
                              </span>
                            </NavigationMenuLink>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="lg:hidden">
                          Settings
                        </TooltipContent>
                      </Tooltip>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="non-draggable">
                <ToggleTheme />
              </div>
              <div className="non-draggable flex">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={minimizeWindow}
                      className="h-8 w-8 rounded-full"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Minimize</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={maximizeWindow}
                      className="h-8 w-8 rounded-full"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Maximize</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={closeWindow}
                      className="hover:bg-destructive hover:text-destructive-foreground h-8 w-8 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Close</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
