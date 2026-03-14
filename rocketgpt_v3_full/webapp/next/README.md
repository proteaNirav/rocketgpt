# RocketGPT UI "” Phase 2 (Sprint 1)

Claude/Emergent-style chat shell wired to the live Core API.

## Quickstart

```bash
# Node 18+ recommended
npm i
cp .env.local.example .env.local
# set NEXT_PUBLIC_CORE_API_BASE to your live URL if different
npm run dev
# open http://localhost:3000
```

## Local Admin UI (No Docker)

Set these in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL=<your supabase url>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<your supabase anon key>`
- `SUPABASE_SERVICE_ROLE_KEY=<your service role key>`
- `ADMIN_TOKEN=<admin token>` (use `ADMIN_TOKEN`, not `ROCKETGPT_ADMIN_TOKEN`)
- `NEXT_PUBLIC_DEV_TENANT_ID=<tenant uuid>`
- `ALLOW_DEV_ADMIN_PROXY=true` (localhost only dev bypass when not signed in)

Run:

```bash
pnpm dev
pnpm exec playwright test tests/ui/admin-learning.spec.ts tests/ui/admin-cats.spec.ts
```

## What"™s included

- Next.js (app router) + Tailwind
- PromptBar, DecisionBanner, Toolcard, EstimateBadge, PlanPanel
- API client using `NEXT_PUBLIC_CORE_API_BASE`
- Simple state via Zustand

## Wire to Production

- Build: `npm run build`
- Start: `npm start`
- Deploy on Vercel/Render/Netlify (set env NEXT_PUBLIC_CORE_API_BASE)

## CATS Demo UI

- Start core-api on `http://localhost:8080` and set `NEXT_PUBLIC_CORE_API_BASE=http://localhost:8080`.
- Open `/cats/library` to load registry entries and inspect CAT definition/passport JSON.
- Use the replay action buttons in the library page to copy exact `pwsh` commands for:
  - normal demo replay
  - forced denial replay (`--deny expired`)
  - locating the latest `cats_demo_artifact.json` evidence file
- Open `/cats/generate` to create a CAT definition JSON with governance defaults (`requires_approval=true`, `passport_required=true`) and a computed SHA-256 bundle digest over the downloadable JSON bytes.
- Open `/workflows/builder` to compose an ordered multi-CAT workflow, run compatibility checks (side-effects + passport validity + type constraints), and generate:
  - command pack for replay simulation in `pwsh`
  - downloadable combined workflow simulation artifact JSON
