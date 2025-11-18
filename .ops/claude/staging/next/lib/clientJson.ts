export async function clientJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: init?.body ?? "{}",
  });
  if (res.status === 429) {
    const j = await res.json().catch(() => ({}));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rate-limited", { detail: j }));
    }
    throw Object.assign(new Error("RATE_LIMITED"), { rl: j });
  }
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}


