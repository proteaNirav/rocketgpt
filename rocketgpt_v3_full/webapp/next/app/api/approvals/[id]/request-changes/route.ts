import { NextRequest, NextResponse } from "next/server";
import { requestChanges } from "@/lib/db/approvalsRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function parseApprovalId(idParam: string): number | null {
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id) || id < 1) {
    return null;
  }
  return id;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Internal server error";
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await ctx.params;
  const id = parseApprovalId(idParam);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const reviewer = typeof body?.reviewer === "string" ? body.reviewer.trim() : "";
  if (!reviewer) {
    return NextResponse.json({ error: "reviewer is required." }, { status: 400 });
  }

  try {
    const updated = await requestChanges(id, {
      reviewer,
      approval_notes:
        typeof body?.approval_notes === "string" ? body.approval_notes : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "Approval not found." }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
