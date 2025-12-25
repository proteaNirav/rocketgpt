"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    // fire-and-forget "“ best effort
    fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Prod Error: ${error?.message?.slice(0, 120) || "Unknown"}`,
        stack: error?.stack || "",
        url: typeof window !== "undefined" ? window.location.href : "",
        note: "Auto-filed from GlobalError boundary",
        engine: "anthropic",  // or "openai"/"groq"/"google"
        goal: "Handle and fix this specific runtime error for rocketgpt.dev",
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html>
      <body style={{ padding: 24 }}>
        <h2>Something went wrong.</h2>
        <p>We&apos;ve notified our system. You can try again.</p>
        <button onClick={() => reset()}>Retry</button>
      </body>
    </html>
  );
}
