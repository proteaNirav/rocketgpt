export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import SentryClientInit from "@/components/SentryClientInit";
import RateLimitBanner from "@/components/RateLimitBanner";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

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

        <main className="mx-auto max-w-6xl px-4 py-6">
          <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Topbar sidebarCollapsed={false} onToggleSidebar={() => {}} />

            <div className="flex flex-1">
              <Sidebar collapsed={false} onToggle={() => {}} />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </main>

        <RateLimitBanner />
      </body>
    </html>
  );
}

