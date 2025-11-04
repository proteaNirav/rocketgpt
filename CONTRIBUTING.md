# Contributing to RocketGPT

## Branches
- `main`: production, protected
- `develop`: integration, protected
- Feature branches: `feat/<slug>`
- AI branches: `ai/autogen/<slug>`

## PR Rules
- Use Conventional Commit **PR titles** (e.g., `feat: add tool runner`).
- All checks must pass; at least 1 human approval on `develop`, 2 on `main`.

## Local Dev
```bash
npm ci
npm run dev
npm test

## Security
Read `SECURITY.md`. No secrets in code or logs.
