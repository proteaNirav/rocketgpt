import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("file") ?? [];

    const ingested = await Promise.all(
      files.map(async (entry: any) => {
        const f = entry as File;
        const size = f.size ?? 0;
        const type = f.type ?? "application/octet-stream";
        let preview: string | null = null;

        if (size > 0 && size <= 100_000) {
          try {
            const text = await f.text();
            preview = text.slice(0, 500);
          } catch {
            preview = null;
          }
        }

        return {
          name: f.name ?? "unnamed",
          size,
          type,
          preview
        };
      })
    );

    // TODO: In a full implementation, persist ingested metadata into Supabase
    // or the knowledge library for self-study. For this demo, we return it to the UI.
    return NextResponse.json({
      ok: true,
      receivedFiles: ingested.length,
      ingested,
      message:
        "Demo ingestion successful. Files are not persisted in this version, but the pipeline from UI → API → orchestrator is wired."
    });
  } catch (err) {
    console.error("Error in /api/demo/upload:", err);
    return NextResponse.json(
      { error: "Internal error in /api/demo/upload" },
      { status: 500 }
    );
  }
}
