# Mishti AI — Multimodal Capture Architecture

## Purpose
The Multimodal Capture Layer (MCL) is a core platform capability within Mishti AI. It is not a peripheral media feature. Its role is to ingest real-world information from developer, operator, and business environments and convert that information into governed platform inputs.

The layer enables Mishti AI to ingest information through:
- OCR
- screen capture
- video capture
- audio capture
- voice communication
- webcam capture
- file ingestion

By treating capture as a platform layer, Mishti AI can support consistent ingestion semantics, governance controls, storage patterns, and downstream intelligence routing across all product surfaces.

## Why This Layer Matters
Without a formal capture layer, multimodal inputs tend to be handled as one-off integrations with inconsistent processing, weak metadata, and no durable routing model. MCL avoids that fragmentation.

MCL turns Mishti AI into a unified AI platform that can combine:
- knowledge ingestion from documents, screens, recordings, and files
- developer tooling signals from code, terminals, screenshots, and debug sessions
- meeting intelligence from audio, video, transcripts, and voice channels
- conversational interaction enriched by artifacts rather than prompt text alone
- workflow capture for operational traceability and later replay
- future learning signals for memory, experience, and capability improvement

## High-Level Architecture
```text
+-----------------------------+
| User / Device Inputs        |
|-----------------------------|
| OCR | Screen | Video        |
| Audio | Voice | Webcam      |
| Files | Attachments         |
+-------------+---------------+
              |
              v
+-----------------------------+
| Multimodal Capture Layer    |
|-----------------------------|
| Capture adapters/providers  |
| Session control             |
| Consent + policy hooks      |
| Event emission              |
+-------------+---------------+
              |
              v
+-----------------------------+
| Processing Pipeline         |
|-----------------------------|
| Normalize                   |
| Extract                     |
| Segment / chunk             |
| Enrich metadata             |
| Route artifacts             |
+-------------+---------------+
              |
              v
+-----------------------------+
| Mishti AI Core              |
|-----------------------------|
| Governance                  |
| Runtime                     |
| Memory routing              |
| Knowledge indexing          |
+-------------+---------------+
              |
              v
+-----------------------------------------------+
| Yukti IDE | Yukti Chat | CATS | Memory Layers |
+-----------------------------------------------+
```

## Core Capture Services
### OCR Capture Service
| Field | Description |
|---|---|
| Purpose | Extract machine-readable text and structural hints from images, scans, screenshots, and documents. |
| Inputs | Image files, screenshots, scanned PDFs, camera snapshots, clipped screen regions. |
| Outputs | Extracted text, layout metadata, language hints, confidence scores, artifact references. |
| Primary use cases | Document ingestion, screenshot-to-context conversion, UI state capture, whiteboard capture. |
| Implementation notes | Prefer pluggable OCR providers; support language packs, page segmentation, and confidence-based retry or fallback. |

### Screen Capture Service
| Field | Description |
|---|---|
| Purpose | Capture a full screen, window, region, or event-based visual state for later extraction or analysis. |
| Inputs | Desktop display stream, application windows, terminal sessions, selective region capture. |
| Outputs | Images, time-indexed screen events, frame bundles, capture metadata. |
| Primary use cases | Debugging sessions, workflow snapshots, operator evidence capture, UI review. |
| Implementation notes | Support permission-aware capture, configurable frequency, and optional differential capture to reduce storage volume. |

### Video Capture Service
| Field | Description |
|---|---|
| Purpose | Ingest recorded or live video streams and segment them into analyzable artifacts. |
| Inputs | Uploaded video files, local device capture, meeting recordings, streaming providers. |
| Outputs | Video artifacts, frame extracts, timestamps, scene segments, derived transcripts when available. |
| Primary use cases | Meeting review, training review, process observation, demo analysis. |
| Implementation notes | Use chunked processing, keyframe extraction, and asynchronous transcription or visual analysis workers. |

### Audio Capture Service
| Field | Description |
|---|---|
| Purpose | Capture and normalize non-call audio for transcription and downstream intelligence. |
| Inputs | Recorded audio files, microphone streams, uploaded clips, extracted audio tracks. |
| Outputs | Audio artifacts, transcript candidates, speaker/timestamp metadata, signal quality markers. |
| Primary use cases | Meeting summaries, voice notes, operational reviews, support call analysis. |
| Implementation notes | Separate ingestion from transcription; maintain source fidelity while generating normalized processing copies. |

### Voice Communication Service
| Field | Description |
|---|---|
| Purpose | Handle live voice sessions as structured conversational capture events. |
| Inputs | Real-time voice streams, call integrations, duplex voice sessions, meeting channels. |
| Outputs | Session transcripts, turn structure, participant metadata, action candidates, session summaries. |
| Primary use cases | Live assistance, call intelligence, meeting participation, voice-driven workflow execution. |
| Implementation notes | Prefer streaming transport, partial transcript handling, interrupt-aware session state, and policy gates for recording consent. |

### Webcam Capture Service
| Field | Description |
|---|---|
| Purpose | Capture camera-based visual context as a governed input modality. |
| Inputs | Webcam streams, snapshot requests, controlled frame sampling. |
| Outputs | Images, frame sequences, time metadata, optional visual tags. |
| Primary use cases | Presentation capture, whiteboard capture, visual inspection, identity-preserving meeting context where allowed. |
| Implementation notes | Treat as high-sensitivity input; require explicit enablement, consent tracking, and quality profiles. |

### File Ingestion Service
| Field | Description |
|---|---|
| Purpose | Accept files into the capture pipeline with normalized metadata and routing. |
| Inputs | Documents, code bundles, transcripts, images, media files, archives, exported reports. |
| Outputs | Stored source artifact, extracted content, file metadata, downstream processing events. |
| Primary use cases | Project onboarding, evidence ingestion, design review, knowledge base intake. |
| Implementation notes | Validate file types, size thresholds, checksum identity, and anti-malware or content policy hooks as needed. |

## Recommended Technical Architecture
### Capture Adapters and Providers
Each input modality should be implemented behind a provider interface. The platform should allow multiple providers for local OS capture, browser capture, conferencing integrations, cloud processing, or tenant-specific ingestion pipelines.

### Event-Driven Processing
Capture should emit durable events such as `capture.created`, `capture.normalized`, `capture.extracted`, and `capture.routed`. Event-driven flow reduces coupling and allows specialized services to evolve independently.

### Background Workers
All heavy capture processing should run in background workers. This includes OCR, transcription, frame extraction, segmentation, embedding generation, and large file parsing.

### Raw Artifact Storage
Store original capture payloads in raw storage for replay, audit, reprocessing, and verification. This storage layer should preserve source fidelity and immutable identifiers.

### Processed Artifact Storage
Store normalized derivatives separately from raw artifacts. Examples include transcripts, OCR text, extracted frames, chunked segments, and reduced representations for fast retrieval.

### Metadata and Index Storage
Maintain structured metadata for origin, tenant, workspace, session, modality, timestamps, retention class, consent state, and processing status. This index is critical for governance, retrieval, and workflow correlation.

### Vector and Index Integration
Processed outputs should be routed to vector, lexical, and hybrid search indices where appropriate. Indexing should be governed and selective rather than automatic for every artifact.

### Local-First and Cloud-Assisted Design
The architecture should support:
- local-first capture and processing for sensitive or regulated environments
- cloud-assisted extraction or indexing where policy allows
- hybrid execution where capture remains local while intelligence processing is selectively externalized

## Platform Integration
### Yukti IDE
Yukti IDE should consume MCL for developer workflows such as screenshot context, terminal evidence capture, debugging recordings, file intake, and project artifact analysis.

### Yukti Chat
Yukti Chat should use MCL to accept multimodal conversational context including files, screenshots, recordings, and voice-derived transcripts as structured platform inputs.

### Memory Systems
MCL itself does not decide what should be remembered long term, but it must emit the metadata required for the Memory and Experience Layer to route, score, and retain artifacts appropriately.

### CATS
Capture outputs should be usable as inputs to CATS. For example, a document review CAT, transcript analysis CAT, or debugging evidence CAT should receive normalized artifact references and structured metadata rather than raw unmanaged files.

### Governance and Security Controls
Every capture event should be subject to governance hooks for consent, policy classification, redaction, retention policy selection, and workspace boundary enforcement.

### Knowledge Indexing
MCL should feed knowledge indexing through a controlled handoff. The capture layer performs ingestion and normalization; downstream intelligence layers determine semantic structure and memory routing.

## Unified Capture Pipeline
The standard pipeline should be modality-agnostic:

1. Capture Event
2. Normalization
3. Extraction
4. Processing
5. Context Building
6. Storage
7. Intelligence Routing

```text
Capture Event
  -> Normalize source format and metadata
  -> Extract text / frames / audio segments / file structure
  -> Process for quality, chunking, and timestamps
  -> Build execution and project context
  -> Store raw and processed artifacts
  -> Route to memory, indexing, governance, and CATS
```

## Storage Model
The recommended storage model has three logical layers:

| Storage Layer | Role | Typical Contents |
|---|---|---|
| Raw storage | Immutable source preservation | Original files, audio streams, raw video, screenshots, source binaries |
| Processed storage | Derived platform-ready artifacts | OCR text, transcripts, frame sets, normalized documents, chunk manifests |
| Intelligence/index storage | Retrieval and reasoning support | Metadata indices, embeddings, entity maps, routing references, summaries |

Suggested conceptual paths:
- `/captures/raw`
- `/captures/processed`
- `/captures/index`

These paths are conceptual naming patterns, not mandatory filesystem contracts. Actual implementation should follow repository and deployment conventions.

## Developer Implementation Model
The recommended implementation model is provider-based and plugin-friendly. Capture providers should be swappable without forcing changes in downstream routing or governance components.

```ts
interface CaptureProvider {
  start(): Promise<void>;
  stop(): Promise<void>;
  process(): Promise<void>;
  metadata(): Record<string, unknown>;
}
```

Implementation guidance:
- keep provider responsibilities narrow and modality-specific
- separate device integration from artifact processing
- publish normalized capture events rather than direct cross-service calls
- require stable metadata contracts for every provider

## Security, Privacy, and Governance
Multimodal capture introduces high-sensitivity data flows. The architecture must include:
- explicit consent controls for recording and capture
- redaction pipelines for images, transcripts, and files
- encryption for data in transit and at rest
- local processing preference where regulatory or tenant policy requires it
- sensitive data detection for PII, credentials, secrets, and regulated content
- retention policy awareness from the first capture event
- tenant and workspace boundary enforcement across all storage and routing layers

Capture must never bypass governance simply because the input originates from a local device.

## Performance and Scalability
The architecture should support:
- streaming for voice and time-sensitive capture
- chunking for large media and documents
- asynchronous processing for OCR, transcription, indexing, and frame extraction
- GPU acceleration where video, speech, or visual processing justifies it
- graceful degradation when premium processing components are unavailable
- configurable quality levels for latency-sensitive versus fidelity-sensitive workflows

A practical implementation should prioritize bounded memory use, resumable processing, and backpressure-aware worker design.

## Phased Rollout
### Phase 1: OCR + Screenshot + Audio
Establish the common capture framework, metadata contracts, raw and processed storage layers, and operator-facing ingestion workflows.

### Phase 2: Video + Webcam + Meeting Recording
Add frame-aware processing, recording lifecycle controls, consent management, and richer processing workers for long-form media.

### Phase 3: Real-Time Voice + Live Summarization + Intelligent Capture Triggers
Introduce streaming voice sessions, low-latency summarization, trigger-based capture activation, and deeper integration with memory and CATS.

## Strategic Conclusion
The Multimodal Capture Layer provides the operational senses of Mishti AI. It gives the platform a governed way to observe documents, interfaces, conversations, meetings, and workflows as structured inputs rather than unmanaged media. That capability is foundational for future intelligence because memory, reasoning, and action quality depend on what the platform can reliably perceive, normalize, and route.
