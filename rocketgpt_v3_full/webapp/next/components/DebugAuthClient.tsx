// webapp/next/components/DebugAuthClient.tsx
"use client";

import { useState } from "react";

type Props = { computedUid: string };

export default function DebugAuthClient({ computedUid }: Props) {
  const [proxyOut, setProxyOut] = useState<any>(null);
  const [edgeOut, setEdgeOut] = useState<any>(null);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

  async function callProxy() {
    setProxyOut({ loading: true });
    try {
      const r = await fetch("/api/quick-responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "ping from /debug-auth" }),
      });
      const j = await r.json().catch(() => ({}));
      setProxyOut({ status: r.status, json: j });
    } catch (e: any) {
      setProxyOut({ error: String(e) });
    }
  }

  async function callEdgeDirect() {
    if (!supabaseUrl) {
      setEdgeOut({ error: "NEXT_PUBLIC_SUPABASE_URL not set" });
      return;
    }
    setEdgeOut({ loading: true });
    try {
      const r = await fetch(`${supabaseUrl}/functions/v1/quick-responder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": computedUid, // may be blocked by CORS in prod
        },
        body: JSON.stringify({ prompt: "direct edge call from /debug-auth" }),
      });
      const j = await r.json().catch(() => ({}));
      setEdgeOut({ status: r.status, json: j });
    } catch (e: any) {
      setEdgeOut({ error: String(e) });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button className="btn border rounded px-3 py-2" onClick={callProxy}>
          Test via /api/quick-responder
        </button>
        <button className="btn border rounded px-3 py-2" onClick={callEdgeDirect}>
          Test Supabase Edge (direct)
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <pre className="rounded-lg border bg-neutral-900 p-3 overflow-auto">
{JSON.stringify(proxyOut, null, 2)}
        </pre>
        <pre className="rounded-lg border bg-neutral-900 p-3 overflow-auto">
{JSON.stringify(edgeOut, null, 2)}
        </pre>
      </div>
    </div>
  );
}
