import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("file") ?? [];
    const count = files.length;

    // TODO: Wire this into RocketGPT ingestion/orchestration.
    // For now, we only count files to prove the upload pipeline works.
    return NextResponse.json({
      ok: true,
      receivedFiles: count,
      message:
        "Demo upload endpoint. Files are not persisted in this placeholder version.",
    });
  } catch (err: any) {
    console.error("Error in /api/demo/upload:", err);
    return NextResponse.json(
      { error: "Internal error in /api/demo/upload" },
      { status: 500 }
    );
  }
}
