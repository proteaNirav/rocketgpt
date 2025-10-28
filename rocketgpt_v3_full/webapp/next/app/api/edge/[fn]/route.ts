import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient /*, type CookieOptions */ } from "@supabase/ssr";

const EDGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "") + "/functions/v1";

async function forward(req: NextRequest, fn: string) {
  const cookieStore = cookies();

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

  const { data: { user } } = await supabase.auth.getUser();
  const guest = cookieStore.get("guest_id")?.value;
  const uid = user?.id ?? guest ?? "guest";

  const body = req.method === "GET" ? undefined : await req.text();
  const resp = await fetch(`${EDGE_BASE}/${fn}`, {
    method: req.method,
    headers: {
      "Content-Type": req.headers.get("content-type") ?? "application/json",
      "x-user-id": uid,
    },
    body,
    cache: "no-store",
  });

  const data = await resp.text();
  return new NextResponse(data || "{}", {
    status: resp.status,
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Remaining-Minute": resp.headers.get("X-RateLimit-Remaining-Minute") ?? "",
      "X-RateLimit-Remaining-Hour":   resp.headers.get("X-RateLimit-Remaining-Hour") ?? "",
      "Retry-After":                  resp.headers.get("Retry-After") ?? "",
      "X-RateLimit-Plan":             resp.headers.get("X-RateLimit-Plan") ?? "",
    },
  });
}

export async function GET(req: NextRequest, ctx: { params: { fn: string } })  { return forward(req, ctx.params.fn); }
export async function POST(req: NextRequest, ctx: { params: { fn: string } }) { return forward(req, ctx.params.fn); }
