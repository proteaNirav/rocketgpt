// components/selfApply.ts
import { getSupabase } from "../lib/supabase";

export async function passManualReview(jobId: string, actor = "superuser") {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("pass_manual_review", {
    p_job_id: jobId,
    p_actor: actor,
  });
  if (error) throw new Error(error.message || "Supabase RPC error");
  return data;
}
