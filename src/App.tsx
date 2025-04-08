import React from "react";
import { createRoot } from "react-dom/client";
import { router } from "./routes/router";
import { RouterProvider } from "@tanstack/react-router";
import { AuthProvider } from "./contexts/AuthContext";
import { SonnerProvider } from "./components/ui/sonner-provider";
import { RateLimitProvider } from "./contexts/RateLimitContext";
import { ThemeProvider } from "./contexts/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RateLimitProvider>
          <RouterProvider router={router} />
          <SonnerProvider />
        </RateLimitProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const root = createRoot(document.getElementById("app")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
