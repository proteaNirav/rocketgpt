# R-UI-1 – RocketGPT UI to Route Mapping

## 1. Overview

This document maps the new RocketGPT UI (Figma prototype) to the existing Next.js routes
in ocketgpt_v3_full/webapp/next/app.

Figma design covers 11 main pages:
1) Login
2) Dashboard
3) Sessions
4) Prompts Library
5) Runbooks
6) Self-Improve Console
7) Plans & Limits
8) Models Management
9) Logs Viewer
10) Admin Panel
11) Settings

---

## 2. Route Mapping Table

| #  | UI Page (Figma)        | Intended URL Path         | Next.js File / Folder                                      | Notes / Gaps                            |
|----|------------------------|---------------------------|------------------------------------------------------------|-----------------------------------------|
| 1  | Login                  | `/login`                  | `rocketgpt_v3_full/webapp/next/app/login/page.tsx`         |                                         | /login                  | (to be filled)                                             |                                         |
| 2  | Dashboard              | `/` (main dashboard)      | `rocketgpt_v3_full/webapp/next/app/page.tsx`               | Landing page after login                | / or /dashboard       | (to be filled)                                             |                                         |
| 3  | Sessions               | `/sessions`               | (to be created)                                             | No page.tsx yet – route to be added     | /sessions               | (to be filled)                                             |                                         |
| 4  | Prompts Library        | `/prompts`                | (to be created)                                             | No page.tsx yet – route to be added     | /prompts                | (to be filled)                                             |                                         |
| 5  | Runbooks               | /runbooks               | (to be filled)                                             |                                         |
| 6  | Self-Improve Console   | `/self-improve`           | `rocketgpt_v3_full/webapp/next/app/super/self-improve/page.tsx` | Currently mounted at `/super/self-improve`; UI may later expose `/self-improve` | /self-improve           | (to be filled)                                             |                                         |
| 7  | Plans & Limits         | `/plans` (current: `/super/limits`) | `rocketgpt_v3_full/webapp/next/app/super/limits/page.tsx`       | Existing page at `/super/limits`; UI will present as Plans & Limits | /plans or /billing    | (to be filled)                                             |                                         |
| 8  | Models Management      | /models                 | (to be filled)                                             |                                         |
| 9  | Logs Viewer            | /logs                   | (to be filled)                                             |                                         |
| 10 | Admin Panel            | `/admin`                  | `rocketgpt_v3_full/webapp/next/app/admin/suggestions/page.tsx`  | Admin suggestions sub-page; full /admin shell to be added          | /admin                  | (to be filled)                                             |                                         |
| 11 | Settings               | /settings               | (to be filled)                                             |                                         |

---

## 3. Layout & Shell Components

| Concern                | Component / File                      | Notes                                           |
|------------------------|---------------------------------------|-------------------------------------------------|
| Main app layout        | pp/layout.tsx                      | Global shell, theme provider, navbar/sidebar.   |
| Auth-only layout       | pp/(auth)/layout.tsx (if any)      | Minimal layout for login/register.              |
| Sidebar navigation     | components/layout/Sidebar.tsx       | Driven by a single nav config.                  |
| Topbar / header        | components/layout/Topbar.tsx        | User menu, plan chip, engine status.            |
| Theme switch           | components/ui/ThemeToggle.tsx       | Connected to existing theme logic.              |

---

## 4. Implementation Order (UI Pages)

1) Layout + navigation shell (sidebar + topbar)
2) Dashboard (cards + engine status)
3) Sessions
4) Prompts
5) Runbooks
6) Self-Improve
7) Plans & Limits
8) Models
9) Logs
10) Admin
11) Settings



