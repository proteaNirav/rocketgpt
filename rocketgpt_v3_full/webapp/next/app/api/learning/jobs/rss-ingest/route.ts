import { NextRequest, NextResponse } from "next/server";

import { listLearningSources } from "@/lib/db/learningRepo";
import { readLearningActor } from "@/lib/learning/api-auth";
import { ingestRssSource } from "@/lib/learning/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: NextRequest) {
  try {
    const actor = readLearningActor(req);
    if (!actor.isAdmin) {
      return NextResponse.json({ error: "Admin token required." }, { status: 401 });
    }
    const sources = await listLearningSources(actor.tenantId);
    const rssSources = sources.filter((x) => x.kind === "rss" && x.enabled);
    let fetchedCount = 0;
    let proposedCount = 0;
    const errors: string[] = [];
    for (const source of rssSources) {
      try {
        const run = await ingestRssSource({
          tenantId: actor.tenantId,
          sourceId: source.id,
          actorUserId: actor.userId,
        });
        fetchedCount += run.fetchedCount;
        proposedCount += run.proposedCount;
      } catch (error) {
        errors.push(`${source.id}: ${error instanceof Error ? error.message : "failed"}`);
      }
    }
    return NextResponse.json(
      {
        sourceCount: rssSources.length,
        fetchedCount,
        proposedCount,
        errors,
      },
      { status: errors.length > 0 ? 207 : 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "RSS scheduler run failed." }, { status: 400 });
  }
}
