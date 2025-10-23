const BASE = process.env.NEXT_PUBLIC_CORE_API_BASE

export async function postJSON(path: string, body: any) {
  if (!BASE) throw new Error('NEXT_PUBLIC_CORE_API_BASE not set')
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`)
  return res.json()
}

export async function plan(goal: string, context?: any) {
  return postJSON('/plan', { goal, context })
}

export async function recommend(goal: string, planSteps?: any[], preferences?: any) {
  return postJSON('/recommend', { goal, plan: planSteps, preferences })
}

export async function estimate(path: any) {
  return postJSON('/estimate', { path })
}
