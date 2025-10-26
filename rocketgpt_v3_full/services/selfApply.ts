// services/selfApply.ts
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

export type QATaskRow = {
  kind: "lint" | "unit" | "e2e" | "static_analysis" | "security" | "manual_review";
  status: "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "SKIPPED";
  updated_at: string;
};

type RpcRow = { kind: QATaskRow["kind"]; status: QATaskRow["status"]; updated_at: string };

export async function passManualReview(jobId: string, actor = "superuser") {
  const sb = getSupabase();
  const { data, error } = await sb.rpc<RpcRow>("pass_manual_review", {
    p_job_id: jobId,
    p_actor: actor,
  });
  if (error) throw new Error(formatSupabaseError(error));
  return data;
}

export async function getQaTasks(jobId: string) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("qa_tasks")
    .select("kind,status,updated_at")
    .eq("job_id", jobId)
    .order("kind", { ascending: true });
  if (error) throw new Error(formatSupabaseError(error));
  return data as QATaskRow[];
}

export async function getJob(jobId: string) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("self_apply_jobs")
    .select("id,state,proposal_id,started_at,finished_at,error")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw new Error(formatSupabaseError(error));
  return data;
}

function formatSupabaseError(error: PostgrestError) {
  return `${error.code ?? ""} ${error.message ?? "Supabase error"}`
    .trim() + (error.details ? ` — ${error.details}` : "");
}
