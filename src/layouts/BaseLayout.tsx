import React, { useEffect } from "react";
import { Layout } from "../components/layout/Layout";
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

  return <Layout>{children}</Layout>;
}
