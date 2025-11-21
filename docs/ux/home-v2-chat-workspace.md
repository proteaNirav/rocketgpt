# Home v2 – Chat Workspace (Claude-style)

## Goal

Transform `/` (Home) from a static dashboard into the **primary chat workspace** for RocketGPT, similar to Claude / ChatGPT / Emergent:
- One place to **start and continue conversations**
- Integrated with **sessions**, **prompts**, **runbooks**, and **models**
- Still shows **plan & status**, but as lightweight context (not the main focus)

The existing “Welcome / Instance Status / Navigate RocketGPT” view will later move to a dedicated **Console / Dashboard** route (e.g. `/console` or `/dashboard`).

---

## Layout

### 1. Global Shell (provided by app/layout.tsx)

- Left main navigation (already present: Dashboard, Sessions, Prompts, Runbooks, etc.).
- Top bar: RocketGPT title, plan, status, login/profile (already present).
- Home page will live inside this shell as the **central chat workspace**.

### 2. Home Page Columns

Home will be a 3-column layout on desktop, collapsing to stacked layout on mobile:

1. **Left pane – Recent sessions (compact)**  
   - Shows 10–15 most recent sessions, similar to current `/sessions`, but denser:
     - Title
     - Model (small tag)
     - Status (Active / Expired)
     - Last updated date
   - “New chat” at the top.
   - Clicking a session:
     - Focuses that conversation in the center pane.
     - Optionally navigates to `/sessions/[id]` in vNext.

2. **Center pane – Chat workspace (Claude-style)**  
   - Main conversation thread:
     - Messages for selected session (user + AI).
     - Support for streaming responses (existing APIs).
   - Top of center pane:
     - Session title (editable inline).
     - Model selector dropdown (e.g. `gpt-5.1`, `gpt-4.1`, `o3-mini`, etc.).
     - Small pill showing “Plan: Bronze | Status: OK”.
   - Bottom of center pane:
     - **Message composer bar** with:
       - Multiline text input.
       - “Send” button.
       - Shortcuts:
         - `+ Prompt` – opens prompt picker (from `/prompts`).
         - `+ Runbook` – attach a runbook to drive the reply.
         - `Attach` (future): files / URLs / screenshots.

3. **Right pane – Context & tools (optional on mobile)**  
   - Tabs:
     - **Context** – key data for this session (goal, constraints, tags).
     - **Prompts** – quick access to prompt templates.
     - **Runbooks** – suggested or attached runbooks.
   - Shows small instance info:
     - Health (OK / Degraded)
     - Plan summary (Bronze, rate limits)
     - Link to full Console / Dashboard.

---

## Behaviour

### New chat

- “New chat” button in:
  - Left pane (sessions list), and
  - Center pane when no session selected.
- Behaviour:
  - Calls existing backend to **create a new session** (`/api/guest` and/or `/api/sessions` as per current design).
  - Focuses the new session in the center pane.
  - Optionally sets a default system prompt based on selected model.

### Session loading

- On initial load:
  - Call `/api/sessions` to fetch recent sessions.
  - Auto-select the **most recent Active** session, if any.
  - If there are no sessions, show a friendly “Let’s start a new conversation” empty state.

### Model selection

- Model dropdown:
  - Reads the **current session model** (from `/api/sessions` or session details endpoint).
  - Allow changing model only for new messages (does not rewrite history).

### Status & plan

- Top header or center pane small pill:
  - Uses data from `/api/health` + `/api/limits`.
  - Same logic as current Home but visually compact:
    - Example: `Plan: Bronze • Status: Online`.

---

## Data sources

- **Sessions list & details**  
  - Primary: `GET /api/sessions` (already live).  
  - Future: `GET /api/sessions/{id}` for full history (if/when implemented).

- **Chat messages**  
  - Existing endpoints used by current chat implementation (to be wired in next steps).

- **Health & limits**  
  - `GET /api/health`  
  - `GET /api/limits`

---

## Implementation Plan (Phased)

1. **Phase 1 – Spec & skeleton (this document)**
   - Agree on layout and behaviours.
   - Keep existing Home in production until v2 is coded and tested.

2. **Phase 2 – Home v2 skeleton UI**
   - Implement 3-column layout with dummy data:
     - Left: static list of sessions.
     - Center: static chat thread + composer.
     - Right: static tabs for Context / Prompts / Runbooks.
   - No actual API calls yet (just UI scaffolding).

3. **Phase 3 – Wire real data**
   - Replace dummy sessions with `/api/sessions`.
   - Use `/api/health` + `/api/limits` for status pill.
   - Integrate existing send-message flow (chat API) into center pane.

4. **Phase 4 – Deep integrations**
   - Prompt picker (connected to `/prompts` page).
   - Runbook attachments (integration with `/runbooks` and self-improve).
   - Additional tools: logs, traces, etc.

---

## Notes

- `/console` remains the **admin/operator console**: dashboards, metrics, logs, runbooks, etc.
- `/sessions` remains a more detailed, table-view management of sessions.
- `/` (Home) becomes the **primary daily workspace**, mirroring Claude/ChatGPT usage patterns.
