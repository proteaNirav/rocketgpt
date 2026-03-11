# Mishti AI Platform Architecture

## Architecture Principles
- Strong governance boundaries between intent, execution, and learning
- Layered extensibility so capabilities can evolve without destabilizing the platform
- Provider abstraction across models, tools, storage, and delivery channels
- Observability, replayability, and auditability for every meaningful execution
- Minimal trust with explicit verification at dispatch, execution, and learning boundaries

## 1. Platform Vision
Mishti AI is a governed intelligence platform for running, supervising, and improving AI-driven capabilities across multiple product surfaces. It is designed to solve a common systems problem: most AI applications can answer prompts, but they do not consistently execute complex work with policy control, traceability, memory continuity, and structured evolution.

The platform separates user interaction from runtime execution, learning, and governance. That separation allows Mishti AI to support conversational work, developer workflows, research tasks, and operator automation without collapsing those concerns into a single unsafe application layer.

At a high level, Mishti AI provides:
- a shared execution substrate for capabilities and tools
- a governed runtime for dispatch and policy enforcement
- a memory and learning system for durable intelligence growth
- product surfaces that expose the system through domain-specific interfaces

## 2. Core Platform Layers
Mishti AI is organized as cooperating platform layers rather than a single monolithic application.

### Mishti AI Fabric
The Mishti AI Fabric is the platform core. It provides the structural backbone for service discovery, runtime coordination, storage integration, capability packaging, execution routing, and deployment topology. The fabric is responsible for making platform services available consistently across local development, controlled servers, and future distributed execution nodes.

### Cognitive Runtime
The Cognitive Runtime is the active execution engine. It receives approved work, resolves the required capabilities, allocates execution paths, applies runtime guards, and supervises tool/model interactions. The runtime is where intent becomes controlled action.

### Governance Layer
The Governance Layer defines the platform's operational boundaries. It enforces policy decisions, approval requirements, execution traceability, and post-execution accountability. Governance is not treated as an afterthought around the runtime; it is a first-class architectural plane that wraps execution and learning.

### Research Layer
The Research Layer expands the system's grounded knowledge. It is responsible for sourcing, evaluating, structuring, and normalizing external or internal knowledge inputs before they become durable platform knowledge. This layer should be read alongside the related research and architecture notes under the broader `docs/architecture/` and `docs/modules/research/` trees.

### Analyst Layer
The Analyst Layer turns structured knowledge, execution evidence, and runtime outcomes into decision-support artifacts. It provides synthesis, recommendation generation, comparative reasoning, and operator-facing analysis while remaining downstream from governance and evidence-producing systems.

### Memory & Experience Layer
The Memory & Experience Layer stores what the system has observed, executed, learned, and validated. It tracks experiences, promotes durable knowledge, supports recall, and feeds later dispatch and reasoning. This layer is the basis for continuity across sessions and capability evolution.

### CATS Platform
The CATS Platform defines and hosts executable capabilities. A CATS unit encapsulates capability metadata, lifecycle rules, execution constraints, tool bindings, and verification hooks. CATS is the structured mechanism by which new behaviors enter the runtime.

### Yukti Chat
Yukti Chat is the conversational product surface. It is responsible for collecting user intent, maintaining interaction context, and handing approved work into platform control and execution planes. It should remain a client of the platform, not a replacement for the platform core.

### Yukti IDE
Yukti IDE is the developer-oriented product surface. It exposes the platform through engineering workflows such as code assistance, guided execution, diagnostics, operational tooling, and controlled automation. It relies on the same runtime and governance backbone as Yukti Chat, but with developer-specific workflows and controls.

## 3. System Topology
The platform topology can be understood as a set of interacting planes.

### User Interfaces
User Interfaces include Yukti Chat, Yukti IDE, operator tooling, and future external integrations. These surfaces gather intent, display outputs, and expose status, but they do not directly bypass the governed execution path.

### Control Plane
The Control Plane interprets requests, resolves workflows, selects capabilities, and coordinates governance checks before execution begins. It is responsible for dispatch decisions, orchestration metadata, and route selection across available platform services.

### Execution Plane
The Execution Plane contains the Cognitive Runtime, CATS execution handlers, model/tool adapters, and execution supervision components. It performs the actual work requested by the control plane under active runtime constraints.

### Learning Plane
The Learning Plane captures execution outcomes, structured feedback, policy-relevant signals, memory promotion events, and candidate improvements. It is decoupled from immediate execution so learning can be evaluated and promoted without destabilizing current runs.

### Storage Layers
Storage is stratified rather than flat. The platform may use separate stores for:
- execution ledgers and audit records
- memory and experience records
- knowledge libraries and research artifacts
- capability definitions and metadata
- operational telemetry and replay evidence

This separation supports retention policy differences, performance isolation, and clearer governance boundaries.

## 4. Cognitive Mesh
The Cognitive Mesh is the platform's internal intelligence communication fabric. It allows capabilities, services, and reasoning components to exchange structured work units rather than ad hoc strings or implicit side effects.

The primary exchange object is the knowledge packet. A knowledge packet carries the information needed for a bounded handoff, such as:
- intent or task context
- evidence and relevant memory
- policy-relevant metadata
- routing hints
- verification or provenance markers

Within the mesh, components communicate by passing these packets through governed channels. That architecture improves traceability because each handoff can be recorded, inspected, validated, and replayed. It also reduces coupling because packet contracts are explicit. Related material is also described in the cognitive mesh architecture series under `docs/architecture/cognitive-mesh/`.

## 5. Capability Execution Model
Capabilities are packaged as CATS units and executed inside the Cognitive Runtime.

The execution model is:
1. a request enters the control plane
2. dispatch logic identifies the appropriate capability or capability chain
3. governance checks determine whether execution is allowed
4. the runtime initializes the execution context and tool/model bindings
5. the capability runs with supervision, checkpoints, and ledger recording
6. outputs, evidence, and experience signals are emitted to downstream systems

This model keeps capability definitions separate from core routing and governance logic. As a result, new capabilities can be introduced in a controlled way without rewriting platform fundamentals.

## 6. Governance & Safety
Governance in Mishti AI is implemented as concrete runtime architecture.

### Runtime Guard
Runtime Guard supervises active execution. It is responsible for checking execution boundaries, allowable tool use, bounded context propagation, and runtime health constraints while work is in progress.

### Dispatch Guard
Dispatch Guard operates before execution begins. It validates whether a request, workflow, or capability route is permissible given policy, operator controls, and execution context.

### Execution Ledger
The Execution Ledger records what happened, when it happened, why it was allowed, and which components participated. It is the backbone for traceability, post-run analysis, replay, and compliance-oriented inspection.

### Policy Gates
Policy Gates are explicit decision points that determine whether execution, promotion, or side effects can proceed. They may appear before dispatch, during execution, before persistence, or during learning and promotion flows.

The governing principle is that safety is enforced through hooks around dispatch, execution, persistence, and learning rather than through trust in any single model response.

## 7. Memory & Learning System
The Memory & Learning System is responsible for durable intelligence growth without uncontrolled mutation.

### Experience Recording
Each significant execution can emit a structured experience record. That record may include context, actions taken, outcomes, verification signals, user or operator feedback, and policy-relevant observations.

### Memory Promotion
Not every experience becomes durable knowledge. Promotion logic determines which experiences are retained as operational memory, reusable knowledge, or capability-improving signals. Promotion is therefore a governed transition, not an automatic write-through.

### Knowledge Libraries
Knowledge libraries organize retained material into structured collections that can be retrieved, reasoned over, and reused across later executions. These libraries can include curated research, promoted runtime knowledge, operator-authored guidance, and validated platform rules.

### Long-Term Intelligence Growth
Long-term growth happens when repeated experience, validated research, and successful capability outcomes produce more reliable dispatch, better recommendations, stronger recall, and safer automation. The platform is designed so that learning accumulates through evidence-backed promotion instead of hidden model drift.

## 8. Evolution Architecture
Mishti AI evolves through a controlled combination of learning, capability expansion, and policy-constrained adaptation.

There are three primary evolution paths:
- capability evolution through new or revised CATS units
- knowledge evolution through promoted research and memory
- runtime evolution through improvements to routing, supervision, and governance hooks

The architecture assumes evolution is continuous but not autonomous by default. Changes must remain attributable, governable, and reversible where practical. This is why the platform separates experimentation, execution, and promotion.

## 9. CLI & Developer Interaction
Developers and operators interact with the platform through controlled interfaces rather than direct runtime mutation.

### mt CLI
The `mt` CLI is the preferred command prefix for platform-facing operator interaction. It provides a consistent entry point for runtime status, health inspection, and supported operational workflows while preserving compatibility with legacy `rgpt` paths where required.

### Operator Scripts
Operator scripts provide governed entry points for health checks, workflow diagnostics, deployment helpers, and runtime inspection. These scripts should remain thin wrappers around platform APIs, runtime services, and policy-aware workflows.

### Development Workflows
Development workflows include local runtime verification, architecture-oriented documentation updates, governance-aware CI surfaces, and capability evolution loops. The developer interaction model is intended to keep operational visibility high while preventing accidental bypass of governance or execution controls.

## 10. Future Expansion
The current architecture is intentionally structured to support future growth without forcing an architectural rewrite.

### Distributed AI Networks
The platform can evolve toward distributed AI networks by extending the Mishti AI Fabric to coordinate multiple governed execution nodes with explicit routing, policy propagation, and shared ledger semantics.

### Autonomous Agents
Autonomous or semi-autonomous agents can be supported by treating them as governed runtime participants backed by the same dispatch, ledger, and policy mechanisms as other capabilities rather than as privileged exceptions.

### Operating-System Level AI Fabric
At the far end of the roadmap, the platform can evolve into an operating-system level AI fabric in which local tools, system events, developer workflows, and multi-agent execution are coordinated through the same fabric, runtime, and governance architecture.

That future depends on preserving the current design discipline: clear planes, governed execution, explicit knowledge movement, and durable evidence for every meaningful change in platform behavior.
