import { NextRequest, NextResponse } from "next/server";

import { listPublishedLearningItems, listTopicsForItem } from "@/lib/db/learningRepo";
import { readLearningActor } from "@/lib/learning/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    const actor = readLearningActor(req);
    const rows = await listPublishedLearningItems(actor.tenantId);
    const items = [];
    for (const row of rows) {
      items.push({
        ...row.item,
        topics: await listTopicsForItem(actor.tenantId, row.item.id),
        libraryPath: row.path?.file_path ?? null,
        libraryId: row.path?.library_id ?? null,
      });
    }
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list published learning items." }, { status: 400 });
  }
}
