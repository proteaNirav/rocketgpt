/// <reference path="../_shared/types.d.ts" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  try {
    const token = req.headers.get("x-rgpt-evaluator-token") ?? "";
    const expected = Deno.env.get("EVALUATOR_TOKEN") ?? "";

    if (expected && !token.includes(expected)) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      service: "rocketgpt-evaluator",
      ts: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: "server_error",
      message: String(e?.message ?? e)
    }), { status: 500 });
  }
});
