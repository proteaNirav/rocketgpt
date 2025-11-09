import { NextResponse, NextRequest } from "next/server";

export const runtime = "edge";

// Explicit registry of allowed handlers (shakeable and bundler-safe)
const registry: Record<string, () => Promise<{ default: (req: NextRequest) => any }>> = {
  test: () => import("@/lib/edge/test"),
  ping: () => import("@/lib/edge/ping"),
  hello: () => import("@/lib/edge/hello"),
  echo: () => import("@/lib/edge/echo"),
};

async function run(fn: string, req: NextRequest) {
  const loader = registry[fn];
  if (!loader) {
    return NextResponse.json({ error: `Function '${fn}' not found` }, { status: 404 });
  }
  const mod = await loader();
  const result = await mod.default(req);
  return NextResponse.json({ success: true, data: result });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ fn: string }> }) {
  const { fn } = await ctx.params;
  if (!fn) return NextResponse.json({ error: "Missing function name" }, { status: 400 });
  try { return await run(fn, req); }
  catch (err: any) {
    console.error("Edge route GET error:", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ fn: string }> }) {
  return GET(req, ctx);
}
