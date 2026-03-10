# Cognitive Experience Layer (CEL) Overview

## Purpose
CEL captures deterministic, governed runtime experience records after execution outcomes are known.

## Problem Solved
Before CEL, runtime had rich events but no single structured record representing:
- session situation
- capability action
- verification behavior
- final outcome
- contextual signals (fallback/guardrail/recovery/confidence)

CEL adds one assembled record per meaningful execution outcome.

## Placement
Flow:
1. Session Brain and runtime execute request/workflow.
2. Capability Mesh invocation and optional verification complete.
3. Route outcome resolves.
4. CEL assembles and classifies final experience.
5. Capture policy decides whether to store.
6. Meaningful records are stored in bounded in-memory repository.

## What CEL Is Not
- not adaptive reasoning
- not a learning engine
- not vector memory/embeddings
- not automatic runtime adaptation

## Current Scope
- strict typed experience contracts
- deterministic outcome classification
- circumstantial signal derivation
- learnable value assessment
- governed capture policy
- in-memory repository and retrieval hooks
- runtime integration in `mesh-live-runtime.ts`

