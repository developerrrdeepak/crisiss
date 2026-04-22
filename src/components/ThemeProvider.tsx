"use client";

import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
  }, []);

  return <>{children}</>;
}
