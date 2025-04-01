import React from "react";
import ToggleTheme from "@/components/ToggleTheme";

export default function HomePage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <span>
          <h1 className="font-mono text-4xl font-bold">Kenmei To Anilist</h1>
          <p
            className="text-muted-foreground text-end text-sm uppercase"
            data-testid="pageTitle"
          >
            Home Page
          </p>
        </span>
        <ToggleTheme />
      </div>
    </div>
  );
}
