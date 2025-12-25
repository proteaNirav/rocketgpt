## Go-Live Quick Notes

- **Smoke page**: `/super/smoke` — one-glance health (limits, commit, start time, service assumptions).
- **Self-Improve status**: `/super/self-improve` — shows improvement pipeline counts and items (placeholder wired for now).
- **Home dashboard** now binds **/api/limits** and **/api/health** for plan + commit basics.

Follow-up wiring:
- Replace assumed-ok service flags in `/api/health` with real checks (Supabase, Vercel, Railway endpoints).
- Swap Self-Improve placeholders with Supabase row reads or GitHub data if preferred.

