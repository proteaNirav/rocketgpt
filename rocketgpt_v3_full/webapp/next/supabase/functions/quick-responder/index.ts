// supabase/functions/quick-responder/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { checkRateLimit } from "./_shared/ratelimit.ts";
import { getAuthUserId } from "./_shared/auth.ts";

const ENDPOINT_KEY = "quick_responder";

// CORS (use "*" while testing, restrict later)
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const userId = getAuthUserId(req) || req.headers.get("x-user-id");
if (!userId) {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401, headers: { "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept logged-in, header-provided, or guest
    const uid =
      getAuthUserId(req) ||
      req.headers.get("x-user-id")?.trim() ||
      "guest";

    if (req.method === "GET") {
      return new Response(
        JSON.stringify({ ok: true, endpoint: ENDPOINT_KEY, uid, version: "v5" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Rate limit
    const rl = await checkRateLimit(uid, ENDPOINT_KEY);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "rate_limited", ...rl }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json().catch(() => ({}));

    return new Response(
      JSON.stringify({ ok: true, uid, input: body, message: "Quick responder executed" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "server_error", message: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});


