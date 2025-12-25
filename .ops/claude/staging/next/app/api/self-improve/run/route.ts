import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(): Promise<Response> {
  const now = new Date().toISOString();

  // Fallback placeholder run
  const placeholder = {
    ok: true,
    source: "placeholder",
    message:
      "Supabase not configured or returned no results. Showing placeholder data.",
    runs: [
      {
        run_id: null,
        run_number: null,
        repository: "proteaNirav/rocketgpt",
        sha: null,
        ref: null,
        phase: "plan+simulate",
        status: "completed",
        title: "Self-Improve (plan+simulate)",
        summary:
          "Placeholder data: Self-Improve visibility API is wired. Supabase history not yet connected.",
        created_at: now,
      },
    ],
  };

  // If Supabase config missing → fallback
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(placeholder);
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/self_improve_runs?select=*&order=created_at.desc&limit=20`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(placeholder);
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(placeholder);
    }

    return NextResponse.json({
      ok: true,
      source: "supabase",
      runs: data,
    });
  } catch (err) {
    return NextResponse.json(placeholder);
  }
}
