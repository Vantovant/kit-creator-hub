"use client";

import { useEffect } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.className = "antialiased";
  }, []);

  return (
    <body className="antialiased" suppressHydrationWarning>
      <ThemeProvider>{children}</ThemeProvider>
    </body>
  );
}
