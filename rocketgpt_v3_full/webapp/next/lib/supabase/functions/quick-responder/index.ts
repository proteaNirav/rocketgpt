// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { checkRateLimit } from "../_shared/ratelimit.ts";
import { getAuthUserId } from "../_shared/auth.ts";

const ENDPOINT_KEY = "quick_responder"; // logical endpoint key

serve(async (req) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }

    const rl = await checkRateLimit(userId, ENDPOINT_KEY);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "rate_limited", ...rl }),
        {
          status: 429,
          headers: { "Retry-After": String(rl.retry_after_seconds), "Content-Type": "application/json" },
        }
      );
    }

    // ... your business logic here ...
    const body = await req.json().catch(() => ({}));
    // (do work)
    return new Response(JSON.stringify({ ok: true, message: "Quick responder executed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error", message: String(e) }), { status: 500 });
  }
});
