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
REVOKE INSERT ON TABLE "realtime"."messages" FROM "anon";
REVOKE UPDATE ON TABLE "realtime"."messages" FROM "anon";

-- Table: realtime.messages  Role: authenticated  Privileges: INSERT, UPDATE
REVOKE INSERT ON TABLE "realtime"."messages" FROM "authenticated";
REVOKE UPDATE ON TABLE "realtime"."messages" FROM "authenticated";

-- Table: storage.buckets  Role: anon  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE
REVOKE DELETE ON TABLE "storage"."buckets" FROM "anon";
REVOKE INSERT ON TABLE "storage"."buckets" FROM "anon";
REVOKE REFERENCES ON TABLE "storage"."buckets" FROM "anon";
REVOKE TRIGGER ON TABLE "storage"."buckets" FROM "anon";
REVOKE TRUNCATE ON TABLE "storage"."buckets" FROM "anon";
REVOKE UPDATE ON TABLE "storage"."buckets" FROM "anon";

-- Table: storage.buckets  Role: authenticated  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE
REVOKE DELETE ON TABLE "storage"."buckets" FROM "authenticated";
REVOKE INSERT ON TABLE "storage"."buckets" FROM "authenticated";
REVOKE REFERENCES ON TABLE "storage"."buckets" FROM "authenticated";
REVOKE TRIGGER ON TABLE "storage"."buckets" FROM "authenticated";
REVOKE TRUNCATE ON TABLE "storage"."buckets" FROM "authenticated";
REVOKE UPDATE ON TABLE "storage"."buckets" FROM "authenticated";

-- Table: storage.buckets_analytics  Role: anon  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE
REVOKE DELETE ON TABLE "storage"."buckets_analytics" FROM "anon";
REVOKE INSERT ON TABLE "storage"."buckets_analytics" FROM "anon";
REVOKE REFERENCES ON TABLE "storage"."buckets_analytics" FROM "anon";
REVOKE TRIGGER ON TABLE "storage"."buckets_analytics" FROM "anon";
REVOKE TRUNCATE ON TABLE "storage"."buckets_analytics" FROM "anon";
REVOKE UPDATE ON TABLE "storage"."buckets_analytics" FROM "anon";

-- Table: storage.buckets_analytics  Role: authenticated  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE
REVOKE DELETE ON TABLE "storage"."buckets_analytics" FROM "authenticated";
REVOKE INSERT ON TABLE "storage"."buckets_analytics" FROM "authenticated";
REVOKE REFERENCES ON TABLE "storage"."buckets_analytics" FROM "authenticated";
REVOKE TRIGGER ON TABLE "storage"."buckets_analytics" FROM "authenticated";
REVOKE TRUNCATE ON TABLE "storage"."buckets_analytics" FROM "authenticated";
REVOKE UPDATE ON TABLE "storage"."buckets_analytics" FROM "authenticated";

-- Table: storage.objects  Role: anon  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE
REVOKE DELETE ON TABLE "storage"."objects" FROM "anon";
REVOKE INSERT ON TABLE "storage"."objects" FROM "anon";
REVOKE REFERENCES ON TABLE "storage"."objects" FROM "anon";
REVOKE TRIGGER ON TABLE "storage"."objects" FROM "anon";
REVOKE TRUNCATE ON TABLE "storage"."objects" FROM "anon";
REVOKE UPDATE ON TABLE "storage"."objects" FROM "anon";

-- Table: storage.objects  Role: authenticated  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE
REVOKE DELETE ON TABLE "storage"."objects" FROM "authenticated";
REVOKE INSERT ON TABLE "storage"."objects" FROM "authenticated";
REVOKE REFERENCES ON TABLE "storage"."objects" FROM "authenticated";
REVOKE TRIGGER ON TABLE "storage"."objects" FROM "authenticated";
REVOKE TRUNCATE ON TABLE "storage"."objects" FROM "authenticated";
REVOKE UPDATE ON TABLE "storage"."objects" FROM "authenticated";

-- Table: storage.prefixes  Role: anon  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE
REVOKE DELETE ON TABLE "storage"."prefixes" FROM "anon";
REVOKE INSERT ON TABLE "storage"."prefixes" FROM "anon";
REVOKE REFERENCES ON TABLE "storage"."prefixes" FROM "anon";
REVOKE TRIGGER ON TABLE "storage"."prefixes" FROM "anon";
REVOKE TRUNCATE ON TABLE "storage"."prefixes" FROM "anon";
REVOKE UPDATE ON TABLE "storage"."prefixes" FROM "anon";

-- Table: storage.prefixes  Role: authenticated  Privileges: DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE
REVOKE DELETE ON TABLE "storage"."prefixes" FROM "authenticated";
REVOKE INSERT ON TABLE "storage"."prefixes" FROM "authenticated";
REVOKE REFERENCES ON TABLE "storage"."prefixes" FROM "authenticated";
REVOKE TRIGGER ON TABLE "storage"."prefixes" FROM "authenticated";
REVOKE TRUNCATE ON TABLE "storage"."prefixes" FROM "authenticated";
REVOKE UPDATE ON TABLE "storage"."prefixes" FROM "authenticated";

-- If everything looks correct:
-- COMMIT;
-- Otherwise:
-- ROLLBACK;
ROLLBACK;
