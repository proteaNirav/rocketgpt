#!/usr/bin/env node

// Self-Improve status writer
// - Safe by default: if Supabase config is missing, just logs JSON and exits 0
// - When configured, writes a row into `self_improve_runs` via Supabase REST

const run = async () => {
  const {
    GITHUB_RUN_ID,
    GITHUB_RUN_NUMBER,
    GITHUB_REPOSITORY,
    GITHUB_SHA,
    GITHUB_REF,

    SELF_IMPROVE_PHASE,
    SELF_IMPROVE_STATUS,
    SELF_IMPROVE_TITLE,
    SELF_IMPROVE_SUMMARY,
    SELF_IMPROVE_DETAILS_JSON,

    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = process.env;

  const payload = {
    run_id: GITHUB_RUN_ID || null,
    run_number: GITHUB_RUN_NUMBER ? parseInt(GITHUB_RUN_NUMBER, 10) : null,
    repository: GITHUB_REPOSITORY || null,
    sha: GITHUB_SHA || null,
    ref: GITHUB_REF || null,

    phase: SELF_IMPROVE_PHASE || "unknown",
    status: SELF_IMPROVE_STATUS || "unknown",
    title: SELF_IMPROVE_TITLE || null,
    summary: SELF_IMPROVE_SUMMARY || null,
    // details is JSONB in DB, so we try to parse, otherwise store as null
    details: (() => {
      if (!SELF_IMPROVE_DETAILS_JSON) return null;
      try {
        return JSON.parse(SELF_IMPROVE_DETAILS_JSON);
      } catch (err) {
        console.warn("[self-improve] Could not parse SELF_IMPROVE_DETAILS_JSON:", err);
        return { raw: SELF_IMPROVE_DETAILS_JSON };
      }
    })(),
  };

  // If Supabase is not configured, stay a NO-OP (but still useful log)
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log("[self-improve] Supabase not configured; dumping payload only:");
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const url = `${SUPABASE_URL}/rest/v1/self_improve_runs`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("[self-improve] Failed to write status:", res.status, txt);
      // Do NOT fail CI – visibility is best-effort
      process.exitCode = 0;
      return;
    }

    const json = await res.json();
    console.log("[self-improve] Status written to Supabase:");
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("[self-improve] Unexpected error while writing status:", err);
    // Again, do not fail the whole workflow
    process.exitCode = 0;
  }
};

run().catch((err) => {
  console.error("[self-improve] Top-level error:", err);
  process.exitCode = 0;
});
