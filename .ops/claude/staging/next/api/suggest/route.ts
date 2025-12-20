export const runtime = "edge";
import { ok, noContent } from "../_lib/cors";

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const url = new URL(req.url);
  const smoke = url.searchParams.get("smoke");
  if (smoke === "1") {
    return ok({ ok: true, route: "suggest", mode: "smoke" }, origin);
  }
  return ok({ ok: true, route: "suggest", note: "placeholder handler" }, origin);
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return noContent(origin);
}
