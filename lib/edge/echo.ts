export async function echo(req: Request): Promise<Response> {
  let incoming: unknown = null;
  try {
    if (req.method === "POST") {
      incoming = await req.json();
    }
  } catch {
    incoming = { _error: "Invalid or empty JSON body" };
  }

  const body = {
    ok: true,
    method: req.method,
    url: req.url,
    incoming,
    time: new Date().toISOString(),
  };

  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return new Response(JSON.stringify(body), { status: 200, headers });
}
