# RGPT-GO-LIVE-S19 — P1 Provider Capability Matrix

## Purpose
Define a single canonical compatibility matrix for AI providers (OpenAI, Claude, future providers).
This matrix is consumed by Prompt Formulator (PF) and Provider Adapters.
It establishes:
- What MUST be identical across providers
- What may vary per provider
- Provider limits and quirks
- Serialization rules
- Test expectations

---

## Non-Negotiables (Must Not Vary)
These are PF-owned invariants. Provider adapters MUST NOT change them:
- System safety rails / policy gate constraints
- Output schema contract (required sections, JSON schema, tool-call contract)
- Governance metadata (correlation id, run id, ledger hooks)
- Prohibited actions and boundaries (secrets, destructive ops, prompt injection defenses)
- Canonical prompt object fields (PF output model)

---

## PF Canonical Prompt Object (Reference)
PF outputs a structured object; adapters only serialize it.

Fields (minimum):
- systemIntent
- governance
- task
- constraints
- outputContract
- metadata

---

## Providers Covered
- OpenAI (Chat Completions / Responses API)
- Anthropic Claude (Messages API)
- Future providers (must implement adapter contract)

---

## Capability Matrix (per provider)

### Matrix Fields
- ProviderId
- APIStyle (messages / responses)
- SystemMessageSupport (Y/N + notes)
- ToolCallingSupport (Y/N + notes)
- JSONSchemaEnforcement (Y/N + notes)
- MaxContextTokens (value/unknown)
- MaxOutputTokens (value/unknown)
- TemperatureHandling (notes)
- StreamingSupport (Y/N)
- RetryPolicyRecommended (notes)
- KnownQuirks (list)
- AdapterSerializationNotes (list)

---

### OpenAI
- ProviderId: openai
- APIStyle:
- SystemMessageSupport:
- ToolCallingSupport:
- JSONSchemaEnforcement:
- MaxContextTokens:
- MaxOutputTokens:
- TemperatureHandling:
- StreamingSupport:
- RetryPolicyRecommended:
- KnownQuirks:
- AdapterSerializationNotes:

---

### Claude (Anthropic)
- ProviderId: anthropic
- APIStyle:
- SystemMessageSupport:
- ToolCallingSupport:
- JSONSchemaEnforcement:
- MaxContextTokens:
- MaxOutputTokens:
- TemperatureHandling:
- StreamingSupport:
- RetryPolicyRecommended:
- KnownQuirks:
- AdapterSerializationNotes:

---

### Future Provider Template
- ProviderId:
- APIStyle:
- SystemMessageSupport:
- ToolCallingSupport:
- JSONSchemaEnforcement:
- MaxContextTokens:
- MaxOutputTokens:
- TemperatureHandling:
- StreamingSupport:
- RetryPolicyRecommended:
- KnownQuirks:
- AdapterSerializationNotes:

---

## Provider Parity Rules (Testable)
Define what parity means:
- PF must emit the same canonical object for a given input (provider-agnostic)
- Adapter serialization must preserve:
  - intent
  - constraints
  - output contract
  - governance rails
- Only allowed differences:
  - token caps
  - provider-specific request envelope formatting
  - minor system/developer message mapping

---

## Evidence & Updates
- This doc is updated only via PR (tracked).
- PF runtime uses this as the reference for allowed adapter behavior.
- Changes require:
  - provider test updates
  - PF contract impact review

