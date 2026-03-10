# Mishti AI — Capture Intelligence Layer (CIL)

## Purpose
The Capture Intelligence Layer (CIL) converts raw multimodal capture into structured intelligence that Mishti AI can reason over, store, govern, and act upon. It exists downstream of the Multimodal Capture Layer (MCL) and is responsible for turning captured artifacts into:
- understanding
- structure
- relevance
- actionability
- experience
- learning signals

CIL is where raw capture becomes platform-grade intelligence rather than remaining a passive transcript or stored file.

## Architectural Position
```text
Capture Sources
  -> Multimodal Capture Layer
  -> Capture Processing Pipeline
  -> Capture Intelligence Layer
  -> Memory / Knowledge Graph / CATS / Yukti IDE / Governance
```

MCL is responsible for ingesting and normalizing multimodal inputs. CIL is responsible for interpreting and routing those normalized artifacts. This document should therefore be read as the downstream companion to `docs/architecture/multimodal/MISHTI-AI-MULTIMODAL-CAPTURE-ARCHITECTURE.md`.

## Core Responsibilities
CIL must answer six questions for every meaningful capture flow:
- what was captured
- what it means
- what matters
- what should be remembered
- what should trigger action
- what should improve over time

Those responsibilities imply that CIL is not a single model call. It is a governed pipeline of understanding, scoring, structuring, routing, and retention decisions.

## Internal Engines and Components
### Content Understanding Engine
| Field | Description |
|---|---|
| Purpose | Interpret the semantic content of normalized capture artifacts. |
| Inputs | OCR text, transcripts, extracted frames, normalized file content, metadata. |
| Outputs | Semantic interpretation, content classification, topic hints, entity candidates. |
| Example behavior | Recognizes that a screenshot contains a failing deployment status and the corresponding service name. |
| Implementation notes | Use modality-aware parsers and model providers; preserve confidence scores and source traceability. |

### Context Enrichment Engine
| Field | Description |
|---|---|
| Purpose | Attach project, workspace, session, repository, participant, or workflow context to captured content. |
| Inputs | Capture packet, runtime context, workspace metadata, user/session metadata. |
| Outputs | Enriched packet with project linkage, environmental context, and relevant history references. |
| Example behavior | Associates a debugging transcript with the current repository, service, and active incident. |
| Implementation notes | Context enrichment should prefer deterministic metadata sources before heuristic inference. |

### Importance and Relevance Engine
| Field | Description |
|---|---|
| Purpose | Score what matters for attention, retention, and action. |
| Inputs | Enriched packet, policy hints, historical patterns, task and risk markers. |
| Outputs | Importance scores, relevance classes, retention candidates, urgency markers. |
| Example behavior | Marks an executive decision in a meeting transcript as high-importance and high-retention. |
| Implementation notes | Keep scoring transparent and tunable; support tenant-specific weighting rules. |

### Knowledge Structuring Engine
| Field | Description |
|---|---|
| Purpose | Transform capture understanding into structured entities, relationships, and reusable knowledge objects. |
| Inputs | Understood and enriched packet content. |
| Outputs | Entities, topics, decisions, tasks, risks, graph-ready relationships, summaries. |
| Example behavior | Extracts participants, project names, design decisions, and open risks from a meeting recording. |
| Implementation notes | Maintain canonical field names and stable schema versions for downstream consumers. |

### Action Extraction Engine
| Field | Description |
|---|---|
| Purpose | Identify actionable items, workflows, and potential automation triggers. |
| Inputs | Structured packet, importance markers, policy constraints. |
| Outputs | Tasks, approvals needed, candidate CAT triggers, follow-up actions. |
| Example behavior | Converts a meeting statement into a task with owner, due context, and related project. |
| Implementation notes | Separate action detection from action execution; execution requires downstream approval and routing. |

### Experience Signal Engine
| Field | Description |
|---|---|
| Purpose | Convert captured outcomes into reusable experience records for later memory and evaluation. |
| Inputs | Structured packet, action outcomes, contextual metadata, operator feedback when available. |
| Outputs | Experience packets, outcome signals, reusable examples, confidence markers. |
| Example behavior | Stores a debugging session as an experience record with root cause and effective remediation. |
| Implementation notes | Preserve links to source evidence and resulting actions so experience remains auditable. |

### Learning Signal Engine
| Field | Description |
|---|---|
| Purpose | Identify improvement signals for memory promotion, pattern detection, and capability evolution. |
| Inputs | Experience outputs, repeated patterns, success/failure outcomes, operator validation. |
| Outputs | Promotion candidates, pattern signals, CAT usefulness metrics, learning proposals. |
| Example behavior | Detects repeated failure patterns across incidents and flags a candidate capability improvement. |
| Implementation notes | Learning signals should be advisory until promotion or governance policies authorize durable change. |

### Governance Filter
| Field | Description |
|---|---|
| Purpose | Apply policy checks before intelligence leaves CIL for memory, action, or external surfaces. |
| Inputs | Structured packet, sensitivity scores, policy metadata, consent state. |
| Outputs | Redacted packet, blocked routes, approval requirements, governance annotations. |
| Example behavior | Prevents sensitive transcript segments from being stored in broad workspace memory. |
| Implementation notes | Keep governance filters deterministic where possible and log every material decision. |

### Memory Router
| Field | Description |
|---|---|
| Purpose | Route intelligence packets to the right memory tier. |
| Inputs | Packet importance, context, retention policy, content type, governance annotations. |
| Outputs | Memory route decisions and retention instructions. |
| Example behavior | Sends a tactical note to working memory and a major architecture decision to project and long-term memory. |
| Implementation notes | Treat routing as a policy-driven service, not as ad hoc writes from each intelligence engine. |

### CAT Trigger Router
| Field | Description |
|---|---|
| Purpose | Determine whether structured capture should trigger one or more CATS. |
| Inputs | Action candidates, event type, workspace rules, policy checks. |
| Outputs | CAT invocation candidates with structured inputs. |
| Example behavior | Triggers an incident summarization CAT after a production debugging session. |
| Implementation notes | CAT routing must be gated; high-impact actions should require explicit approval paths. |

### Summary Composer
| Field | Description |
|---|---|
| Purpose | Produce concise outputs for people and systems from the structured packet. |
| Inputs | Fully processed intelligence packet. |
| Outputs | Executive summary, technical summary, action summary, memory summary. |
| Example behavior | Produces a meeting summary, list of decisions, and task table from a recorded call. |
| Implementation notes | Summary composition should be downstream of structure extraction so summaries remain evidence-backed. |

## Canonical Intelligence Packet
The normalized intelligence packet should provide a stable handoff contract for downstream systems.

```json
{
  "captureId": "cap_01HXYZ",
  "sourceType": "meeting_audio",
  "capturedAt": "<timestamp>",
  "projectContext": {
    "workspaceId": "ws_eng_platform",
    "projectId": "proj_yukti_runtime",
    "repository": "mishti-platform",
    "environment": "dev"
  },
  "rawArtifacts": [
    {
      "artifactId": "raw_audio_01",
      "kind": "audio",
      "uri": "/captures/raw/audio/raw_audio_01"
    }
  ],
  "understanding": {
    "contentType": "technical_meeting",
    "intent": "incident_review",
    "confidence": 0.93
  },
  "entities": [
    { "type": "service", "name": "runtime-gateway" },
    { "type": "person", "name": "oncall-engineer" }
  ],
  "topics": ["incident", "runtime stability", "retry policy"],
  "decisions": [
    "Route retry threshold changes through governance review."
  ],
  "tasks": [
    {
      "title": "Validate retry configuration in staging",
      "owner": "platform-team",
      "status": "proposed"
    }
  ],
  "risks": [
    "Current threshold may amplify retry storms under degraded dependencies."
  ],
  "summaries": {
    "executive": "Incident review identified retry policy as the primary amplification factor.",
    "technical": "Observed repeated retry bursts under partial dependency degradation."
  },
  "importance": {
    "score": 0.88,
    "class": "high"
  },
  "experience": {
    "category": "incident_learning",
    "shouldPromote": true
  },
  "learningSignals": [
    "Pattern suggests a reusable runtime stabilization heuristic."
  ],
  "memoryRouting": {
    "ephemeral": false,
    "working": true,
    "project": true,
    "longTerm": false,
    "experience": true,
    "governance": true
  },
  "actionRouting": {
    "catCandidates": ["runtime-review-cat"],
    "approvalRequired": true
  },
  "governance": {
    "containsPii": false,
    "containsSecrets": false,
    "retentionClass": "project-governed",
    "consentVerified": true
  }
}
```

## Memory Routing Model
CIL should route intelligence into distinct memory classes rather than a single undifferentiated store:

| Memory Tier | Role |
|---|---|
| Ephemeral memory | Short-lived context for immediate sessions and active streaming interactions |
| Working memory | Near-term active execution context and temporary operational continuity |
| Project memory | Durable project-specific knowledge, decisions, artifacts, and patterns |
| Long-term memory | Cross-project reusable knowledge and validated platform intelligence |
| Experience memory | Outcome-oriented records used for learning, evaluation, and future routing |
| Governance memory | Consent, policy, retention, and approval evidence tied to captured intelligence |

The Memory Router should treat memory placement as a governed classification decision driven by importance, sensitivity, reuse potential, and retention policy.

## Knowledge Graph Integration
CIL should update the knowledge graph with structured entities and relationships derived from capture intelligence, including:
- people and roles
- projects and workspaces
- systems and services
- decisions and rationale
- tasks and dependencies
- risks and mitigations
- repeated patterns and incidents

The graph update model should be additive, traceable, and source-linked. Every graph update should retain references back to the underlying intelligence packet and source artifacts.

## CATS Integration
CIL should integrate with CATS in four ways:
- trigger CATS when captured intelligence crosses a policy-approved threshold
- enrich CAT execution with structured entities, tasks, risks, summaries, and context
- store CAT outcomes back into experience memory as linked results
- score CAT usefulness based on action quality, acceptance, resolution value, and repeat success

This makes CATS consumers of structured capture intelligence rather than consumers of unbounded raw media.

## Governance and Safety
The CIL governance boundary should include:
- PII detection
- secrets detection
- meeting consent validation
- retention enforcement
- redaction before broad storage or sharing
- approval policies for action-triggering outcomes
- data boundary enforcement across tenants, workspaces, and regulated domains

The key rule is that CIL may increase semantic understanding, but it must not widen data access beyond the permissions and retention class attached to the source capture.

## Processing Modes
### Real-Time
For live voice, meeting assistance, or time-sensitive workflows, CIL should support partial understanding, rolling summaries, and incremental task extraction with tight latency budgets.

### Near-Real-Time
For short recordings and active work sessions, CIL should support quick post-capture processing with richer extraction and stronger context enrichment.

### Batch Intelligence
For large meeting archives, recorded sessions, and historical artifacts, CIL should support high-throughput asynchronous analysis, graph updates, and long-horizon learning extraction.

## Developer Implementation Architecture
The recommended model is a pipeline and plugin architecture so engines can be added or replaced without rewriting the full flow.

```ts
interface CaptureIntelligencePlugin {
  name: string;
  canProcess(packet: CapturePacket): boolean;
  process(packet: CapturePacket): Promise<CapturePacket>;
}
```

Implementation guidance:
- keep packet schemas stable and versioned
- let plugins operate on normalized packet contracts
- separate extraction, scoring, routing, and governance into distinct stages
- emit stage-level events for observability and replay
- support tenant-specific plugins without forking the core pipeline

## Example End-to-End Scenarios
### Meeting Recording to Summary, Action Items, and MOM
A recorded meeting enters MCL, is transcribed and normalized, then CIL extracts participants, decisions, tasks, and risks. Summary Composer produces executive and technical summaries. Memory Router stores outcomes in project memory and governance memory. Approved CAT triggers can create follow-up workflows.

### Developer Debugging Session to Root-Cause Experience Packet
A debugging session generates screenshots, terminal transcripts, and operator notes. CIL links the artifacts to the repository and active service, identifies failure patterns, extracts probable root cause, and stores the result as an experience packet that can improve future routing and remediation guidance.

### Sales or Consulting Conversation to Structured Opportunity Notes
A recorded customer conversation is processed into structured themes, opportunity signals, obligations, risks, and follow-up tasks. CIL routes the resulting packet into project or account memory and can trigger approved action workflows for next steps.

## Rollout Plan
### CIL-1: Basic Understanding, Summarization, and Task Extraction
Establish the canonical intelligence packet, summary generation, entity extraction, and task identification for text, OCR, and audio-derived content.

### CIL-2: Importance, Decision, Risk, and Experience Extraction
Add stronger relevance scoring, decision and risk extraction, richer memory routing, and experience packet generation.

### CIL-3: Learning Signals, CAT Routing, Pattern Mining, and Governance Hardening
Introduce advanced learning signal generation, CAT usefulness scoring, pattern discovery across captures, and stricter governance routing and approval controls.

## Strategic Conclusion
The Multimodal Capture Layer provides the senses of Mishti AI. The Capture Intelligence Layer provides understanding and judgment over what those senses observe. Memory, CATS, Yukti IDE, and other product surfaces provide continuity and action. Together, these layers turn captured artifacts into governed operational intelligence rather than isolated media records.
