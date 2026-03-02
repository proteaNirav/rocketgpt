import { NextResponse } from "next/server";
import { getApproval } from "@/lib/db/approvalsRepo";

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

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await ctx.params;
  const id = parseApprovalId(idParam);

  if (id === null) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  try {
    const approval = await getApproval(id);
    if (!approval) {
      return NextResponse.json({ error: "Approval not found." }, { status: 404 });
    }
    return NextResponse.json(approval, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
