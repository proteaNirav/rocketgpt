insert into public.rgpt_planner_plan_ledger
(
  plan_id,
  schema_version,
  phase,
  status,
  plan_hash,
  intent_hash,
  repo_state_hash,
  policy_state_hash,
  approval_required,
  approval_status,
  approval_ref,
  supersedes_plan_id,
  plan_json
)
values
(
  'RGPT-S2-PLAN-20251221-001',
  'planner.v1',
  'S2',
  'approved',
  'sha256:8012d9d4e0235f495d27d838caa97738ce241310f8808924e23591f94b84c4bb',
  'sha256:0000000000000000000000000000000000000000000000000000000000000000',
  'sha256:0000000000000000000000000000000000000000000000000000000000000000',
  'sha256:0000000000000000000000000000000000000000000000000000000000000000',
  true,
  'approved',
  'manual-approval-2025-12-21',
  'RGPT-S2-PLAN-20251221-001',
  '{
    "schema_version":  "planner.v1",
    "plan_id":  "RGPT-S2-PLAN-20251221-001",
    "created_at":  "2025-12-21T15:55:00+05:30",
    "phase":  "S2",
    "status":  "approved",
    "input_fingerprint":  {
                              "intent_hash":  "sha256:0000000000000000000000000000000000000000000000000000000000000000",
                              "repo_state_hash":  "sha256:0000000000000000000000000000000000000000000000000000000000000000",
                              "policy_state_hash":  "sha256:0000000000000000000000000000000000000000000000000000000000000000"
                          },
    "normalized_goal":  {
                            "original_input":  "RGPT-S2-B-02 — Planner Output Schema (JSON + MD)",
                            "interpreted_goal":  "Lock Planner v1 output schema and validation utilities",
                            "success_criteria":  [
                                                     "Schema template present",
                                                     "Schema JSON file present",
                                                     "Hash tool present",
                                                     "Validation tool present"
                                                 ],
                            "explicit_non_goals":  [
                                                       "Planner execution engine",
                                                       "Decision ledger persistence layer"
                                                   ]
                        },
    "scope_contract":  {
                           "in_scope":  [
                                            "Planner output contract",
                                            "Hashing rules",
                                            "Validation rules"
                                        ],
                           "out_of_scope":  [
                                                "Running commands",
                                                "Modifying repo state automatically"
                                            ],
                           "phase_lock":  "S2-only"
                       },
    "tasks":  [
                  {
                      "task_id":  "TASK-01",
                      "title":  "Create Planner schema artifacts",
                      "description":  "Add v1 templates, schema definition, and tooling contracts.",
                      "category":  "design",
                      "effort":  2,
                      "risk":  2,
                      "reversible":  true,
                      "preconditions":  [
                                            "Repo is available locally"
                                        ],
                      "postconditions":  [
                                             "Schema files exist",
                                             "Tools exist"
                                         ]
                  }
              ],
    "dependencies":  [

                     ],
    "risk_summary":  {
                         "overall_risk":  2,
                         "highest_risk_task":  "TASK-01",
                         "risk_factors":  [
                                              "Breaking downstream contract if schema changes"
                                          ]
                     },
    "approvals":  {
                      "required":  true,
                      "reason":  [
                                     "Schema lock affects downstream systems"
                                 ],
                      "required_level":  "architect",
                      "approval_status":  "approved"
                  },
    "rollback_strategy":  {
                              "supported":  true,
                              "method":  "versioned_schema_revert",
                              "fallback_version":  "planner.v0"
                          },
    "constraints":  {
                        "no_execution":  true,
                        "ledger_append_only":  true,
                        "safe_mode_respected":  true
                    },
    "outputs":  {
                    "artifacts":  [
                                      "ExecutionPlan.json",
                                      "ExecutionPlan.md"
                                  ],
                    "consumers":  [
                                      "Orchestrator",
                                      "DecisionLedger",
                                      "ApprovalGate"
                                  ]
                },
    "hash":  "sha256:8012d9d4e0235f495d27d838caa97738ce241310f8808924e23591f94b84c4bb"
}
'::jsonb
);
