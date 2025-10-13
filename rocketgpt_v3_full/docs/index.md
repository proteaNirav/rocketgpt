# RocketGPT — AI Orchestrator

**Base URLs**
- UI: https://app.rocketgpt.dev
- API: https://api.rocketgpt.dev
- Docs: https://docs.rocketgpt.dev

## Quickstart
```bash
curl -X POST https://api.rocketgpt.dev/orchestrate   -H "Content-Type: application/json"   -d '{"task":"Draft a GTM plan for a fintech product","persona":"professional","mode":"/organize","org_prefs":["ChatGPT","Claude"]}'
```

## SDK
```ts
import { RocketGPT } from '@rocketgpt/sdk';
const client = new RocketGPT('https://api.rocketgpt.dev');
const res = await client.orchestrate({ task: 'Demo', persona: 'professional', mode: '/fast', org_prefs: ['ChatGPT'] });
```
