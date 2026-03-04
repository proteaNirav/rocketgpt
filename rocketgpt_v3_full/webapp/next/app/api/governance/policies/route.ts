import { NextRequest, NextResponse } from "next/server";

import { loadPolicyRules, upsertPolicyRule } from "@/lib/db/governanceRepo";
import { isAdminWrite, isPrivilegedRead } from "@/lib/governance/auth";
import type { GovernancePolicyRule } from "@/lib/governance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    if (!isPrivilegedRead(req)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const items = await loadPolicyRules();
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list policy rules.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdminWrite(req)) {
      return NextResponse.json({ error: "Admin token required." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const incoming = body?.rule ?? body;
    if (!incoming || typeof incoming !== "object") {
      return NextResponse.json({ error: "Invalid policy payload." }, { status: 400 });
    }

    const rule: GovernancePolicyRule = {
      id: String(incoming.id ?? "").trim(),
      name: String(incoming.name ?? "").trim(),
      enabled: Boolean(incoming.enabled),
      priority: Number(incoming.priority ?? 0),
      conditions: incoming.conditions ?? {},
      action: incoming.action ?? { level: 1, explainTemplate: "Policy applied." },
    };
    if (!rule.id || !rule.name) {
      return NextResponse.json({ error: "id and name are required." }, { status: 400 });
    }

    await upsertPolicyRule(rule);
    return NextResponse.json({ ok: true, rule }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upsert policy rule.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

