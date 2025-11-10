import type { NextRequest } from "next/server";
import { ping } from "../../../../lib/edge/ping";
import { echo } from "../../../../lib/edge/echo";
import { hello } from "../../../../lib/edge/hello";
import { test } from "../../../../lib/edge/test";

// Next.js 16: params is a Promise now
type Ctx = { params: Promise<{ fn: string }> };

export const runtime = "edge";
export const preferredRegion = ["bom1", "sin1"];

/** Minimal CORS for placeholder responses */
function withCors(init: ResponseInit = {}): ResponseInit {
  const headers = new Headers(init.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return { ...init, headers };
}

function placeholder(fn: string) {
  return {
    ok: true,
    message: "Edge handler online. /ping, /echo, /hello, /test are live in Step 2.4.",
    requested: fn,
    time: new Date().toISOString(),
    runtime: "edge",
  };
}

async function dispatch(req: NextRequest, fn: string): Promise<Response> {
  if (fn === "ping") return ping(req);
  if (fn === "echo") return echo(req as unknown as Request);
  if (fn === "hello") return hello(req as unknown as Request);
  if (fn === "test") return test(req as unknown as Request);
  return new Response(JSON.stringify(placeholder(fn)), withCors({ status: 200 }));
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { fn } = await ctx.params;
  return dispatch(req, fn);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { fn } = await ctx.params;
  return dispatch(req, fn);
}

export async function OPTIONS() {
  return new Response(null, withCors({ status: 204 }));
}
