
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RocketGPT — AI Orchestrator",
  description: "Route your goal to the right AI tools with RocketGPT.",
  openGraph: {
    title: "RocketGPT — AI Orchestrator",
    description: "Route your goal to the right AI tools with RocketGPT.",
    url: "https://app.rocketgpt.dev",
    siteName: "RocketGPT",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"REPLACE_WITH_CF_TOKEN"}' />
      </head>
      <body>{children}</body>
    </html>
  );
}
