export const runtime = "edge";
import { ok, noContent } from "../../_lib/cors";

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  let body: unknown;
  try { body = await req.json(); } catch { body = null; }
  return ok({ ok: true, route: "edge/echo", body }, origin);
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  return ok({ ok: true, route: "edge/echo", hint: "POST a JSON body to echo" }, origin);
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return noContent(origin);
}
