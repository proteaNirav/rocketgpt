# R-UI-1 – Layout Shell Plan (Sidebar + Topbar)

## 1. Objective

Define the application shell layout for RocketGPT based on the new Figma UI:
- Persistent sidebar on the left for main navigation
- Topbar with title, breadcrumb, engine status, plan info, and user menu
- Central content area that renders the active page
- Must integrate cleanly into existing app/layout.tsx without breaking providers

## 2. Target Structure (Conceptual)

Structure to follow (text-only to avoid PowerShell breaks):
- html > body > ThemeProvider > AppProviders
- Topbar at top
- Main flex row with Sidebar (left) and Page content (right)

## 3. Sidebar Navigation – Target Items

Dashboard (/)
Sessions (/sessions)
Prompts (/prompts)
Runbooks (/runbooks)
Self-Improve (/self-improve)
Plans & Limits (/plans)
Models (/models)
Logs (/logs)
Admin (/admin)
Settings (/settings)

## 4. Topbar – Elements
Left: Page title, Breadcrumb
Right: Engine status, Plan badge, Theme toggle, User menu

## 5. Implementation Strategy
- Do not remove providers in app/layout.tsx
- Introduce components: Sidebar.tsx, Topbar.tsx
- Wrap children with Topbar + Sidebar + main content
- Style using shadcn/ui and Figma specs

## 6. Next Steps
1. Create empty Sidebar.tsx
2. Create empty Topbar.tsx
3. Embed them in app/layout.tsx
4. Add nav items
5. Apply styling

R-UI-1 Step 3D ready.
