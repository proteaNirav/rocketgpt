// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { checkRateLimit } from "../_shared/ratelimit.ts";
import { getAuthUserId } from "../_shared/auth.ts";

const ENDPOINT_KEY = "quick_responder";

serve(async (req: Request) => {
  try {
    // â›” guests blocked "” only real users
    const userId = getAuthUserId(req) || req.headers.get("x-user-id");
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rl = await checkRateLimit(userId, ENDPOINT_KEY);

    const base = new Headers({
      "Content-Type": "application/json",
      "X-RateLimit-Remaining-Minute": String(rl.minute_remaining),
      "X-RateLimit-Remaining-Hour":   String(rl.hour_remaining),
      "X-RateLimit-Plan":             rl.limits.plan_code,
    });

    if (!rl.allowed) {
      base.set("Retry-After", String(rl.retry_after_seconds));
      return new Response(JSON.stringify({ error: "rate_limited", ...rl }), {
        status: 429, headers: base
      });
    }

    const body = await req.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: true, input: body }), {
      status: 200, headers: base
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error", message: String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
});
