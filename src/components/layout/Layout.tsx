import React from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
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
