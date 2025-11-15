export async function test(req: Request): Promise<Response> {
  const ua = req.headers.get("user-agent") || "unknown";
  const vercelId = req.headers.get("x-vercel-id") || null; // present on deployed Edge
  const url = new URL(req.url);

  const body = {
    diagnostics: {
      runtime: "edge",
      method: req.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      userAgent: ua,
      vercelId,
      now: new Date().toISOString(),
    },
  };

  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return new Response(JSON.stringify(body), { status: 200, headers });
}
