import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

import { isLearningWorthyChatText } from "@/lib/learning/chat-heuristics";
import { proposeFromChatIfAllowed } from "@/lib/learning/service";
import { readLearningActor } from "@/lib/learning/api-auth";
import { buildFastWorkflowPlan } from "@/lib/intelligence/fast-intelligence.mjs";
import { clearOverrides, setOverride } from "@/lib/intelligence/overrides-store.mjs";
import { enqueue, JOB_TYPES } from "@/lib/jobs/queue.mjs";
import { runMeshChatHookIfEnabled } from "../../../../../../../src/core/cognitive-mesh/runtime/mesh-live-hook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/demo/chat
 * Phase-1: Returns a stub reply. Always 200, never 500.
 * Real LLM integration will be wired in a future phase.
 *
 * Response schema (stable):
 * { ok: true, mode: "demo", reply: string, usage: null, error: null }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const incomingMessages = Array.isArray(body?.messages) ? body.messages : [];
  const fallbackUserText = String(body?.message ?? body?.text ?? "").trim();
  const latestUserMessage = [...incomingMessages]
    .reverse()
    .find((m) => String(m?.role || "").toLowerCase() === "user");
  const userText = String(latestUserMessage?.content ?? fallbackUserText).trim();
  const actor = readLearningActor(req);
  const chatId = String(body?.chatId || body?.sessionId || body?.conversationId || "default-chat");
  const normalizedUserText = userText.toLowerCase();
  const userRequestedResearch =
    normalizedUserText.includes("research") ||
    normalizedUserText.includes("sources") ||
    normalizedUserText.includes("evidence");

  void runMeshChatHookIfEnabled({
    sessionId: chatId,
    requestId: `chat-${Date.now()}`,
    routeType: "/api/demo/chat",
    rawInput: {
      userText,
      incomingMessages,
      chatId,
    },
    metadata: {
      tenantId: actor.tenantId,
      userId: actor.userId,
      project: "rocketgpt",
      domain: "chat",
    },
  }).catch((err) => {
    console.error("[mesh-chat-hook] non-blocking error:", err);
  });

  if (body?.chatEnded === true) {
    clearOverrides(actor.tenantId, chatId);
  }

  const failedCatId = body?.failedCatId ? String(body.failedCatId) : "";
  if (failedCatId) {
    setOverride(actor.tenantId, chatId, { avoidCatIds: [failedCatId] });
  }
  if (Number.isInteger(body?.budgetMaxNodes)) {
    setOverride(actor.tenantId, chatId, { maxNodes: Number(body.budgetMaxNodes) });
  }
  if (body?.scoringWeights && typeof body.scoringWeights === "object") {
    setOverride(actor.tenantId, chatId, { scoringWeights: body.scoringWeights });
  }
  if (body?.deepRequested === true && Number(body?.timeoutMs || 0) >= 1500) {
    setOverride(actor.tenantId, chatId, {
      forceFastUntilMs: Date.now() + 15 * 60 * 1000,
      timeoutDowngradeApplied: true,
    });
  }

  const intelligence = buildFastWorkflowPlan({
    prompt: userText,
    tenantId: actor.tenantId,
    chatId,
    messages: incomingMessages,
    timeoutMs: Number(body?.timeoutMs || 0),
  });
  console.info("[intelligence.fast_route]", intelligence.telemetry);

  let asyncRun: {
    runId: string;
    status: string;
    timelineUrl: string;
    timelineStreamUrl: string;
  } | null = null;
  let researchRun: {
    runId: string;
    status: string;
    timelineUrl: string;
    timelineStreamUrl: string;
    evidencePackByPlanUrl: string;
    analysisReportByPlanUrl: string;
  } | null = null;
  try {
    const queued = enqueue(JOB_TYPES.WORKFLOW_RUN, {
      workflowId: "demo.chat.workflow",
      planId: intelligence.workflowPlan.planId,
      nodes: intelligence.workflowPlan.nodes,
      edges: intelligence.workflowPlan.edges,
      requiresResearch: intelligence.requiresResearch,
      fallbackApplied: intelligence.telemetry?.fallback_applied === true,
      nodeTimeoutMs: 800,
    });
    asyncRun = {
      runId: queued.runId,
      status: queued.status,
      timelineUrl: `/api/jobs/${queued.runId}/timeline`,
      timelineStreamUrl: `/api/jobs/${queued.runId}/timeline/stream`,
    };

    if (intelligence.requiresResearch || userRequestedResearch) {
      const research = enqueue(JOB_TYPES.RESEARCH_PACK_BUILD, {
        workflowRunId: queued.runId,
        planId: intelligence.workflowPlan.planId,
        query: userText,
        scope: body?.researchScope || "chat",
        recencyWindow: body?.recencyWindow || "30d",
        allowlistVersion: body?.allowlistVersion || "v1",
        sourceCap: body?.sourceCap || 10,
        timeboxMs: body?.timeboxMs || 1200,
        reportMode: body?.extendedReport === true ? "extended" : "short",
        autoAnalyze: true,
        chatId,
        sessionId: chatId,
      });
      researchRun = {
        runId: research.runId,
        status: research.status,
        timelineUrl: `/api/jobs/${research.runId}/timeline`,
        timelineStreamUrl: `/api/jobs/${research.runId}/timeline/stream`,
        evidencePackByPlanUrl: `/api/jobs/research/plan/${encodeURIComponent(intelligence.workflowPlan.planId)}`,
        analysisReportByPlanUrl: `/api/jobs/analysis/plan/${encodeURIComponent(intelligence.workflowPlan.planId)}`,
      };
    }
  } catch {
    // non-blocking best effort
  }

  if (userText && isLearningWorthyChatText(userText)) {
    try {
      await proposeFromChatIfAllowed({
        tenantId: actor.tenantId,
        userId: actor.userId,
        title: "Chat-derived learning candidate",
        rawContent: userText,
        sourceRef: body?.conversationId ? String(body.conversationId) : null,
      });
    } catch {
      // best-effort; demo chat response remains stable
    }
  }

  // Phase-1: Return stub reply with stable schema - never 500
  const reply =
    "Hello! I'm RocketGPT running in Phase-1 demo mode. " +
    `Selected ${intelligence.workflowPlan.nodes.length} CAT route nodes ` +
    `with confidence ${(intelligence.confidence * 100).toFixed(0)}%. ` +
    (intelligence.requiresResearch
      ? "This request may require research mode."
      : "This request can stay in fast routing mode.");

  return NextResponse.json({
    ok: true,
    mode: "demo",
    reply,
    usage: null,
    error: null,
    intelligence: {
      workflowPlan: intelligence.workflowPlan,
      iqScorecard: intelligence.iqScorecard,
      confidence: intelligence.confidence,
      requiresResearch: intelligence.requiresResearch,
      telemetry: intelligence.telemetry,
      asyncRun,
      researchRun,
    },
  });
}
