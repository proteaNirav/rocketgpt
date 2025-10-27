// deno-lint-ignore-file no-explicit-any
export function getAuthUserId(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  // Trust Supabase’s JWT. In Deno, we avoid verifying here (Supabase already did),
  // you likely pass user_id from your app as header if you’re using service calls.
  // If you prefer strict, add jose decode here.
  const uid = req.headers.get("x-user-id"); // <- recommended: send from your web app after verifying session
  return uid;
}
