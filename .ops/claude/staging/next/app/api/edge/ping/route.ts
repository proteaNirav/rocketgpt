export const runtime = "edge";
import { ok, noContent } from "../../_lib/cors";
export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  return ok({ ok: true, route: "edge/ping", time: new Date().toISOString() }, origin);
}
export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return noContent(origin);
}
