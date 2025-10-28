// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { checkRateLimit } from "../_shared/ratelimit.ts";
import { getAuthUserId } from "../_shared/auth.ts";

const ENDPOINT_KEY = "quick_responder";

// ✅ CORS: adjust origin(s)
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*", // <-- use "*" just for testing; later restrict to your domain
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  // --- CORS Preflight ---
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Identify user (always fallback to guest) ---
    const uid =
      getAuthUserId(req) ||
      req.headers.get("x-user-id")?.trim() ||
      "guest";

    // --- Sanity check endpoint ---
    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          ok: true,
          endpoint: ENDPOINT_KEY,
          uid,
          version: "v3", // incremented to ensure new deploy
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // --- Rate limit ---
    const rl = await checkRateLimit(uid, ENDPOINT_KEY);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "rate_limited", ...rl }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // --- Main logic ---
    const body = await req.json().catch(() => ({}));
    return new Response(
      JSON.stringify({ ok: true, uid, input: body, message: "Quick responder executed." }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "server_error", message: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
