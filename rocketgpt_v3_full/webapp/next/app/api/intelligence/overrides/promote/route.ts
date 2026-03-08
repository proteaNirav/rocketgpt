import { NextRequest, NextResponse } from "next/server";
import { isAdminWrite } from "@/lib/governance/auth";
import { getOverrides } from "@/lib/intelligence/overrides-store.mjs";
import { buildOverrideDiffPreview, createPromotionProposal } from "@/lib/intelligence/promotion-store.mjs";
import { createApproval, logApprovalEvent } from "@/lib/approvals-db";
import { appendGovernanceLedgerEvent } from "@/lib/db/governanceRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAdminWrite(req)) {
    return NextResponse.json({ ok: false, error: "Admin authorization required." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const tenantId = String(body?.tenantId || "demo-tenant");
  const chatId = String(body?.chatId || body?.sessionId || "");
  if (!chatId) {
    return NextResponse.json({ ok: false, error: "chatId is required." }, { status: 400 });
  }

  const overrides = getOverrides(tenantId, chatId);
  if (!overrides) {
    return NextResponse.json({ ok: false, error: "No active chat override found." }, { status: 404 });
  }

  const diffPreview = buildOverrideDiffPreview(overrides);
  const actor = req.headers.get("x-user-id") || "admin";
  const proposal = createPromotionProposal({
    tenantId,
    chatId,
    createdBy: actor,
    reason: body?.reason,
    diffPreview,
  });

  const approvalResult = await createApproval({
    request_type: "workflow-change",
    request_title: `Promote intelligence override ${proposal.proposalId}`,
    payload: {
      proposalId: proposal.proposalId,
      tenantId,
      chatId,
      diffPreview,
    },
    actor,
    channel: "system",
    priority: "high",
    risk_level: "high",
  });

  if (approvalResult.success && approvalResult.approval) {
    await logApprovalEvent(approvalResult.approval.id, "created", {
      event: "governance_approval_required",
      proposalId: proposal.proposalId,
    });
  }

  try {
    await appendGovernanceLedgerEvent({
      eventType: "risk_eval",
      workflowId: "intelligence.promote",
      runId: null,
      crpsId: null,
      payload: {
        proposalId: proposal.proposalId,
        tenantId,
        chatId,
        diffPreview,
        approvalId: approvalResult.approval?.id ?? null,
      },
    });
  } catch {
    // best-effort for local/dev runs without governance schema
  }

  return NextResponse.json({
    ok: true,
    proposal,
    approval: approvalResult.approval ?? null,
    governanceApprovalRequired: true,
  });
}
