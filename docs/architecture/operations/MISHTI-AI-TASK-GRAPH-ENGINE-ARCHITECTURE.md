# Mishti AI - Task Graph Engine Architecture

## 1. Purpose
This document defines the task graph engine architecture for Mishti AI.

The task graph engine exists to coordinate complex multi-step work across layers without collapsing large programs into unmanageable single tasks.

## 2. Scope
This architecture covers:
- dependency graphing
- decomposition
- routing
- retries
- parallel work
- escalation
- completion aggregation

It does not yet define a production scheduler or optimization engine.

## 3. Why a Task Graph Engine Is Needed
Single tasks are insufficient for large platform work. Complex work often requires:
- decomposition into multiple steps
- multiple Builders
- multiple review layers
- sequential and parallel dependencies
- escalation and reassignment handling

## 4. Core Concepts
- task node
- dependency edge
- parent task
- child work unit
- graph state
- graph completion
- blocked node
- retry path
- escalation path

## 5. Graph Lifecycle
- graph_created
- decomposed
- assigned
- executed
- reviewed
- partially_completed
- completed
- failed
- escalated
- archived

## 6. Decomposition Model
PMs, Senior Engineers, and Learners may decompose larger work into task graphs.

Builders generally execute leaf work units, not high-level parent tasks.

This preserves architectural control while still supporting distributed execution.

## 7. Parallel Execution Model
Multiple builders may work on sibling nodes when dependencies permit.

Parallel execution should be constrained by:
- dependency satisfaction
- pool availability
- trust and permission fit
- review requirements

## 8. Retry / Recovery Model
When a node fails, the engine may support:
- retrying the same node
- reassigning the node
- re-decomposing the parent task
- escalating to a higher layer

Recovery behavior must remain auditable and bounded.

## 9. Reporting and Aggregation
Graph-level status must roll up from node-level execution.

Examples:
- parent completion requires child completion or approved closure
- parent blocked state may derive from blocked critical nodes
- review outcomes may gate graph completion

## 10. Cross-Layer Routing
Task graphs may route across layers such as:
- Brain -> Learners
- Learners -> Builders
- Builders -> CATS
- CATS -> OS

Upward reporting follows the reverse path with aggregation and escalation.

## 11. Governance Integration
Task graph execution must remain:
- constitution-aware
- auditable
- compatible with existing governance controls
- compatible with builder registration and wrapper boundaries

The task graph engine coordinates work. It does not replace the existing execution ledger, runtime guard, dispatch guard, or constitutional controls.

## 12. Initial Minimal Engine Model
A first version should support:
- graph definition with nodes and dependencies
- parent and child relationships
- blocked and escalated states
- simple parallel sibling execution eligibility
- deterministic status aggregation
- linkage to task identity and evidence

It should not overengineer optimization or prediction in the initial version.

## 13. Future Extensions
- dynamic graph optimization
- predictive routing
- resource-aware scheduling
- multi-graph coordination

## 14. Related Documents
- `docs/architecture/operations/MISHTI-AI-UNIVERSAL-TASK-GOVERNANCE-ARCHITECTURE.md`
- `docs/architecture/operations/MISHTI-AI-BUILDER-WORKFORCE-ARCHITECTURE.md`
- `docs/architecture/operations/MISHTI-AI-HIERARCHICAL-ENGINEERING-OPERATIONS-ARCHITECTURE.md`

## 15. Conclusion
The task graph engine gives Mishti AI a disciplined way to manage complex, multi-step, multi-layer work without chaos. It remains an additive orchestration layer over the existing governance and execution backbone.
