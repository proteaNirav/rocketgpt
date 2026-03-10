# Mishti AI Self-Improve System

## Goal
Detect -> Propose -> Validate -> Execute -> Verify -> PR -> Ledger

## Feature Flag
- `SELF_IMPROVE_ENABLED` controls scan/propose/validate/execute.
- Default is off. Set `SELF_IMPROVE_ENABLED=true` to enable.

## CLI Commands
- Scan detectors + draft proposals:
  - `npm run self-improve:scan`
- Materialize a proposal from one finding:
  - `npm run self-improve:propose -- --finding <finding_id>`
- Validate existing proposal JSON:
  - `npm run self-improve:validate -- --proposal <proposal_id>`
- Execute proposal (bounded patches, verification, branch + PR):
  - `npm run self-improve:execute -- --proposal <proposal_id>`
  - Dry-run: `npm run self-improve:execute -- --proposal <proposal_id> --dry-run`

## API Routes
- `POST /api/self-improve/scan`
- `POST /api/self-improve/validate`
- `POST /api/self-improve/execute`
- `GET /api/self-improve/findings`
- `GET /api/self-improve/proposals`

Auth and governance:
- All routes require governance auth headers.
- Execute is admin-only (`x-governance-role: admin` + `x-admin-token`).
- Routes apply in-memory rate limiting.
- Safe-mode/policy/replay gates are verification requirements; execution fails if required checks fail.

## Safety Model
- Proposal JSON must pass strict contract validation (`docs/self_improve/self_improve_proposal.schema.json` template-derived rules).
- Execution is bounded by:
  - `plan.scope.allowed_paths`
  - `plan.scope.disallowed_paths`
  - `plan.scope.max_files_changed`
- `approvals.requires_human` defaults to true.
- `approvals.auto_merge_allowed` defaults to false.
- No direct push to `main`; execution creates `self-improve/<proposal_id>` and opens PR.
- Deterministic patching only:
  - `deterministic:prettier:<path>`
  - `deterministic:type-import:<Symbol>:<module>`
  - `manual_placeholder:*` (creates bounded TODO marker)

## Evidence + Ledgers Layout
- Proposals: `docs/self_improve/proposals/<proposal_id>.json`
- Proposal status/meta: `docs/self_improve/proposals/<proposal_id>.meta.json`
- Findings snapshot: `docs/self_improve/findings/latest.json`
- Evidence bundles: `docs/self_improve/evidence/<scan_or_proposal_id>/...`
- Decision ledger: `docs/self_improve/ledgers/decision_ledger.jsonl`
- Execution ledger: `docs/self_improve/ledgers/execution_ledger.jsonl`

Every scan/propose/validate/execute action writes:
- timestamp
- actor
- proposal_id (if available)
- evidence references

## Extending Detectors
- Source file: `apps/core-api/self_improve/detectors.mjs`
- Current detectors:
  - CI failure detector
  - Policy/gate violation detector
  - Replay drift detector
- To add a detector:
  1. Implement detector function returning normalized finding objects.
  2. Persist raw evidence into the evidence bundle.
  3. Register in `runAllDetectors`.
  4. Add tests covering parser and finding outputs.

<!-- SELF_IMPROVE_TODO:SI-20260304-1445-DEMO -->
- Proposal: SI-20260304-1445-DEMO
- Rationale: manual_placeholder:Add bounded TODO patch instructions for a human-approved fix.
- Action: human review + bounded patch
