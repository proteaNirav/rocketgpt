export async function getJSON<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 4000
): Promise<{ ok: boolean; data?: T; error?: string }> {

  // 1) Convert relative URL → absolute URL when running on server
  let finalUrl = url;
  if (url.startsWith("/")) {
    // Running on server-side renderer?
    if (typeof window === "undefined") {
      const base =
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_BASE_URL
          ? process.env.NEXT_PUBLIC_BASE_URL
          : "http://localhost:3000";

      finalUrl = base + url;
    }
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(finalUrl, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

    const data = (await res.json()) as T;
    return { ok: true, data };

  } catch (e: any) {
    return { ok: false, error: e?.message ?? "fetch-error" };
  } finally {
    clearTimeout(id);
  }
}
