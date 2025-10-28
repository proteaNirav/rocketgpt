'use client';
import { useEffect, useState } from "react";
import { onRateLimited } from "@/lib/ratelimitBus";

export default function RateLimitBanner() {
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [eta, setEta] = useState<number>(60);
  const [plan, setPlan] = useState<string>("");

  useEffect(() => {
    return onRateLimited(({ message, retryAfter, plan }) => {
      setMsg(message || "You’ve hit your rate limit.");
      setEta(retryAfter ?? 60);
      setPlan(plan || "BRONZE");
      setVisible(true);

      // auto-hide after ~8s
      const t = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(t);
    });
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
