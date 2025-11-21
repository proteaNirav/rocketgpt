# RocketGPT Model Modes – Dynamic Selector (Roadmap)

Owner: Nirav  
Created: 20251120_215052

## Current (v1)

- Model / Mode selector lives in **Topbar** (ModelSelector component).
- Modes are grouped by **category**:
  - Auto
  - LLM
  - Development
  - DB
  - BigData
  - Maths
  - Finance
  - UI/UX
  - Workflow
- Each category shows a **static set of models**, e.g.:
  - GPT 5.1, GPT 4.1, Claude 3.5 Sonnet, Gemini 1.5 Pro/Flash, etc.
- Default mode is **Auto (RocketGPT decides)**.
- Workflow mode is a placeholder for **multi-model orchestrator (demo)**.

## Target (v2+) – Dynamic model catalog

### High-level requirement

> RocketGPT should automatically maintain the list of models and modes based on **current market trends and a larger “top 100 AI tools / models” pool**, but **only show up to 10 models per category** in the UI.

### Proposed design

1. **Model Registry (DB)**  
   - Table: model_profiles (or similar)  
   - Columns (example):
     - id (PK, internal identifier)
     - 
ame (e.g. "GPT 5.1", "Claude 3.5 Sonnet", "Gemini 1.5 Pro")
     - provider (openai / anthropic / google / local / other)
     - category (auto / llm / development / db / bigdata / maths / finance / uiux / workflow)
     - 	ier (free / paid / internal / experimental)
     - score (popularity / quality / internal ranking)
     - is_featured (bool)
     - enabled (bool)
     - metadata (JSON – limits, pricing hints, etc.)

2. **Sync / Curation Process**
   - Background job or manual script to:
     - Pull or curate a **“top 100 AI tools / models”** list.
     - Map each tool to one or more **categories**.
     - Update model_profiles with:
       - New models,
       - Updated scores / metadata,
       - Disabled / deprecated models.
   - Business rules:
     - RocketGPT decides a **score or ranking** per model.
     - Admin overrides allowed (e.g. force-feature certain models).

3. **API for UI**
   - Endpoint suggestion: GET /api/models/modes
   - Behaviour:
     - For each category, return **up to 10 models**, sorted by:
       - is_featured DESC,
       - score DESC,
       - 
ame ASC.
     - Include:
       - id, 
ame, category, provider, description, 	ier, etc.
   - The current static MODEL_OPTIONS in ModelSelector becomes:
     - A **fallback** if API fails,
     - Or a seed list to bootstrap the DB.

4. **UI behaviour (ModelSelector)**
   - On load:
     - Call /api/models/modes.
     - If success:
       - Group by category,
       - Show **up to 10 models per category**.
     - If failure:
       - Fall back to static MODEL_OPTIONS.
   - Default selection:
     - Auto (RocketGPT decides) if available,
     - Else first available LLM profile.

5. **Auto & Workflow semantics**
   - **Auto (RocketGPT decides)**:
     - Frontend sends profileId = "auto-smart-router" (for example).
     - Backend router uses:
       - User profile (plan, limits, preferences),
       - Request type (chat vs. code vs. math vs. finance),
       - Internal scoring,
       - To select actual engine.
   - **Workflow (Multi-model)**:
     - Frontend sends profileId = "workflow-multi-model-orchestrator".
     - Backend:
       - Runs a **predefined or user-defined workflow** that may call:
         - One model for planning,
         - Another for code,
         - Another for testing / review,
         - etc.

## Notes

- v1 (static list) is **already implemented** in the UI and working.
- This document is a **reminder / contract** that in future:
  - RocketGPT will **automatically update the model list** based on market and internal ranking.
  - UI will always show **at most 10 models per category** for simplicity, even if DB holds 100+.
- Implementation of this roadmap item should also integrate with:
  - Pricing / limits per plan,
  - Usage analytics,
  - Feature flags (e.g. enabling Workflow only for specific user groups).
