// deno-lint-ignore-file no-explicit-any
export function getAuthUserId(req: Request): string | null {
  // Retrieve all headers and handle any casing variations
  const headers = new Headers(req.headers);
  const uid =
    headers.get("x-user-id") ||
    headers.get("X-User-Id") ||
    headers.get("X-USER-ID") ||
    headers.get("user-id");

  if (!uid || uid.trim().length === 0) return null;
  return uid.trim();
}


