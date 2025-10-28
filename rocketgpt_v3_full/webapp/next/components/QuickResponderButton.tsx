'use client';
import { useState } from "react";
import { edgeCall } from "@/lib/edgeCall";
import { emitRateLimited } from "@/lib/ratelimitBus";
import { isRateLimitError } from "@/lib/errors";

export default function QuickResponderButton() {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await edgeCall("quick-responder", { prompt: "ping" });
      console.log("OK:", res);
    } catch (e: any) {
      if (isRateLimitError(e)) {
        emitRateLimited({
          message: "Quick Responder hit the rate limit.",
          retryAfter: e.retryAfter ?? e.rl?.retry_after_seconds,
          plan: e.rl?.limits?.plan_code,
        });
      } else {
        console.error("QuickResponder error", e);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn" disabled={busy} onClick={run}>
      {busy ? "Working…" : "Run Quick Responder"}
    </button>
  );
}
