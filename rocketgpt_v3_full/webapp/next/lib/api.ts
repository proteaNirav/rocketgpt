- const BASE = process.env.NEXT_PUBLIC_CORE_API_BASE
+ // Use same-origin proxy to avoid CORS in the browser
+ const BASE = '/api/core'

 export async function postJSON(path: string, body: any) {
-  if (!BASE) throw new Error('NEXT_PUBLIC_CORE_API_BASE not set')
+  // BASE is always defined (same-origin path)
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
