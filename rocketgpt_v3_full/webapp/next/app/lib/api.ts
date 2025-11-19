export async function getJSON<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 4000
): Promise<{ ok: boolean; data?: T; error?: string }> {
  // Always use the URL as given.
  // - On the client: this will be a normal relative fetch (`/api/...`).
  // - On the server (App Router): Next.js will internally resolve `/api/...`
  //   against the same deployment without needing an absolute base URL.
  const finalUrl = url;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(finalUrl, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "fetch-error" };
  } finally {
    clearTimeout(id);
  }
}
