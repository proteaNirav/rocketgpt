# RGPT-ARCH-C.md
## RocketGPT — Phase C: Marketplace & Ecosystem

**Project:** RocketGPT (RGPT)  
**Phase:** C — Marketplace & Ecosystem  
**Document Class:** Architecture + Governance Specification  
**Status:** Final Baseline (Living Document)  
**Location:** `docs/architecture/RGPT-ARCH-C.md`

---

## 1. Purpose

This document defines **Phase C** of RocketGPT: the governed **Marketplace & Ecosystem layer**.

Phase C enables extensibility—CATs, wrappers, provider adapters, and execution strategies—**without weakening governance**.  
All marketplace assets must **inherit and obey** Phase A (Approval) and Phase B (STRICT Routing).

Phase C answers one question only:

> *“Who is allowed to extend RocketGPT, and under what enforceable rules?”*

---

## 2. Scope

Phase C governs:

- Marketplace asset types and boundaries
- Onboarding and approval of third-party assets
- Versioning, certification, and revocation
- Distribution, visibility, and access control
- Governance inheritance and enforcement

Phase C explicitly excludes:

- Core approval logic (Phase A)
- Provider routing mechanics (Phase B)
- Internal CAT logic design (covered by CAT specs)

---

## 3. Marketplace Principles (Non-Negotiable)

1. **Governance Inheritance**  
   Marketplace assets inherit Phase A and Phase B controls automatically.

2. **No Execution Privilege**  
   Marketplace assets cannot execute directly.

3. **No Silent Behavior**  
   No auto-routing, auto-upgrades, or hidden provider substitution.

4. **Revocability**  
   Any asset can be disabled or revoked centrally with immediate effect.

5. **Auditability**  
   Every install, update, activation, and execution is ledgered.

---

## 4. Marketplace Asset Types

The Marketplace may distribute the following governed assets:

1. **CATs**  
   Reusable, composable AI tasks.

2. **Wrappers / Enhancers**  
   CAT extensions that add constraints or behavior without loosening governance.

3. **Provider Adapters**  
   Interfaces to AI providers (must comply with STRICT routing).

4. **Prompt Templates**  
   Governed templates bound to CAT execution.

5. **Execution Strategies**  
   Predefined patterns (e.g., batch, staged) that still pass Phase A & B.

Each asset type must declare its **governance surface** explicitly.

---

## 5. Marketplace Registry

All marketplace assets must be registered in the **Marketplace Registry**.

Recommended base path: docs/governance/marketplace/registry/


Each asset must have a dedicated folder: docs/governance/marketplace/registry/<ASSET_ID>/


The registry is the **authoritative source** for asset identity and state.

---

## 6. Asset Identity & Metadata

Each asset must declare:

- `asset_id` (immutable)
- `asset_type`
- `name`
- `owner` (individual / org)
- `version`
- `status` (see lifecycle)
- `compatible_rgpt_versions`
- `required_providers` / `required_models`
- `risk_classification` (R0–R3)
- `data_sensitivity`
- `license_terms` (if applicable)

Metadata is **binding** and enforced.

---

## 7. Asset Lifecycle States

Each asset must be in exactly one state:

1. **SUBMITTED**
2. **UNDER_REVIEW**
3. **APPROVED**
4. **ACTIVE**
5. **SUSPENDED**
6. **DEPRECATED**
7. **REVOKED**

State transitions:
- Require Phase A approval
- Must be written to the Decision Ledger

---

## 8. Onboarding & Certification

### 8.1 Submission
Asset owner submits:
- Metadata
- Governance declarations
- Compatibility statements

### 8.2 Review
Policy checks validate:
- Governance inheritance
- Provider/model declarations
- Risk alignment
- Security posture

### 8.3 Approval
Approved assets receive:
- Certification reference
- Allowed usage scope
- Version pinning

### 8.4 Activation
Only ACTIVE assets may be referenced in approvals.

---

## 9. Versioning Rules

- Versions are immutable once published.
- Updates require new versions and re-approval.
- Breaking changes require explicit approval.
- Auto-updates are prohibited.

---

## 10. Distribution & Access Control

Marketplace distribution must support:

- Organization-level allowlists
- User-level visibility controls
- Environment scoping (prod / non-prod)
- Feature flags (governed)

Access control decisions are recorded in the Decision Ledger.

---

## 11. Revocation & Emergency Controls

The platform must support:

- Immediate suspension of assets
- Emergency revocation
- Impact analysis (who/what uses the asset)
- Forced execution failure for revoked assets

Revocation must:
- Fail closed
- Produce governance alerts
- Be ledgered

---

## 12. Execution Rules for Marketplace Assets

Before execution:

1. Asset must be ACTIVE
2. Referenced CATs must be ACTIVE
3. Phase A approval must explicitly allow the asset
4. Phase B STRICT routing must validate providers/models
5. Execution must be ledgered

Marketplace assets **never bypass** these steps.

---

## 13. Compliance & Audit

Marketplace must support:

- Full asset lineage
- Usage tracking
- Certification history
- Revocation history
- Cross-reference with execution ledgers

Missing records constitute audit failure.

---

## 14. Relationship to Other Documents

- **RGPT-ARCH-A.md** — Approval & authority
- **RGPT-ARCH-B.md** — STRICT routing & execution
- **RGPT-GOV-LEDGERS.md** — Evidence & immutability
- **RGPT-GOV-CATS.md** — CAT lifecycle & registry

---

## 15. Completion Note

With this document, **Phase A, Phase B, and Phase C** are architecturally complete.

All future specifications must **conform** to these documents.

---




