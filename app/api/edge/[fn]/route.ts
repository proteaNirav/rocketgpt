export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ORIGIN = process.env.ALLOWED_ORIGIN ?? "http://localhost:5173";

function cors(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    ...extra,
  };
}

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), { status: 200, headers: cors(), ...init });
}

type Ctx = { params?: { fn?: string } } | undefined;

function readFn(ctx: Ctx): string {
  const raw = (ctx?.params?.fn ?? "").toString();
  try { return raw.toLowerCase(); } catch { return ""; }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function GET(_req: Request, ctx?: Ctx) {
  const fn = readFn(ctx);

  if (fn === "ping")  return json({ status: "ok", ts: Date.now() });
  if (fn === "hello") return json({ greeting: "Hello from RocketGPT Edge" });
  if (fn === "test")  return json({ ok: true });
  if (fn === "echo")  return json({ message: "RocketGPT Edge Test OK (GET)" });

  return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: cors() });
}

export async function POST(req: Request, ctx?: Ctx) {
  const fn = readFn(ctx);
  if (fn !== "echo") {
    return new Response(JSON.stringify({ error: "POST not allowed" }), {
      status: 405,
      headers: cors({ Allow: "GET,OPTIONS" }),
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}

  return json({ message: body?.message ?? null, data: body });
}
