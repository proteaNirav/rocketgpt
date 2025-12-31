-- ==========================================================
-- RGPT-S2-C-08 — REVOKE Plan (GENERATED)
-- Generated: 2025-12-31 19:48:34
-- Source delta: docs/ops/executions/RGPT-S2-C-08/delta/grants_delta_20251231-194659.json
-- NOTE: This file is NOT executed automatically.
-- ==========================================================

BEGIN;
-- REVIEW FIRST. If approved, run in Supabase SQL Editor or via psql.

-- Table: public.orchestrator_runs  Role: authenticated  Privileges: INSERT, UPDATE
REVOKE INSERT ON TABLE "public"."orchestrator_runs" FROM "authenticated";
REVOKE UPDATE ON TABLE "public"."orchestrator_runs" FROM "authenticated";

-- Table: public.proposals  Role: authenticated  Privileges: INSERT, UPDATE
REVOKE INSERT ON TABLE "public"."proposals" FROM "authenticated";
REVOKE UPDATE ON TABLE "public"."proposals" FROM "authenticated";

-- Table: public.self_apply_jobs  Role: authenticated  Privileges: INSERT, UPDATE
REVOKE INSERT ON TABLE "public"."self_apply_jobs" FROM "authenticated";
REVOKE UPDATE ON TABLE "public"."self_apply_jobs" FROM "authenticated";

-- Table: realtime.messages  Role: anon  Privileges: INSERT, UPDATE

-- Table: realtime.messages  Role: authenticated  Privileges: INSERT, UPDATE

-- Table: storage.buckets  Role: anon  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE

-- Table: storage.buckets  Role: authenticated  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE

-- Table: storage.buckets_analytics  Role: anon  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE

-- Table: storage.buckets_analytics  Role: authenticated  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE

-- Table: storage.objects  Role: anon  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE

-- Table: storage.objects  Role: authenticated  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE

-- Table: storage.prefixes  Role: anon  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE

-- Table: storage.prefixes  Role: authenticated  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE

-- If everything looks correct:
-- COMMIT;
-- Otherwise:
-- ROLLBACK;
ROLLBACK;
