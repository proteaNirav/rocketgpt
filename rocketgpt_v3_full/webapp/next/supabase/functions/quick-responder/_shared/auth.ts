// supabase/functions/quick-responder/_shared/auth.ts
export function getAuthUserId(req: Request): string | null {
  // If you later verify JWT, extract from Authorization here.
  // For now, rely on x-user-id or return null.
  const hdr = req.headers.get('x-user-id')
  return hdr ? hdr.trim() : null
}
