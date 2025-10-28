"use client";
import { useEffect, useState } from "react";

type RL = {
  reason?: string;
  retry_after_seconds?: number;
  minute_remaining?: number;
  hour_remaining?: number;
};

export default function RateLimitBanner() {
  const [info, setInfo] = useState<RL | null>(null);

  useEffect(() => {
    function onRL(ev: Event) {
      const detail = (ev as CustomEvent).detail as RL;
      setInfo(detail);
      const timeout = Math.min((detail.retry_after_seconds ?? 60) * 1000, 60_000);
      const t = setTimeout(() => setInfo(null), timeout);
      return () => clearTimeout(t);
    }
    window.addEventListener("rate-limited", onRL as EventListener);
    return () => window.removeEventListener("rate-limited", onRL as EventListener);
  }, []);

  if (!info) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl p-4 shadow-lg border bg-yellow-100 border-yellow-300 text-yellow-900">
      <div className="font-medium">
        ⏳ You’ve hit a rate limit ({info.reason ?? "limit"}). Try again in ~{info.retry_after_seconds ?? 60}s.
      </div>
      <div className="text-sm opacity-80">
        Remaining this minute: {info.minute_remaining ?? 0} · this hour: {info.hour_remaining ?? 0}
      </div>
    </div>
  );
}
