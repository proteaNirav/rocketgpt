# RocketGPT Chat Orchestrator – /api/chat

Created: 20251120_220530  
Owner: Nirav / RocketGPT Core

This document defines the **front-end contract** and **mock behaviour** for the chat orchestrator behind \/api/chat\. It is already implemented as a mock in:

- \pp/api/chat/route.ts\
- \components/layout/ModeContext.tsx\
- \components/layout/ModelSelector.tsx\
- \components/home/ChatWorkspace.tsx\

The goal is that a real orchestrator can **replace the mock implementation** without changing the UI.

---

## 1. Request Contract

**Endpoint**

- \POST /api/chat\

**Request Body (JSON)**

\\\json
{
  "message": "string, required",
  "modeProfileId": "string, optional"
}
\\\

- \message\ – User's text from the chat composer.
- \modeProfileId\ – Selected mode/profile ID coming from the **Mode selector** via \ModeContext\.
  - Example values:
    - \uto-smart-router\
    - \workflow-multi-model-orchestrator\
    - \dev-gpt-5.1\
    - \db-gemini-1.5-pro\
    - \llm-gpt-5.1\
    - \uiux-claude-3.5-sonnet\
  - If missing, default is \uto-smart-router\.

\modeProfileId\ corresponds to the options defined in \ModelSelector.tsx\, grouped under categories:

- Auto
- LLM
- Development
- DB
- BigData
- Maths
- Finance
- UI/UX
- Workflow

---

## 2. Response Shapes (Mock Implementation)

The mock implementation currently returns **three possible shapes**, distinguished by \kind\.

### 2.1 Auto Router Mode

Triggered when:

- \modeProfileId === "auto-smart-router"\

**Response**

\\\	s
type AutoResponse = {
  kind: "auto";
  reply: string;
  modeProfileId: string;  // "auto-smart-router"
  chosenModel: string;    // e.g. "db-gpt-4.1"
  reason: string;         // explanation for the model choice
  timestamp: string;      // ISO string
};
\\\

**Mock routing logic (heuristic on message text)**

- Contains \sql | database | index | query | join\  
  → \chosenModel = "db-gpt-4.1"\
- Contains \ui | ux | figma | screen | layout\  
  → \chosenModel = "uiux-claude-3.5-sonnet"\
- Contains \inance | market | stock | budget | roi\  
  → \chosenModel = "finance-gpt-4.1"\
- Contains \igdata | data lake | kafka | etl\  
  → \chosenModel = "bigdata-gemini-1.5-pro"\
- Otherwise  
  → \chosenModel = "llm-gpt-5.1"\ (default LLM)

The **real implementation** should replace this with:

- Classifier / router model
- Rules based on user profile, plan, cost limits, etc.

---

### 2.2 Workflow Orchestrator Mode

Triggered when:

- \modeProfileId\ **starts with** \"workflow-"\  
  e.g. \"workflow-multi-model-orchestrator"\

**Response**

\\\	s
type WorkflowStep = {
  stage: string;   // "Plan" | "Design" | "Implement" | "Validate" | ...
  purpose: string; // Human-readable description
  model: string;   // model profile id, e.g. "llm-gpt-5.1"
};

type WorkflowResponse = {
  kind: "workflow";
  reply: string;
  modeProfileId: string;   // e.g. "workflow-multi-model-orchestrator"
  workflowPlan: WorkflowStep[];
  timestamp: string;
};
\\\

**Current mock workflowPlan**

\\\json
[
  {
    "stage": "Plan",
    "purpose": "Understand the user request and define a multi-step approach",
    "model": "llm-gpt-5.1"
  },
  {
    "stage": "Design",
    "purpose": "Design UI/UX, data flows or architecture as needed",
    "model": "uiux-claude-3.5-sonnet"
  },
  {
    "stage": "Implement",
    "purpose": "Generate or refine code / SQL / scripts",
    "model": "dev-gpt-5.1"
  },
  {
    "stage": "Validate",
    "purpose": "Review and test the generated outputs",
    "model": "maths-gpt-4.1"
  }
]
\\\

Real implementation should:

- Possibly execute each step with different engines.
- Return both:
  - **Plan** (metadata), and
  - **Messages / results** per step.

---

### 2.3 Direct Single-Model Mode

Triggered when:

- \modeProfileId\ is **anything else**:
  - \dev-gpt-5.1\
  - \db-gemini-1.5-pro\
  - \llm-claude-3.5-sonnet\
  - etc.

**Response**

\\\	s
type DirectResponse = {
  kind: "direct";
  reply: string;
  modeProfileId: string;
  targetModel: string;   // same as modeProfileId
  timestamp: string;
};
\\\

Real implementation:

- Should call the specific model / provider mapped from \modeProfileId\.
- May still apply guardrails, logging, and routing for **cost / rate limits**.

---

## 3. Front-end Integration Points

### 3.1 Mode selection

- Component: \components/layout/ModelSelector.tsx\
- Global context: \components/layout/ModeContext.tsx\
- Mode is selected in **Topbar**, stored in \ModeContext\, and consumed by:

  - \ChatWorkspace\ (for display + API payload)
  - Potentially other views (e.g. Runbooks, Workflows, Logs)

### 3.2 Chat payload (frontend)

- Component: \components/home/ChatWorkspace.tsx\
- On **Send**, it calls:

\\\	s
const payload = {
  message: trimmed,
  modeProfileId: selectedModelId,
};

await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
\\\

This is the **only requirement** the real backend needs to conform to.

---

## 4. Roadmap Notes

1. **Dynamic Model Catalog (v2+)**

   - Replace hardcoded model list in \ModelSelector\ with:
     - \GET /api/models/modes\ (returns up to **10 models per category**).
   - Backed by a \model_profiles\ table with ranking + metadata.
   - Maintain a **larger "top 100" AI tools/models** internally; show only the top curated subset in the UI.

2. **Real Orchestrator**

   - \/api/chat\ becomes a thin gateway to:
     - Orchestrator service (Node/TS or Python) running on Railway / other.
   - Orchestrator uses:
     - \modeProfileId\,
     - user profile,
     - account plan & limits,
     - message metadata,
     - to:
       - Select engine(s),
       - Run workflows,
       - Apply guardrails.

3. **Telemetry & Logs**

   - Each call should log:
     - \modeProfileId\,
     - final model(s) used,
     - tokens, latency,
     - errors.
   - Surface summarised info in **Logs** and **Self-Improve** pages.

---

## 5. Implementation Status

- [x] UI: Mode selector with categories and real model names.
- [x] Context: \ModeContext\ in \layout.tsx\.
- [x] Front-end: ChatWorkspace sends \modeProfileId\ with message.
- [x] API: Mock orchestrator with Auto + Workflow + Direct branches.
- [ ] Backend: Real orchestrator service.
- [ ] Dynamic model registry and /api/models/modes.
- [ ] Logs integration and self-improvement loops.

This document should be kept updated whenever we change:

- Mode categories
- Model profile IDs
- Orchestrator routing logic.
