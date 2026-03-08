import { NextRequest } from "next/server";

import { readTimelineEvents } from "@/lib/jobs/timeline.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ runId: string }> };

function sseEncode(eventName: string, data: unknown): string {
  return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { runId } = await ctx.params;
  const planId = req.nextUrl.searchParams.get("planId");
  const startSeq = Number(req.nextUrl.searchParams.get("afterSeq") || "0");
  const pollMs = 500;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let cursor = Number.isFinite(startSeq) ? startSeq : 0;
      let heartbeatAt = Date.now();
      let closed = false;

      const push = (raw: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(raw));
      };

      const tick = () => {
        const rows = readTimelineEvents(runId, {
          afterSeq: cursor,
          limit: 200,
          planId: planId || undefined,
        });
        if (rows.length > 0) {
          for (const row of rows) {
            push(sseEncode(String(row.type || "EVENT"), row));
            cursor = Math.max(cursor, Number(row.seq || cursor));
          }
        }
        if (Date.now() - heartbeatAt > 10_000) {
          heartbeatAt = Date.now();
          push(`: ping ${heartbeatAt}\n\n`);
        }
      };

      push(sseEncode("CONNECTED", { ok: true, runId, cursor }));
      const timer = setInterval(tick, pollMs);
      tick();

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          // no-op
        }
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

