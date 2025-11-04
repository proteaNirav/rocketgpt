# Security Policy

## Supported Versions
We maintain `main` and `develop` under security scanning (CodeQL, npm audit, gitleaks).

## Reporting a Vulnerability
Please email **security@rocketgpt.dev** (or open a private security advisory) with:
- Steps to reproduce
- Impact assessment
- Suggested remediation

We target acknowledgment within 72 hours. Do **not** disclose publicly until patched.

## Secrets
- Keep runtime keys in **GitHub Secrets** only (e.g., `OPENAI_API_KEY`, `CLAUDE_API_KEY`).
- Never commit `.env` files. Use `.env.example` for documentation.
