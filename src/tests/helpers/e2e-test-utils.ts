import { ElectronApplication, Page } from "@playwright/test";
import { _electron as electron } from "playwright";
import { findLatestBuild, parseElectronApp } from "electron-playwright-helpers";

/**
 * Launches the Electron app and returns the app and window instances
 */
export async function launchElectronApp(timeout = 60000): Promise<{
  electronApp: ElectronApplication;
  page: Page;
}> {
  let appInfo;
  let latestBuild;

  try {
    // Find the latest build of your application
    latestBuild = findLatestBuild();
    console.log("Found build directory:", latestBuild);
    appInfo = parseElectronApp(latestBuild);
  } catch (error) {
    console.error("Error finding latest build:", error);

    // Fallback mechanism based on platform
    const platform = process.platform;
    console.log("Attempting fallback for platform:", platform);

    // Create a manual appInfo object
    if (platform === "darwin") {
      // macOS fallback
      const possibleAppPaths = [
        "out/Kenmei-to-Anilist-darwin-x64/Kenmei-to-Anilist.app",
        "out/Kenmei-to-Anilist-darwin-arm64/Kenmei-to-Anilist.app",
      ];

      for (const appPath of possibleAppPaths) {
        if (require("fs").existsSync(appPath)) {
          console.log(`Found app at ${appPath}`);
          appInfo = {
            executable: `${appPath}/Contents/MacOS/Kenmei-to-Anilist`,
            main: "",
          };
          break;
        }
      }
    } else if (platform === "win32") {
      // Windows fallback
      const possibleAppPaths = [
        "out/Kenmei-to-Anilist-win32-x64/Kenmei-to-Anilist.exe",
        "out/make/squirrel.windows/x64/Kenmei-to-Anilist-Setup.exe",
      ];

      for (const appPath of possibleAppPaths) {
        if (require("fs").existsSync(appPath)) {
          console.log(`Found app at ${appPath}`);
          appInfo = {
            executable: appPath,
            main: "",
          };
          break;
        }
      }
    } else if (platform === "linux") {
      // Linux fallback
      const possibleAppPaths = [
        "out/Kenmei-to-Anilist-linux-x64/Kenmei-to-Anilist",
        "out/Kenmei-to-Anilist-linux-x64/usr/bin/kenmei-to-anilist",
      ];

      for (const appPath of possibleAppPaths) {
        if (require("fs").existsSync(appPath)) {
          console.log(`Found app at ${appPath}`);
          appInfo = {
            executable: appPath,
            main: "",
          };
          break;
        }
      }
    }

    if (!appInfo) {
      throw new Error(`Could not find app executable for platform ${platform}`);
    }
  }

  // Launch Electron app
  const electronApp = await electron.launch({
    args: appInfo.main ? [appInfo.main] : [],
    executablePath: appInfo.executable,
    timeout,
  });

  // Get the first window
  const page = await electronApp.firstWindow();

  // Try different selectors to detect when the app is loaded
  const selectors = [
    'div[role="main"]',
    "main",
    "#root",
    ".app-container",
    'div[data-testid="app-container"]',
  ];

  let appDetected = false;
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      appDetected = true;
      break;
    } catch (error) {
      // Continue to next selector
    }
  }

  // If we couldn't detect the app with any of the selectors, wait for the page to be stable
  if (!appDetected) {
    await page.waitForLoadState("networkidle", { timeout });
  }

  return { electronApp, page };
}

/**
 * Mock authentication by injecting auth data into localStorage
 */
export async function mockAuth(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      localStorage.setItem(
        "anilist_auth",
        JSON.stringify({
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          expiresAt: Date.now() + 3600 * 1000,
          tokenType: "Bearer",
          isAuthenticated: true,
        }),
      );
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw err;
  }
}

/**
 * Mock user profile data by setting up IPC handlers
 */
export async function mockUserProfile(
  electronApp: ElectronApplication,
): Promise<void> {
  try {
    await electronApp.evaluate(({ ipcMain }) => {
      // Mock user data
      ipcMain.handle("anilist:get-user", async () => {
        return {
          id: 123456,
          name: "TestUser",
          avatar: {
            large: "https://example.com/avatar.png",
          },
          medialistCounts: {
            manga: 0,
          },
        };
      });
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw err;
  }
}

/**
 * Navigate to a specific route in the app
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
  try {
    // Method 1: Use page evaluation for hash navigation
    if (route.startsWith("/")) {
      await page.evaluate((r) => {
        window.location.hash = r;
      }, route);
    } else if (route.startsWith("#/")) {
      await page.evaluate((r) => {
        window.location.hash = r.substring(1); // Remove the # since we're setting hash directly
      }, route);
    } else {
      // For non-hash routes, try direct navigation
      await page.goto(route);
    }

    // Method 2: Click navigation link if available
    try {
      const navLinks = [
        `a[href="#${route}"]`,
        `a:has-text("${route.replace("/", "")}")`,
        `button:has-text("${route.replace("/", "")}")`,
        `[data-testid="${route.replace("/", "")}-link"]`,
      ];

      for (const selector of navLinks) {
        const link = await page.$(selector);
        if (link) {
          await link.click();
          break;
        }
      }
    } catch (error) {
      // Navigation via click failed, continue with other methods
    }

    // Wait for content to load
    await page.waitForLoadState("networkidle");
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw err;
  }
}

/**
 * Helper to safely click on elements with multiple selector fallbacks
 */
export async function safeClick(
  page: Page,
  selectors: string[],
): Promise<boolean> {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        return true;
      }
    } catch (error) {
      // Continue to next selector
    }
  }

  return false;
}

/**
 * Helper function to safely select an option using multiple selector fallbacks
 */
export async function safeSelectOption(
  page: Page,
  selectSelectors: string[],
  optionValue: string,
): Promise<boolean> {
  for (const selector of selectSelectors) {
    try {
      const selectElement = await page.$(selector);
      if (selectElement) {
        await page.selectOption(selector, optionValue);
        return true;
      }
    } catch (error) {
      // Continue to next selector
    }
  }

  return false;
}

/**
 * Debug function to analyze page content for troubleshooting
 * Returns information about the page without logging to console
 */
export async function debugPageContent(page: Page): Promise<{
  url: string;
  title: string;
  structure: string;
  textContent: string;
}> {
  try {
    // Get all text content from the page
    const textContent = await page.evaluate(() => {
      return document.body.textContent || "";
    });

    // Get page title
    const title = await page.title();

    // Get current URL
    const url = page.url();

    // Get HTML structure (simplified)
    const htmlStructure = await page.evaluate(() => {
      const getNodePath = (
        element: Element,
        depth = 0,
        maxDepth = 3,
      ): string => {
        if (!element || depth > maxDepth) return "";

        const tag = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : "";
        const classes = Array.from(element.classList)
          .map((c) => `.${c}`)
          .join("");
        const children = Array.from(element.children)
          .map((child) => getNodePath(child, depth + 1, maxDepth))
          .filter(Boolean)
          .join("\n" + "  ".repeat(depth + 1));

        return `${"  ".repeat(depth)}${tag}${id}${classes}${children ? "\n" + children : ""}`;
      };

      return getNodePath(document.body);
    });

    // Return the data without logging
    return {
      url,
      title,
      structure: htmlStructure,
      textContent:
        textContent.substring(0, 500) + (textContent.length > 500 ? "..." : ""),
    };
  } catch (error) {
    // Return empty data on error
    return {
      url: "",
      title: "",
      structure: "",
      textContent: `Error analyzing page: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Verify localStorage has expected values
 */
export async function verifyLocalStorage(
  page: Page,
  key: string,
  expectedValueCheck: (value: any) => boolean,
): Promise<boolean> {
  try {
    return await page.evaluate(
      ({ storageKey, check }) => {
        const item = localStorage.getItem(storageKey);
        if (!item) return false;

        try {
          const value = JSON.parse(item);
          // We can't pass the function directly, so we use a string representation of the check
          return eval(check)(value);
        } catch (e) {
          return false;
        }
      },
      {
        storageKey: key,
        // Convert the function to string for evaluation in page context
        check: expectedValueCheck.toString(),
      },
    );
  } catch (error) {
    return false;
  }
}
