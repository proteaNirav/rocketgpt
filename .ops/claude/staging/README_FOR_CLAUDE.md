# RocketGPT – Auth/Session Audit (Claude)

## Issues to diagnose
- Infinite redirect: /login → email → /auth/callback → back to /login
- Cookie modification error: 'Cookies can only be modified in a Server Action or Route Handler'
- Supabase guest insert fails: RLS 42501
- Some SSR auth issues and callback loop

## What to inspect
- app/login/page.tsx
- app/auth/callback/route.ts
- app/account/**
- lib/supabase/browser.ts / server.ts
- middleware.ts
- RLS interactions through /api/guest

## Expected output
- Full rewrite of proper Next.js App Router auth
- Fix cookie handling
- Fix /auth/callback flow
- Fix RLS issues
- Provide patch suggestions file-by-file
