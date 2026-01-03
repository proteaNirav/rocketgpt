export const runtime = "nodejs";
import { ok, noContent } from "../_lib/cors";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";

export async function GET(req: Request) {
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const origin = req.headers.get("origin");
  const url = new URL(req.url);
  return ok({ ok: true, route: "suggest", mode: url.searchParams.get("smoke") === "1" ? "smoke" : "placeholder" }, origin);
}
export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return noContent(origin);
}
