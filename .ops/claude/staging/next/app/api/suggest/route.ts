export const runtime = "edge";
import { ok, noContent } from "../_lib/cors";
export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const url = new URL(req.url);
  return ok({ ok: true, route: "suggest", mode: url.searchParams.get("smoke") === "1" ? "smoke" : "placeholder" }, origin);
}
export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return noContent(origin);
}
