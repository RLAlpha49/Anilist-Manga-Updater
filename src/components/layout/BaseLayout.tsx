import React, { useEffect } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { syncThemeWithLocal } from "@/helpers/theme_helpers";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize theme when the app starts
    syncThemeWithLocal();
  }, []);

  return (
    <div className="bg-background text-foreground flex h-screen flex-col">
      <Header />

      <main className="flex-1 overflow-auto p-4">
        <div className="container mx-auto h-full">{children}</div>
      </main>

      <Footer />
    </div>
  );
}
