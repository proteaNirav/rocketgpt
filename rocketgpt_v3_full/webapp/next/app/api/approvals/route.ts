import { NextRequest, NextResponse } from "next/server";
import { listApprovals, submitApproval } from "@/lib/db/approvalsRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function parsePositiveInt(value: string | null, fallback: number): number | null {
  if (!value) {
    return fallback;
  }
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Internal server error";
}

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status")?.trim() || undefined;
  const page = parsePositiveInt(req.nextUrl.searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(req.nextUrl.searchParams.get("pageSize"), 20);

  if (page === null || pageSize === null) {
    return NextResponse.json(
      { error: "page and pageSize must be positive integers." },
      { status: 400 }
    );
  }

  try {
    const result = await listApprovals({
      status,
      page,
      pageSize: Math.min(pageSize, 100),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const requestType = typeof body?.request_type === "string" ? body.request_type.trim() : "";
  const requestTitle = typeof body?.request_title === "string" ? body.request_title.trim() : "";
  const payload = body?.payload;

  if (!requestType || !requestTitle || payload === undefined || payload === null) {
    return NextResponse.json(
      { error: "request_type, request_title, and payload are required." },
      { status: 400 }
    );
  }

  try {
    const created = await submitApproval({
      request_type: requestType,
      request_title: requestTitle,
      payload,
      priority: typeof body.priority === "string" ? body.priority : undefined,
      risk_level: typeof body.risk_level === "string" ? body.risk_level : undefined,
      channel: typeof body.channel === "string" ? body.channel : undefined,
      actor: typeof body.actor === "string" ? body.actor : undefined,
      requested_by: typeof body.requested_by === "string" ? body.requested_by : undefined,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
