export async function getJSON<T>(url: string, init?: RequestInit, timeoutMs = 4000): Promise<{ ok: boolean; data?: T; error?: string }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e:any) {
    return { ok: false, error: e?.message ?? "fetch-error" };
  } finally {
    clearTimeout(id);
  }
}
