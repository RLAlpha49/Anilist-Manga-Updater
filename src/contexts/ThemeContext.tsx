import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeMode } from "@/types/theme-mode";
import {
  setTheme,
  getCurrentTheme,
  ThemePreferences,
} from "@/helpers/theme_helpers";

interface ThemeContextType {
  theme: ThemePreferences;
  isDarkMode: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<boolean>;
  toggleTheme: () => Promise<boolean>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreferences>({
    system: "light",
    local: null,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Get current theme state
        const currentTheme = await getCurrentTheme();
        setThemeState(currentTheme);

        // Set dark mode state based on active theme
        const activeTheme = currentTheme.local || currentTheme.system;
        setIsDarkMode(activeTheme === "dark");

        // Apply theme to document
        if (activeTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch (error) {
        console.error("Failed to initialize theme:", error);
      }
    };

    initializeTheme();

    // Set up event listener for theme changes from other components
    const handleThemeChange = async () => {
      const currentTheme = await getCurrentTheme();
      setThemeState(currentTheme);
      setIsDarkMode(currentTheme.local === "dark");
    };

    document.addEventListener("themeToggled", handleThemeChange);
    return () => {
      document.removeEventListener("themeToggled", handleThemeChange);
    };
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    const newIsDarkMode = await setTheme(mode);
    setThemeState(await getCurrentTheme());
    setIsDarkMode(newIsDarkMode);
    return newIsDarkMode;
  };

  const toggleTheme = async () => {
    const newTheme = theme.local === "dark" ? "light" : "dark";
    return await setThemeMode(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, isDarkMode, setThemeMode, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
