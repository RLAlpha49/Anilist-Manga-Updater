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
import { Minimize2, Maximize2, X } from "lucide-react";
import {
  minimizeWindow,
  maximizeWindow,
  closeWindow,
} from "../../helpers/window_helpers";

// Import the window context for window controls
declare global {
  interface Window {
    electronAPI: {
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
      };
      shell: {
        openExternal: (url: string) => void;
      };
    };
  }
}

export function Header() {
  return (
    <header className="border-border bg-background sticky top-0 z-40 border-b">
      <div className="draglayer w-full">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <h1 className="font-mono text-xl font-bold">Kenmei to AniList</h1>

            <div className="non-draggable">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <Link to="/">
                      <NavigationMenuLink
                        className={navigationMenuTriggerStyle()}
                      >
                        Home
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link to="/import">
                      <NavigationMenuLink
                        className={navigationMenuTriggerStyle()}
                      >
                        Import
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link to="/review">
                      <NavigationMenuLink
                        className={navigationMenuTriggerStyle()}
                      >
                        Review
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <Link to="/settings">
                      <NavigationMenuLink
                        className={navigationMenuTriggerStyle()}
                      >
                        Settings
                      </NavigationMenuLink>
                    </Link>
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
              <Button
                variant="ghost"
                size="icon"
                onClick={minimizeWindow}
                className="h-8 w-8"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={maximizeWindow}
                className="h-8 w-8"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeWindow}
                className="hover:bg-destructive hover:text-destructive-foreground h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
