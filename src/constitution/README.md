# Mishti AI Constitutional Backend

This directory contains scaffold-only backend contracts and module skeletons for constitutional governance.

Key principles:
- constitutional state is backend-governed rather than UI-defined
- protected core principles are separate from amendable legislative policies
- proposal, review, approval, and activation are required before shared constitutional changes take effect
- emergency controls and trusted snapshots exist to preserve rollback safety
- constitution YAML loading now exists through a narrow bridge path
- schema validation now exists for the machine-usable constitutional artifact
- version metadata can be registered and one version can be marked active in the scaffold registry
- ledger-compatible lifecycle events now exist for proposal, approval, activation, and snapshot stages
- a controlled runtime and governance entry path now exists through `constitutional-runtime-bridge.ts`
- the bridge orchestrates load, validate, register, active and trusted reference handling, and optional lifecycle emission
- this remains a narrow bridge and not full constitutional enforcement
- current modules are intentionally skeletal and do not claim production completeness
