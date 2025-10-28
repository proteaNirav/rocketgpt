// webapp/next/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import SentryClientInit from "@/components/SentryClientInit";
import RateLimitBanner from "@/components/RateLimitBanner";

export const metadata: Metadata = {
  title: "RocketGPT",
  description: "AI Orchestrator",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-gray-100 antialiased">
        <SentryClientInit />
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <RateLimitBanner />
      </body>
    </html>
  );
}
