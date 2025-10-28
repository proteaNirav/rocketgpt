'use client';
import { useEffect, useState } from "react";

export default function DebugAuth() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/quick-responder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "whoami" })
    })
      .then(r => r.json())
      .then(j => setData(j))
      .catch(e => setData({ error: e.message }));
  }, []);

  return (
    <main className="p-6 space-y-4 text-sm">
      <h1 className="text-lg font-semibold">Debug Auth</h1>
      <div className="border rounded-lg bg-neutral-900 p-4 text-gray-200">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
      <p className="text-gray-400 text-xs">
        This shows what <b>x-user-id</b> was sent (guest_id or Supabase user.id)
      </p>
    </main>
  );
}
