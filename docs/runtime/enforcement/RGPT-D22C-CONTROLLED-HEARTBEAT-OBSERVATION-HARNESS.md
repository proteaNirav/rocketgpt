# RGPT-D22-Candidate - Controlled Heartbeat Activation and Observation Harness

## Purpose
Provide an explicit, bounded operational harness for controlled heartbeat activation and runtime observation.

The harness is measurement-only and is intended to validate:
- signal quality
- event volume
- runtime state growth
- observation overhead

It does not modify D20/D21/D22 runtime semantics.

## Architecture
Modules:
- `src/core/cognitive-mesh/runtime/observation/runtime-heartbeat-observation-config.ts`
- `src/core/cognitive-mesh/runtime/observation/runtime-heartbeat-observation-session.ts`
- `src/core/cognitive-mesh/runtime/observation/runtime-heartbeat-snapshot-capture.ts`
- `src/core/cognitive-mesh/runtime/observation/runtime-heartbeat-resource-measurer.ts`
- `src/core/cognitive-mesh/runtime/observation/runtime-heartbeat-observation-reporter.ts`
- `src/core/cognitive-mesh/runtime/observation/runtime-heartbeat-observation-orchestrator.ts`

CLI:
- `npm run cognitive:runtime:observe-heartbeat`

## Observation Mode
Opt-in only:
- `RGPT_HEARTBEAT_OBSERVATION_ENABLED=true` (or explicit CLI enable path)

Supported controls:
- duration (`--duration-ms`, `--duration-minutes`)
- snapshot interval (`--snapshot-interval-ms`)
- output directory (`--output-dir`)
- smoke mode (`--smoke`)
- memory samples toggle (`--include-memory-samples`)

Defaults (non-smoke):
- duration: 2 hours
- snapshot interval: 5 minutes
- output root: `.rocketgpt/runtime/observations/`

## Session Behavior
For each session:
1. Create `.rocketgpt/runtime/observations/<sessionId>/`
2. Write session manifest
3. Periodically run heartbeat monitor pulse
4. Capture runtime snapshots and event/storage metrics
5. Write final summary + markdown report
6. Exit cleanly after bounded duration

## Snapshot Measurement Model
Each snapshot captures:
- runtime state file availability and size (`heartbeat`, `repair`, `repair-learning`, `containment`, `stability`, `evolution`)
- total state bytes
- runtime directory size
- observation directory size
- bounded event volume counts from ledger window
- snapshot processing duration
- optional memory sample
- process CPU usage delta proxy

Missing files are recorded explicitly; capture does not fail because of absent optional surfaces.

## Storage and Overhead Model
Summary includes:
- average/max snapshot duration
- total/average observation write bytes
- estimated runtime artifact growth bytes
- event counts by resilience domain
- memory sample series
- CPU sample series (process usage delta)
- deterministic overhead classification (`light|moderate|heavy`)

CPU note:
- no external profiler is used
- process CPU usage delta is used as bounded proxy

## Report Outputs
Per session:
- `observation-summary.json`
- `observation-report.md`

Report sections:
- session overview
- storage growth summary
- event volume summary
- overhead summary
- notable anomalies
- signal-noise assessment
- recommendation:
  - `safe_to_keep_controlled_heartbeat_on`
  - `safe_with_tuning`
  - `too_noisy_or_too_heavy`

## Safety Boundaries
This harness does not:
- mutate governance rules
- change repair/learning/containment/stability policies
- call external services
- run as a permanent always-on daemon
- add heavyweight profiling dependencies

## Operational Guidance (2-hour Run)
Example:
- `npm run cognitive:runtime:observe-heartbeat -- --duration-minutes 120`

Recommended operational practice:
- run in controlled maintenance/observation window
- archive generated session artifacts for review
- compare event growth and overhead across repeated observation runs

## Limitations
- session runner is bounded and process-local
- CPU measurement is proxy-level, not full profiler telemetry
- event counting depends on available ledger data in configured path
- this phase does not auto-tune runtime settings
