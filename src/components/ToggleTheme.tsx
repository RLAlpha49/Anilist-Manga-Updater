import { Moon, Sun } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  toggleTheme,
  syncThemeWithLocal,
  getCurrentTheme,
} from "@/helpers/theme_helpers";

export default function ToggleTheme() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Initialize theme from localStorage on component mount
    syncThemeWithLocal();

    // Check current theme and update icon state
    const updateThemeIcon = async () => {
      const { local, system } = await getCurrentTheme();
      // If local theme is set, use it, otherwise use system theme
      const currentTheme = local || system;
      setIsDarkMode(currentTheme === "dark");
    };

    updateThemeIcon();

    // Set up event listener for theme changes
    const handleToggle = async () => {
      // Small delay to ensure the theme is updated in localStorage
      setTimeout(async () => {
        const { local } = await getCurrentTheme();
        setIsDarkMode(local === "dark");
      }, 50);
    };

    document.addEventListener("themeToggled", handleToggle);

    return () => {
      document.removeEventListener("themeToggled", handleToggle);
    };
  }, []);

  const handleThemeToggle = async () => {
    await toggleTheme();
    // Dispatch custom event for theme changes
    document.dispatchEvent(new CustomEvent("themeToggled"));
  };

  return (
    <Button onClick={handleThemeToggle} size="icon">
      {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  );
}
