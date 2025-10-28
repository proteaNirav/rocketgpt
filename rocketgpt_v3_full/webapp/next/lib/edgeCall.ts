import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const EDGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "") + "/functions/v1";

export async function edgeCall(path: string, payload?: unknown, init?: RequestInit) {
  // Get logged-in user id (optional; returns null if no session)
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(n: string) { return cookieStore.get(n)?.value; },
        set(n: string, v: string, o: any) { cookieStore.set({ name: n, value: v, ...o }); },
        remove(n: string, o: any) { cookieStore.set({ name: n, value: "", expires: new Date(0), ...o }); },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const guest = cookieStore.get("guest_id")?.value;
  const uid = user?.id ?? guest ?? "guest";
  
  const res = await fetch(`${EDGE_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
       "x-user-id": uid,
      ...(init?.headers || {}),
    },
    body: JSON.stringify(payload ?? {}),
    cache: "no-store",
  });

  // Bubble 429 details to client
  if (res.status === 429) {
    const j = await res.json().catch(() => ({}));
    const err = new Error("RATE_LIMITED") as any;
    err.rl = j;
  err.retryAfter = res.headers.get("Retry-After");
  throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Edge error ${res.status}: ${text}`);
  }
  return res.json();
}
