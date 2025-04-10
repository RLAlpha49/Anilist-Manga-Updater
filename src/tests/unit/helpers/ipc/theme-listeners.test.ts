import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  THEME_MODE_CURRENT_CHANNEL,
  THEME_MODE_DARK_CHANNEL,
  THEME_MODE_LIGHT_CHANNEL,
  THEME_MODE_SYSTEM_CHANNEL,
  THEME_MODE_TOGGLE_CHANNEL,
} from "@/helpers/ipc/theme/theme-channels";
import { ipcMain, nativeTheme } from "electron";

// Mock the electron module before any imports
vi.mock("electron", () => {
  return {
    ipcMain: {
      handle: vi.fn(),
    },
    nativeTheme: {
      shouldUseDarkColors: false,
      themeSource: "system",
    },
  };
});

// Mock LocalStorage
const mockLocalStorage = {
  get: vi.fn(),
  set: vi.fn(),
};

// Import the module after the mocks are set up
import { addThemeEventListeners } from "@/helpers/ipc/theme/theme-listeners";

describe("theme-listeners", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Reset native theme default values
    nativeTheme.shouldUseDarkColors = false;
    nativeTheme.themeSource = "system";
  });

  describe("addThemeEventListeners", () => {
    it("should register listeners for theme events", () => {
      // Act
      addThemeEventListeners();

      // Assert - check event registration
      expect(ipcMain.handle).toHaveBeenCalledWith(
        THEME_MODE_CURRENT_CHANNEL,
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        THEME_MODE_TOGGLE_CHANNEL,
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        THEME_MODE_DARK_CHANNEL,
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        THEME_MODE_LIGHT_CHANNEL,
        expect.any(Function),
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        THEME_MODE_SYSTEM_CHANNEL,
        expect.any(Function),
      );
    });

    it("should return the current theme source when current handler is called", () => {
      // Arrange
      nativeTheme.themeSource = "dark";
      addThemeEventListeners();

      // Get the current theme handler function
      const currentHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === THEME_MODE_CURRENT_CHANNEL,
      )[1];

      // Act
      const result = currentHandler();

      // Assert
      expect(result).toBe("dark");
    });

    it("should toggle from light to dark and return true when toggle handler is called and theme is light", () => {
      // Arrange
      nativeTheme.shouldUseDarkColors = false;
      addThemeEventListeners();

      // Get the toggle handler function
      const toggleHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === THEME_MODE_TOGGLE_CHANNEL,
      )[1];

      // Act
      const result = toggleHandler();

      // Assert
      expect(nativeTheme.themeSource).toBe("dark");
      expect(result).toBe(nativeTheme.shouldUseDarkColors);
    });

    it("should toggle from dark to light and return false when toggle handler is called and theme is dark", () => {
      // Arrange
      nativeTheme.shouldUseDarkColors = true;
      addThemeEventListeners();

      // Get the toggle handler function
      const toggleHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === THEME_MODE_TOGGLE_CHANNEL,
      )[1];

      // Act
      const result = toggleHandler();

      // Assert
      expect(nativeTheme.themeSource).toBe("light");
      expect(result).toBe(nativeTheme.shouldUseDarkColors);
    });

    it("should set theme to dark when dark handler is called", () => {
      // Arrange
      addThemeEventListeners();

      // Get the dark handler function
      const darkHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === THEME_MODE_DARK_CHANNEL,
      )[1];

      // Act
      darkHandler();

      // Assert
      expect(nativeTheme.themeSource).toBe("dark");
    });

    it("should set theme to light when light handler is called", () => {
      // Arrange
      addThemeEventListeners();

      // Get the light handler function
      const lightHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === THEME_MODE_LIGHT_CHANNEL,
      )[1];

      // Act
      lightHandler();

      // Assert
      expect(nativeTheme.themeSource).toBe("light");
    });

    it("should set theme to system and return shouldUseDarkColors when system handler is called", () => {
      // Arrange
      nativeTheme.shouldUseDarkColors = true;
      addThemeEventListeners();

      // Get the system handler function
      const systemHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === THEME_MODE_SYSTEM_CHANNEL,
      )[1];

      // Act
      const result = systemHandler();

      // Assert
      expect(nativeTheme.themeSource).toBe("system");
      expect(result).toBe(true);
    });
  });
});
