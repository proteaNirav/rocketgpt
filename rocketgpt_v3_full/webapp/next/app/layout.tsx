export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import SentryClientInit from "@/components/SentryClientInit";
import RateLimitBanner from "@/components/RateLimitBanner";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { ModeProvider } from "../components/layout/ModeContext";

export const metadata: Metadata = {
  title: "RocketGPT",
  description: "AI Orchestrator",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-gray-100 antialiased flex flex-col">
        <ModeProvider>
          <SentryClientInit />
          <Header />

          {/* Full app shell */}
          <div className="flex-1 flex flex-col min-h-0">
            <Topbar />
            <div className="flex flex-1 min-h-0">
              <Sidebar />
              <main className="flex-1 min-h-0 overflow-hidden bg-background">
                {children}
              </main>
            </div>
          </div>

          <RateLimitBanner />
        </ModeProvider>
      </body>
    </html>
  );
}
