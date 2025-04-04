import React from "react";
import { Github } from "lucide-react";

export function Footer() {
  // Get the version from package.json
  const appVersion = "1.0.0"; // This would ideally come from environment variable or package.json

  const handleOpenExternal = (url: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.electronAPI?.shell?.openExternal) {
      window.electronAPI.shell.openExternal(url);
    } else {
      // Fallback to regular link behavior if not in Electron
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <footer className="border-border bg-background text-muted-foreground border-t p-2 text-xs">
      <div className="container mx-auto flex items-center justify-between">
        <div>
          <span>Kenmei to AniList v{appVersion}</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/RLAlpha49/KenmeiToAnilist"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground flex items-center gap-1"
            onClick={handleOpenExternal(
              "https://github.com/RLAlpha49/KenmeiToAnilist",
            )}
          >
            <Github className="h-3 w-3" />
            <span>GitHub</span>
          </a>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
