# Mishti AI Shared Task Scaffold

This directory provides the first implementation bridge between the Mishti AI operations architecture and executable code.

## Why important work is task-shaped

Mishti AI architecture defines important work as task-shaped so that intent, assignment, dependencies, evidence, blockers, and outcomes can move through one shared operating model. That gives Brain, Learners, Builders, CATS, PM layers, consortium functions, and OS-facing components a common contract even when their execution paths differ.

## Relationship to the hierarchy architecture

The operations documents establish a downward flow of work and an upward flow of reports, blockers, evidence, and outcomes. This scaffold translates that architectural rule into reusable TypeScript contracts:

- task contracts define what a task is
- task graph contracts define how a task can exist inside a larger dependency structure
- the in-memory registry defines a narrow local implementation for creation, assignment, reporting, and lookup
- the task-governance adapter converts hierarchy and governance actions into shared task artifacts without creating a second task model
- reporting contracts define the upward-facing report and escalation shape

## What this scaffold is not

This is not a workflow runtime, orchestration engine, scheduler, or autonomous routing system.

It intentionally does not implement:

- advanced scheduling
- dynamic optimization
- autonomous role routing
- durable persistence
- distributed execution
- graph execution logic

Future orchestration work may expose `mt` task-oriented CLI surfaces, task graph coordination, and governed runtime hooks. Those later systems should reuse these contracts rather than redefine task semantics.

## Reuse across Mishti AI layers

The contracts are designed so that future components can share one task model:

- Brain can issue and observe tasks
- Learners can report evidence and learning blockers
- Builders can receive assignments and publish outputs
- CATS can contribute task-linked evidence and execution summaries
- OS-facing layers can surface escalations and lifecycle state
- governance-facing callers can translate deterministic hierarchy actions through one adapter path

The first real hierarchy integration path now exists as a learner-to-builder work-unit handoff. It proves that learner delegation, builder reporting, and builder escalation can all move through shared task artifacts without introducing orchestration.

An adjacent PM-to-Learner planning handoff now follows the same pattern. PM, Learner, and Builder layers can use one shared task path for bounded delegation, reporting, and escalation without turning the scaffold into a planning system.

A narrow Consortium-to-Brain oversight path now exists as well. It proves that the Consortium can issue bounded oversight or review work to the Brain, the Brain can report findings, blockers, risks, and recommendations back through shared task artifacts, and the Brain can escalate constitutional or operational concerns upward without introducing orchestration or autonomous governance behavior.

A narrow Builder-to-CATS execution handoff now exists too. It proves that Builders can issue bounded execution work to CATS, CATS can report progress, result readiness, blockers, and clarification needs back through shared task artifacts, and CATS can escalate execution or policy issues upward to Builders without introducing runtime routing or orchestration.

A narrow CATS-to-OS runtime handoff now exists too. It proves that CATS can issue bounded runtime execution work to OS-facing layers, OS/runtime can report progress, result readiness, blockers, and precondition failures back through shared task artifacts, and OS/runtime can escalate execution or policy issues upward to CATS without introducing scheduling, host selection, or orchestration.

The proven handoff edges are now also centrally indexed, and a lightweight in-memory chain trace helper can link task IDs across those edges for discoverability and lineage. This remains trace support only; it does not execute task graphs or introduce orchestration.

## Current boundary

This is a minimal foundation only. It gives the repository a shared task vocabulary and a scaffold-safe in-memory registry without introducing orchestration behavior.
