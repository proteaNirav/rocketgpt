import { NextRequest, NextResponse } from "next/server";

import { getLearningLibraryPath, listLearningItems, listTopicsForItem } from "@/lib/db/learningRepo";
import { readLearningActor } from "@/lib/learning/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    const actor = readLearningActor(req);
    const statusRaw = (req.nextUrl.searchParams.get("status") || "").trim().toLowerCase();
    const status =
      statusRaw === "proposed" ||
      statusRaw === "approved" ||
      statusRaw === "published" ||
      statusRaw === "rejected" ||
      statusRaw === "revoked" ||
      statusRaw === "deprecated"
        ? statusRaw
        : undefined;
    const items = await listLearningItems({ tenantId: actor.tenantId, status, limit: 200 });
    const enriched = [];
    for (const item of items) {
      const [topics, path] = await Promise.all([
        listTopicsForItem(actor.tenantId, item.id),
        getLearningLibraryPath(actor.tenantId, item.id),
      ]);
      enriched.push({ ...item, topics, libraryPath: path?.file_path ?? null, libraryId: path?.library_id ?? null });
    }
    return NextResponse.json({ items: enriched }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list learning items." }, { status: 400 });
  }
}
