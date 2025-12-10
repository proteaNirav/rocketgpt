export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import type { Metadata } from "next";
import "./globals.css";

import Header from "@/components/Header";
import SentryClientInit from "@/components/SentryClientInit";
import RateLimitBanner from "@/components/RateLimitBanner";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "RocketGPT",
  description: "AI Orchestrator",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="
          min-h-screen
          bg-neutral-50 text-gray-900
          dark:bg-neutral-950 dark:text-gray-100
          antialiased
        "
      >
        <ThemeProvider>
          <SentryClientInit />
          <Header />

          {/* Full-width content area, no inner Shell / grey menu column */}
          <main className="px-4 py-6">
            {children}
          </main>

          <RateLimitBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
