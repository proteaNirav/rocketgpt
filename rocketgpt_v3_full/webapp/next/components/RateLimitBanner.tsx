'use client';
import { useEffect, useRef, useState } from "react";
import { onRateLimited } from "@/lib/ratelimitBus";

export default function RateLimitBanner() {
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [eta, setEta] = useState<number>(60);
  const [plan, setPlan] = useState<string>("");

  // store the current hide timer id so we can clear/reset it
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // subscribe once
    const unsubscribe = onRateLimited(({ message, retryAfter, plan }) => {
      setMsg(message || "You’ve hit your rate limit.");
      setEta(retryAfter ?? 60);
      setPlan(plan || "BRONZE");
      setVisible(true);

      // reset the hide timer
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => setVisible(false), 8000);
    });

    // proper cleanup: clear timer + unsubscribe
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      unsubscribe();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50">
      <div className="rounded-lg border bg-neutral-900 text-gray-100 px-4 py-3 shadow-lg">
        <div className="text-sm">
          <b>Rate limit reached</b> (plan: {plan}). Try again in ~{eta}s,
          or upgrade in <a href="/super/plans" className="underline">Plans</a>.
        </div>
      </div>
    </div>
  );
}
