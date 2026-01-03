export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
export const runtime = "nodejs";


type OverallStatus = "healthy" | "degraded" | "down";

type ModuleHealth = {
  ok: boolean;
  status: OverallStatus;
  latency_ms?: number;
  error?: string | null;
};

type OrchestratorHealthResponse = {
  success: boolean;
  service: string;
  version: string;
  environment: string;
  safe_mode: {
    enabled: boolean;
    source: "env" | "config" | "stub";
    enforced_routes: string[];
  };
  summary: {
    overall_status: OverallStatus;
    healthy_modules: string[];
    degraded_modules: string[];
    down_modules: string[];
  };
  health: {
    planner: ModuleHealth;
    builder: ModuleHealth;
    tester: ModuleHealth;
    approvals: ModuleHealth;
  };
  timestamp: string;
};

/**
 * Orchestrator health summary.
 *
 * This endpoint is designed to be:
 *  - Human-readable
 *  - PowerShell/automation-friendly
 *  - Stable enough to be used by health probes and dashboards
 *
 * NOTE: Values are currently stubbed and should be wired to real checks
 * in later phases (Planner/Builder/Tester/Approvals connectivity, etc.).
 */
export async function GET(_req: NextRequest) {
  await runtimeGuard(_req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const safeModeEnabled =
    process.env.RGPT_SAFE_MODE_ENABLED === "true" ||
    process.env.RGPT_SAFE_MODE === "on";

  const modules: OrchestratorHealthResponse["health"] = {
    planner: {
      ok: true,
      status: "healthy",
    },
    builder: {
      ok: true,
      status: "healthy",
    },
    tester: {
      ok: true,
      status: "healthy",
    },
    approvals: {
      ok: true,
      status: "healthy",
    },
  };

  const healthyModules: string[] = [];
  const degradedModules: string[] = [];
  const downModules: string[] = [];

  for (const [name, module] of Object.entries(modules)) {
    if (!module.ok || module.status === "down") {
      downModules.push(name);
    } else if (module.status === "degraded") {
      degradedModules.push(name);
    } else {
      healthyModules.push(name);
    }
  }

  let overallStatus: OverallStatus = "healthy";
  if (downModules.length > 0) {
    overallStatus = "down";
  } else if (degradedModules.length > 0) {
    overallStatus = "degraded";
  }

  const payload: OrchestratorHealthResponse = {
    success: true,
    service: "RocketGPT Orchestrator",
    version: "v3",
    environment: process.env.NODE_ENV ?? "development",
    safe_mode: {
      enabled: safeModeEnabled,
      source: safeModeEnabled ? "env" : "stub",
      enforced_routes: [
        // Future: list routes that are blocked/altered in Safe-Mode.
        "/api/orchestrator/builder/execute-all",
      ],
    },
    summary: {
      overall_status: overallStatus,
      healthy_modules: healthyModules,
      degraded_modules: degradedModules,
      down_modules: downModules,
    },
    health: modules,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(payload, { status: 200 });
}
