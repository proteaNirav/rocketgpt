# Mishti Interaction Matrix V1

## 1. Purpose

This document defines first-life interaction boundaries between major Mishti AI subsystems.

## 2. Interaction Rules

| Source | Target | Allowed First-Life Interaction | Forbidden Without Governance |
|---|---|---|---|
| Owner | Governance Engine | approve, suspend, recover, emergency override | none within root scope |
| Governance Engine | Brain | policy envelopes, task constraints, emergency state | hidden direct plan mutation |
| Brain | Librarian | capability lookup, routing queries, evidence-linked assignment | unregistered builder bypass |
| Brain | Builder | bounded task assignment | trust bypass or silent privilege grant |
| Builder | CATS | approved execution request | ungoverned direct runtime execution |
| CATS | OS | bounded host action | unrestricted host mutation |
| Librarian | Builder | registration, trust state, routing metadata | implicit trust promotion |
| Documentor Mesh | Governance Engine | evidence references, anchor lookup | normative governance mutation |
| Police or Sentinel | Consortium | alerts and escalations | silent punitive action without evidence |
| Consortium | Brain | wave guidance, hold, or reassign | hidden direct builder execution |

## 3. Principle

Interactions are allowed only when authority, trust, evidence, and scope all align. First-life operation requires explicit boundary discipline between planning, governance, execution, evidence, and emergency control.
