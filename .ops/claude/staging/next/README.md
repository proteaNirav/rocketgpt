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

## What"™s included
- Next.js (app router) + Tailwind
- PromptBar, DecisionBanner, Toolcard, EstimateBadge, PlanPanel
- API client using `NEXT_PUBLIC_CORE_API_BASE`
- Simple state via Zustand

## Wire to Production
- Build: `npm run build`
- Start: `npm start`
- Deploy on Vercel/Render/Netlify (set env NEXT_PUBLIC_CORE_API_BASE)
