"use client";
import { useState } from "react";
import { clientJson } from "@/lib/clientJson";

export default function QuickResponderButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      className="rounded border px-4 py-2"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await clientJson("/api/quick-responder", { body: JSON.stringify({ prompt: "ping" }) });
          alert("OK");
        } catch (e: any) {
          if (e?.message === "RATE_LIMITED") {
            // banner already shown
          } else {
            alert(`Error: ${String(e?.message || e)}`);
          }
        } finally {
          setLoading(false);
        }
      }}
    >
      Run Quick Responder
    </button>
  );
}
