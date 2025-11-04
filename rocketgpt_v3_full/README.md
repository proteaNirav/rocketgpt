[![Triage](https://github.com/Nirav/RocketGPT/actions/workflows/triage.yml/badge.svg)](../../actions/workflows/triage.yml)
[![Codegen](https://github.com/Nirav/RocketGPT/actions/workflows/codegen.yml/badge.svg)](../../actions/workflows/codegen.yml)
[![Review](https://github.com/Nirav/RocketGPT/actions/workflows/review.yml/badge.svg)](../../actions/workflows/review.yml)
[![Auto Merge](https://github.comNirav/RocketGPT/actions/workflows/auto-merge.yml/badge.svg)](../../actions/workflows/auto-merge.yml)


RocketGPT – The AI Generalist Orchestrator
RocketGPT is a next-generation AI orchestration platform that connects users to the right AI tools and workflows — blending the wisdom of ChatGPT, the speed of Gemini, and the adaptability of Claude.

"Awareness creates coherence — every question must honor the last answer."
Live Services
• RocketGPT Core API – https://rocketgpt-core-api.onrender.com (Healthy)
• RocketGPT Web UI – https://rocketgpt.vercel.app (Live)
Architecture Overview
RocketGPT consists of two main layers:
- Frontend (UI): Next.js 14, Tailwind CSS, Zustand
- Backend (Core API): Python (FastAPI / Flask) hosted on Render
- CI/CD: GitHub Actions + Vercel + Render
- Auth & Data: Supabase
Folder Structure
rocketgpt/
├── rocketgpt_v3_full/
│   ├── webapp/
│   │   └── next/           # Next.js UI
│   └── apps/
│       └── core-api/       # Python backend
├── qa/                     # JSON scenarios & smoke test runner
├── .github/workflows/      # CI/CD pipelines
└── README.md
Environment Variables
**.env.local (Next.js UI)**
NEXT_PUBLIC_CORE_API_BASE=https://rocketgpt-core-api.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
**Render (Core API)**
PORT=8000
ENV=production
Development Setup
git clone https://github.com/proteaNirav/rocketgpt.git
cd rocketgpt/rocketgpt_v3_full/webapp/next
npm install
npm run dev
CI/CD Pipeline
- Lint & Typecheck – ESLint + TypeScript
- QA Tests – qa/runner.mjs
- Build & Deploy – GitHub Actions → Vercel / Render
- Health Checks – /api/core/health
Features
- AI Tool Orchestration (auto-routes tasks)
- Fast / Deep / Hybrid Modes
- Session History via Supabase
- Modular Tool Loader
- Self-Testing & Auto-Fix Loop
Roadmap
1. Core AI orchestration – Completed
2. UI/UX + API Integration – Completed
3. Self-Testing & Auto-Upgrades – In Progress
4. Partner Portal & SaaS APIs – Planned

### JSON shape the pipeline expects
```json
{
  "engine": "openai",
  "goal": "Add a /api/hello endpoint returning { ok: true }, with a Jest test and README snippet.",
  "path_targets": [
    "app/api/hello/route.ts",
    "tests/api/hello.test.ts",
    "README.md"
  ],
  "acceptance": [
    "GET /api/hello returns 200 { ok: true }",
    "Jest test passes locally",
    "README documents usage"
  ]
}


---

## 3) Ensure required labels exist (self-healing)  
`/.github/labels.json`

```json
[
  { "name": "self-apply",    "color": "0e8a16", "description": "Allow triage → codegen autopath" },
  { "name": "codegen:ready", "color": "0366d6", "description": "Ready for AI Codegen" },
  { "name": "ai:unsafe-ok",  "color": "b60205", "description": "Break-glass: allow sensitive paths" },
  { "name": "ai:reviewed",   "color": "5319e7", "description": "Reviewed by AI pipeline" }
]

Maintainer
Nirav Shah
Software Product Manager & AI Generalist
Pune, India
https://protea.live
License
MIT License © 2025 Nirav Shah
Contributors & Fork Guide
RocketGPT welcomes collaboration from AI researchers, developers, designers, and product managers.

Main Contributors:
- Nirav Shah (Founder / Architect)
- ChatGPT (GPT-5) – Co-Developer / AI Architect

