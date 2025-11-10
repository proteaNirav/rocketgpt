export async function ping(_req: Request): Promise<Response> {
  const body = { status: "ok", time: new Date().toISOString() };
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(JSON.stringify(body), { status: 200, headers });
}
