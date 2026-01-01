-- RGPT-S2-C-09 — REVOKE PLAN (NOT APPLIED)
-- Generated: 2026-01-01T08:47:43Z
-- Scope: revoke EXECUTE on selected functions from PUBLIC/anon/authenticated

REVOKE EXECUTE ON FUNCTION public.fn_enqueue_self_apply_job FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.migrate_guest_data FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.pass_manual_review FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.rgpt_block_ledger_mutation FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.rgpt_block_update_delete FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.rgpt_ci_write_ledger FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.rgpt_ci_write_ledger_smoketest FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.rgpt_guard_trigger FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.rgpt_ingest_selfimprove_ci FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.rgpt_ingest_selfimprove_event FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.rgpt_selfimprove_ingest_event FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.rl_check_and_increment FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_approvals_timestamp FROM PUBLIC, anon, authenticated;

-- DISABLED (function not found): REVOKE EXECUTE ON FUNCTION public.rgpt_selfimprove_ingest_event_core FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION rgpt.rgpt_selfimprove_ingest_event FROM PUBLIC, anon, authenticated;
-- DISABLED (function not found): REVOKE EXECUTE ON FUNCTION rgpt.rgpt_selfimprove_ingest_event_core FROM PUBLIC;

