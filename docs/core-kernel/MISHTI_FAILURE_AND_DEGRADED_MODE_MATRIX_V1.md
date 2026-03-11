# Mishti Failure And Degraded Mode Matrix V1

## 1. Purpose

This document defines first-life failure classes and degraded-mode responses for Mishti AI.

## 2. Failure Matrix

| Failure Class | Example | Required Response | Escalation |
|---|---|---|---|
| Governance uncertainty | policy state unavailable | freeze protected actions | owner or governance emergency |
| Root trust uncertainty | signing chain invalid | isolate and move to recovery_only | owner authority |
| Brain coordination failure | conflicting plans or node split | degrade planning breadth | Consortium and Librarian |
| Builder pool collapse | no trusted builders available | pause non-essential tasks | Brain and Consortium |
| Librarian outage | registry or evidence intake unavailable | operate in bounded local mode only if policy permits | guarded or frozen |
| Documentor continuity gap | missing event chain or anchor path | block protected promotion paths | Police or Sentinel |
| Runtime compromise suspicion | sandbox escape or host integrity failure | isolate runtime path | emergency control |
| CATS or OS unreachability | execution path unavailable | reroute or pause execution | degraded mode |
| Police or Sentinel critical alert | policy violation or rogue activity | halt affected path | governance escalation |

## 3. General Degraded Rules

When degraded mode is entered, the platform should:

- reduce concurrency
- prioritize critical tasks only
- reserve trusted builders
- suppress speculative work
- preserve evidence and recovery paths

## 4. Non-Recoverable Condition Rule

If the platform cannot establish trust, governance, or kill-path reachability, it must prefer freeze or kill over optimistic continuation.
