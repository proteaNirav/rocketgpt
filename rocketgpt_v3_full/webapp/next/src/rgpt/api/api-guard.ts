import { NextResponse } from 'next/server';

type AnyHandler = (...args: any[]) => Promise<Response> | Response;

/**
 * withApiGuard()
 * Minimal governance gate for API routes.
 * Blocks execution when process.env.RGPT_SAFE_MODE === 'true' (case-insensitive).
 *
 * Usage:
 *   export const POST = withApiGuard(async (req) => { ... })
 */
export function withApiGuard(handler: AnyHandler): AnyHandler {
  return async (...args: any[]) => {
    const safe = (process.env.RGPT_SAFE_MODE || '').toLowerCase() === 'true';
    if (safe) {
      return NextResponse.json({ ok: false, error: 'SAFE_MODE' }, { status: 403 });
    }
    return handler(...args);
  };
}