const BASE = '/api/core';

function withTimeout<T>(p: Promise<T>, ms: number, controller: AbortController) {
  return Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        controller.abort();
        reject(new Error(`Request timed out after ${ms}ms`));
      }, ms)
    ),
  ]);
}

export async function postJSON(path: string, body: any, opts?: { signal?: AbortSignal; timeoutMs?: number }) {
  const controller = new AbortController();
  const signal = opts?.signal ?? controller.signal;
  const timeoutMs = opts?.timeoutMs ?? 15000; // 15s default

  const req = fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  }).then(async (res) => {
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
    return res.json();
  });

  return withTimeout(req, timeoutMs, controller);
}

export const plan = (goal: string, context?: any, opts?: { signal?: AbortSignal; timeoutMs?: number }) =>
  postJSON('/plan', { goal, context }, opts);

export const recommend = (
  goal: string,
  planSteps?: any[],
  preferences?: any,
  opts?: { signal?: AbortSignal; timeoutMs?: number }
) => postJSON('/recommend', { goal, plan: planSteps, preferences }, opts);

export const estimate = (path: any, opts?: { signal?: AbortSignal; timeoutMs?: number }) =>
  postJSON('/estimate', { path }, opts);


