import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
export const runtime = "nodejs";


export const dynamic = "force-dynamic";

/**
 * Global status endpoint for RocketGPT.
 * Aggregates health from:
 *  - /api/orchestrator/health
 *  - /api/tester/health
 *
 * NOTE:
 * - Uses an internal base URL. For local dev, defaults to http://localhost:3000
 * - Can be extended later with DB, Supabase, queue checks, etc.
 */

const INTERNAL_BASE_URL =
  process.env.RGPT_INTERNAL_BASE_URL ?? "http://localhost:3000";

type ServiceStatus = {
  ok: boolean;
  status: number;
  body?: unknown;
  error?: string;
};

async function safeFetch(path: string): Promise<ServiceStatus> {
  const url = `${INTERNAL_BASE_URL}${path}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
    });

    let json: unknown = undefined;
    try {
      json = await res.json();
    } catch {
      // ignore JSON parse errors â€“ body may be empty or not JSON
    }

    return {
      ok: res.ok,
      status: res.status,
      body: json,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error in fetch";
    return {
      ok: false,
      status: 0,
      error: message,
    };
  }
}

export async function GET() {
  const req = new Request("http://localhost/_rgpt", { headers: headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const [orchestrator, tester] = await Promise.all([
    safeFetch("/api/orchestrator/health"),
    safeFetch("/api/tester/health"),
  ]);

  const orchBody: any = orchestrator.body ?? {};
  const testerBody: any = tester.body ?? {};

  const success =
    orchestrator.ok &&
    tester.ok &&
    orchBody.success === true &&
    testerBody.success === true;

  return NextResponse.json({
    success,
    services: {
      orchestrator,
      tester,
    },
    timestamp: new Date().toISOString(),
  });
}
