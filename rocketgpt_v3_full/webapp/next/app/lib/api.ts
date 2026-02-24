import { headers } from "next/headers";

async function absoluteUrl(path: string) {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}${path}`;
}

export async function getJSON<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 4000
): Promise<{ ok: boolean; data?: T; error?: string }> {

  let finalUrl = url;

  // Server Component: build absolute URL based on incoming request
  if (typeof window === "undefined" && url.startsWith("/")) {
    finalUrl = await absoluteUrl(url);
  }

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
