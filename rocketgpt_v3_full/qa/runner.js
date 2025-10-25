// Node 18+ (Actions uses Node 20). Minimal tester against Core API.
import fs from 'node:fs/promises'
import fetch from 'node-fetch'

const CORE = process.env.CORE_API_BASE || 'https://rocketgpt-core-api.onrender.com'

function includesAny(text = '', needles = []) {
  const t = (text || '').toLowerCase()
  return needles.some((n) => t.includes(n.toLowerCase()))
}

async function runScenario(file) {
  const raw = await fs.readFile(file, 'utf-8')
  const sc = JSON.parse(raw)

  const t0 = Date.now()
  const plan = await fetch(`${CORE}/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: sc.goal }),
  }).then((r) => r.json())
  const t1 = Date.now()

  const rec = await fetch(`${CORE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: sc.goal, plan: plan.plan }),
  }).then((r) => r.json())
  const t2 = Date.now()

  const decision = plan?.decision?.summary || ''
  const tools = (rec?.recommendations || []).map((r) => r.toolId)

  const okDecision = sc.expect?.decisionContains ? includesAny(decision, sc.expect.decisionContains) : true
  const okTools = sc.expect?.toolsIncludeAny
    ? (rec?.recommendations || []).some((r) => sc.expect.toolsIncludeAny.includes(r.toolId))
    : true

  return {
    name: sc.name,
    goal: sc.goal,
    latencyMs: { plan: t1 - t0, recommend: t2 - t1 },
    pass: okDecision && okTools,
    got: { decision, tools },
    expect: sc.expect || {},
  }
}

async function main() {
  const files = process.argv.slice(2)
  const results = []
  for (const f of files) results.push(await runScenario(f))
  const fail = results.some((r) => !r.pass)
  console.log(JSON.stringify({ results }, null, 2))
  process.exit(fail ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
