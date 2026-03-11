# Mishti Builder Trust And Routing Spec V1

## 1. Purpose

This document defines first-life builder trust, registration, routing, promotion, demotion, and fallback rules for Mishti AI.

## 2. Builder Classes

First-life builder classes may include:

- internal builders
- external builders
- specialized builders
- quarantined builders

Builder class does not itself imply trust level.

## 3. Required Builder Records

The platform must track at least:

- builder ID
- builder class
- declared capabilities
- trust class
- allowed scopes
- blocked scopes
- health status
- evidence continuity status
- review history
- promotion eligibility

## 4. Trust Classes

Recommended trust classes:

- `provisional`
- `bounded`
- `trusted`
- `restricted`
- `quarantined`

Routing eligibility must depend on trust class plus current health and evidence status.

## 5. Routing Rules

The Brain and Librarian must route builders according to:

- capability match
- trust class
- current health
- evidence continuity
- governance mode
- survival and degraded-state rules

No builder may be routed solely because it is available.

## 6. Promotion And Demotion

Promotion requires:

- successful work history
- verified outputs
- acceptable evidence continuity
- policy compliance
- explicit approval under current governance rules

Demotion triggers include:

- repeated failure
- evidence gaps
- policy violation
- integrity uncertainty
- compromise suspicion

## 7. Builder Loss Survival Rule

Mishti AI must be able to survive the loss of individual builders or builder clusters by:

- maintaining alternate builder paths
- degrading workload breadth
- rerouting critical tasks
- pausing non-essential work

## 8. Quarantine

Quarantined builders may not receive ordinary work. Re-entry requires explicit review and re-authorization.

## 9. Readiness Requirement

The builder ecosystem is first-life ready only when registration, routing, trust scoring, quarantine, and fallback routing are all defined and attributable.
