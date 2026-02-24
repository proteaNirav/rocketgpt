// app/api/edge/[fn]/route.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const EDGE_BASE =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "") + "/functions/v1";

async function forward(req: Request, fn: string) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Cast to any to satisfy differing @supabase/ssr versions' types
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      } as any,
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only send x-user-id for authenticated users (prevents FK errors for guests)
  const fwdHeaders: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") ?? "application/json",
  };
  if (user?.id) {
    fwdHeaders["x-user-id"] = user.id;
  }

  const body = req.method === "GET" ? undefined : await req.text();

  const resp = await fetch(`${EDGE_BASE}/${fn}`, {
    method: req.method,
    headers: fwdHeaders,
    body,
    cache: "no-store",
  });

  const data = await resp.text();

  return new NextResponse(data || "{}", {
    status: resp.status,
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Remaining-Minute":
        resp.headers.get("X-RateLimit-Remaining-Minute") ?? "",
      "X-RateLimit-Remaining-Hour":
        resp.headers.get("X-RateLimit-Remaining-Hour") ?? "",
      "Retry-After": resp.headers.get("Retry-After") ?? "",
      "X-RateLimit-Plan": resp.headers.get("X-RateLimit-Plan") ?? "",
    },
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ fn: string }> }) {
  const { fn } = await ctx.params;
  return forward(req, fn);
}
