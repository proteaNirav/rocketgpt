#!/usr/bin/env node
/**
 * RocketGPT GitHub Actions runner
 * Supports: plan | code | test | doc | guard | review
 *
 * - Classic steps (plan/code/test/doc/guard) can be no-ops if you already run them elsewhere.
 * - 'review' reads review_input.json and MUST emit review_result.json to keep the PR-review workflow green.
 */
const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error(msg);
  process.exit(2);
}
async function readJson(p, def = {}) {
  try { return JSON.parse(await fs.promises.readFile(p, 'utf8')); }
  catch { return def; }
}
async function writeJson(p, obj) {
  await fs.promises.mkdir(path.dirname(p), { recursive: true });
  await fs.promises.writeFile(p, JSON.stringify(obj, null, 2), 'utf8');
}

async function ensureArtifact(name, content, spec) {
  const out = path.join('generated', `${name}.json`);
  await writeJson(out, { ok: true, step: name, content, spec });
  return out;
}

(async () => {
  const step = (process.argv[2] || '').trim();             // plan|code|test|doc|guard|review
  const arg  = (process.argv[3] || '').trim();             // spec.json OR review_input.json
  const allowed = new Set(['plan','code','test','doc','guard','review']);
  if (!allowed.has(step)) fail('Unknown step. Use plan|code|test|doc|guard|review');

  let spec = {};
  if (arg && fs.existsSync(arg) && step !== 'review') {
    spec = await readJson(arg, {});
  }

  switch (step) {
    case 'plan':  await ensureArtifact('plan_result',  'noop', spec); break;
    case 'code':  await ensureArtifact('code_result',  'noop', spec); break;
    case 'test':  await ensureArtifact('test_result',  'noop', spec); break;
    case 'doc':   await ensureArtifact('doc_result',   'noop', spec); break;
    case 'guard': await ensureArtifact('guard_result', 'noop', spec); break;

    case 'review': {
      const inputPath  = arg || 'review_input.json';
      const outputPath = 'review_result.json';
      const envMin     = Number(process.env.MIN_ACCEPT_SCORE || 75);

      const input = await readJson(inputPath, {});
      const score = Number(input.score ?? 0);
      const provider = String(input.provider_hint || process.env.PROVIDER || 'unknown');

      // Simple policy: approve if score >= threshold, else block
      const decision = score >= envMin ? 'approve' : 'block';

      const summaryLines = [];
      summaryLines.push(`**Automated Review** (provider: \`${provider}\`)`);
      summaryLines.push(`- Score: **${isNaN(score) ? 'N/A' : score}**`);
      summaryLines.push(`- Threshold: **${envMin}**`);
      summaryLines.push(`- Decision: **${decision.toUpperCase()}**`);

      const result = {
        decision,                                 // "approve" | "comment" | "block"
        summary_md: summaryLines.join('\n'),
        nitpicks_md: input.summary || input.notes || '',   // pass-through if provided
        meta: {
          runner: 'rocketgpt-agents/github_actions.js',
          mode: 'review',
          timestamp: new Date().toISOString(),
          pr: input.pr || null,
          repo: input.repo || null
        }
      };

      await writeJson(outputPath, result);
      console.log(`Wrote ${outputPath}`);
      break;
    }
  }

  process.exit(0);
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
