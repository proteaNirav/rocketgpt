#!/usr/bin/env node
/**
 * RocketGPT GitHub Actions runner
 *
 * Supported subcommands:
 *   - plan | code | test | doc | guard | review
 *
 * REVIEW behavior:
 *   • If ANTHROPIC_API_KEY is present (or provider_hint === 'anthropic') → call Claude (claude-3-5-sonnet-latest)
 *     and expect STRICT JSON: { decision, summary_md, nitpicks_md }.
 *   • Else → fall back to a simple score threshold policy.
 *
 * Env knobs:
 *   - MIN_ACCEPT_SCORE (default 75)
 *   - MODEL_PROVIDER / provider_hint
 *   - CLAUDE_MODEL (default "claude-3-5-sonnet-latest")
 */

const fs = require('fs');
const path = require('path');

// -------------------------- utils -------------------------------------------
function fail(msg) { console.error(msg); process.exit(2); }

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

// -------------------- Claude helper (Anthropic) ------------------------------
async function reviewWithClaude(input) {
  const fetchFn = global.fetch;
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey || !fetchFn) return null;

  const model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest';

  const summary = String(input.summary || '').slice(0, 4000);
  const files = Array.isArray(input.files) ? input.files : [];
  const patches = files
    .slice(0, 20)
    .map(f => {
      const patch = (f.patch || '').slice(0, 4000);
      return `• ${f.filename} (+${f.additions}/-${f.deletions})\n${patch}`;
    })
    .join('\n\n')
    .slice(0, 20000);

  const systemPrompt =
    'You are a meticulous senior reviewer for a GitHub Pull Request. ' +
    'Output STRICT JSON ONLY with keys: decision, summary_md, nitpicks_md. ' +
    'Valid decisions: "approve", "comment", "block". Keep summary short.';

  const userPrompt = [
    `Repository: ${input.repo || 'unknown'}`,
    `PR: #${input?.pr?.number || 'unknown'} — ${input?.pr?.title || ''}`,
    '',
    'Changed files summary:',
    summary || '(none)',
    '',
    'Selected patches:',
    patches || '(omitted)',
    '',
    'Scoring hint:',
    `min_accept_score: ${input.min_accept_score ?? 75}, score: ${input.score ?? 'n/a'}`,
    '',
    'Respond with JSON only.'
  ].join('\n');

  const body = {
    model,
    max_tokens: 1200,
    temperature: 0.2,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    response_format: { type: 'json_object' }
  };

  // Strip OpenAI-only fields for Anthropic Messages API
  // Anthropic rejects unknown fields like `response_format`.
  if (body && typeof body === 'object') {
    delete body.response_format;
    delete body.function_call;
    delete body.functions;
    delete body.tool_choice;
  }
  const resp = await fetchFn('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    console.error(`Claude API error: ${resp.status} ${resp.statusText}`);
    const text = await resp.text().catch(()=> '');
    console.error(text);
    return null;
  }

  const data = await resp.json();
  const txt = data?.content?.[0]?.text || '';
  let parsed = null;
  try { parsed = JSON.parse(txt); }
  catch {
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
  }
  if (!parsed || !parsed.decision) return null;

  const decision = String(parsed.decision || '').toLowerCase();
  if (!['approve','comment','block'].includes(decision)) return null;

  return {
    decision,
    summary_md: String(parsed.summary_md || '').slice(0, 8000),
    nitpicks_md: String(parsed.nitpicks_md || '').slice(0, 8000)
  };
}

// ------------------------------ main -----------------------------------------
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
      const inputPath  = arg || 'review_input.json';
      const outputPath = 'review_result.json';

      const envMin = Number(process.env.MIN_ACCEPT_SCORE || 75);
      const input  = await readJson(inputPath, {});
      const providerHint = String(
        input.provider_hint || process.env.MODEL_PROVIDER || process.env.PROVIDER || 'unknown'
      );

      // 1) Try Claude if requested/available
      let result = null;
      if ((providerHint === 'anthropic' || process.env.ANTHROPIC_API_KEY) && global.fetch) {
        try { result = await reviewWithClaude(input); }
        catch (e) { console.error('Claude review failed:', e?.stack || String(e)); }
      }

      // 2) Fallback: score threshold policy
      if (!result) {
        const score  = Number(input.score ?? 0);
        const decision = (isFinite(score) && score >= envMin) ? 'approve' : 'block';
        const summary = [
          `**Automated Review (fallback)**`,
          `- Score: **${isFinite(score) ? score : 'N/A'}**`,
          `- Threshold: **${envMin}**`,
          `- Decision: **${decision.toUpperCase()}**`,
          input.summary ? `\n**Changes:**\n${input.summary}` : ''
        ].filter(Boolean).join('\n');
        result = { decision, summary_md: summary, nitpicks_md: '' };
      }

      const out = {
        decision: result.decision,
        summary_md: result.summary_md,
        nitpicks_md: result.nitpicks_md || '',
        meta: {
          runner: 'rocketgpt-agents/github_actions.js',
          mode: 'review',
          timestamp: new Date().toISOString(),
          provider: providerHint,
          pr: input.pr || null,
          repo: input.repo || null
        }
      };

      await writeJson(outputPath, out);
      console.log(`Wrote ${outputPath}`);
      break;
    }
  }

  process.exit(0);
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});



