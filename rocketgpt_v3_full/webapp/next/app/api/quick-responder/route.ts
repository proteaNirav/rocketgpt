// App Router API route: /api/quick-responder
// Proxies to the Supabase Edge Function `quick-responder` and
// surfaces rate-limit info (429) back to the client.

import { NextResponse } from "next/server";
import { edgeCall } from "@/lib/edgeCall";

// Optional: small health check for quick verification in the browser.
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/quick-responder",
    edgeProxy: "quick-responder",
    envPresent: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export async function POST(req: Request) {
  try {
    // read JSON body (safe default)
    const body = await req.json().catch(() => ({}));

    // call the Edge Function via our server-side proxy
    const data = await edgeCall("quick-responder", body);

    // normal success
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    // bubble up rate-limiting in a friendly, structured way
    if (e?.message === "RATE_LIMITED") {
      const rl = e.rl || {};
      return NextResponse.json(rl, {
        status: 429,
        headers: {
          // allows clients (and the browser) to back off automatically
          "Retry-After": String(rl.retry_after_seconds ?? 60),
        },
      });
    }

    // generic error (don’t leak internals)
    return NextResponse.json(
      { error: "server_error", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
