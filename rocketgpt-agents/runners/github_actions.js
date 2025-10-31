#!/usr/bin/env node
/**
 * RocketGPT GitHub Actions runner
 *
 * Supported subcommands:
 *   - plan | code | test | doc | guard | review
 *
 * Behavior:
 *   • For plan/code/test/doc/guard: writes a small JSON artifact so CI stays green (replace with real logic anytime).
 *   • For review: reads review_input.json and MUST emit review_result.json with a decision.
 *
 * Env knobs:
 *   - MIN_ACCEPT_SCORE (default 75)  → threshold for "approve" vs "block"
 *   - MODEL_PROVIDER / provider_hint → surfaced in the review metadata
 */

const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error(msg);
  process.exit(2);
}

async function readJson(p, fallback = {}) {
  try { return JSON.parse(await fs.promises.readFile(p, 'utf8')); }
  catch { return fallback; }
}

async function writeJson(p, obj) {
  await fs.promises.mkdir(path.dirname(p), { recursive: true });
  await fs.promises.writeFile(p, JSON.stringify(obj, null, 2), 'utf8');
}

async function ensureArtifact(name, content, spec) {
  const out = path.join('generated', `${name}.json`);
  await writeJson(out, { ok: true, step: name, content, spec });
  console.log(`Wrote ${out}`);
  return out;
}

(async () => {
  const step = (process.argv[2] || '').trim();     // plan|code|test|doc|guard|review
  const arg  = (process.argv[3] || '').trim();     // spec.json OR review_input.json
  const allowed = new Set(['plan','code','test','doc','guard','review']);
  if (!allowed.has(step)) fail('Unknown step. Use plan|code|test|doc|guard|review');

  // Load spec only for the classic steps
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
      // Inputs / outputs
      const inputPath  = arg || 'review_input.json';
      const outputPath = 'review_result.json';

      const envMin = Number(process.env.MIN_ACCEPT_SCORE || 75);
      const input  = await readJson(inputPath, {});
      const score  = Number(input.score ?? 0);

      // Choose provider for logging/metadata only
      const provider = String(
        input.provider_hint ||
        process.env.MODEL_PROVIDER ||
        process.env.PROVIDER ||
        'unknown'
      );

      // Extremely simple policy: approve if score >= threshold, else block.
      // You can enrich this later (diff size, file types, lint results, etc.).
      const decision = (isFinite(score) && score >= envMin) ? 'approve' : 'block';

      const summary = [
        `**Automated Review** (provider: \`${provider}\`)`,
        `- Score: **${isFinite(score) ? score : 'N/A'}**`,
        `- Threshold: **${envMin}**`,
        `- Decision: **${decision.toUpperCase()}**`,
        input.summary ? `\n**Changes:**\n${input.summary}` : ''
      ].filter(Boolean).join('\n');

      const result = {
        decision,                 // "approve" | "comment" | "block"
        summary_md: summary,      // Markdown body for PR review
        nitpicks_md: input.nitpicks_md || '', // optional bullets if you provide any
        meta: {
          runner: 'rocketgpt-agents/github_actions.js',
          mode: 'review',
          timestamp: new Date().toISOString(),
          provider,
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
