import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type RouteContext = { params: Promise<{ path: string[] }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_ROOTS = new Set(["learning", "cats"]);
const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function resolveTenantId(req: NextRequest): string {
  const fromHeader = (req.headers.get("x-tenant-id") || "").trim();
  if (UUID_RE.test(fromHeader)) return fromHeader;

  const fromEnv = (
    process.env.NEXT_PUBLIC_DEV_TENANT_ID ||
    process.env.NEXT_PUBLIC_DEMO_TENANT_ID ||
    ""
  ).trim();
  if (UUID_RE.test(fromEnv)) return fromEnv;

  throw new Error(
    "Admin proxy requires a valid tenant UUID. Set NEXT_PUBLIC_DEV_TENANT_ID or pass x-tenant-id."
  );
}

function isDevBypassAllowed(req: NextRequest): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if ((process.env.ALLOW_DEV_ADMIN_PROXY || "").toLowerCase() !== "true") return false;
  return LOCALHOST_HOSTS.has(req.nextUrl.hostname);
}

async function resolveUserIdFromSession(): Promise<string | null> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id || null;
    return userId && UUID_RE.test(userId) ? userId : null;
  } catch {
    return null;
  }
}

function buildTargetPath(pathParts: string[], search: string): string | null {
  if (!Array.isArray(pathParts) || pathParts.length === 0) return null;
  if (!ALLOWED_ROOTS.has(pathParts[0])) return null;
  return `/api/${pathParts.join("/")}${search || ""}`;
}

async function handleProxy(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  if (!process.env.ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "ADMIN_TOKEN is not configured on the server." },
      { status: 500 }
    );
  }

  const { path } = await ctx.params;
  const targetPath = buildTargetPath(path, req.nextUrl.search);
  if (!targetPath) {
    return NextResponse.json({ error: "Unsupported admin proxy path." }, { status: 404 });
  }

  const userId = await resolveUserIdFromSession();
  const devBypass = isDevBypassAllowed(req);
  if (!userId && !devBypass) {
    return NextResponse.json(
      {
        error:
          "Admin proxy denied. Sign in first, or set ALLOW_DEV_ADMIN_PROXY=true on localhost for local development.",
      },
      { status: 403 }
    );
  }

  let tenantId: string;
  try {
    tenantId = resolveTenantId(req);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid tenant id." },
      { status: 400 }
    );
  }

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("x-governance-role", "admin");
  headers.set("x-admin-token", process.env.ADMIN_TOKEN);
  headers.set("x-tenant-id", tenantId);
  if (userId) headers.set("x-user-id", userId);

  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();
  const upstream = await fetch(new URL(targetPath, req.nextUrl.origin), {
    method: req.method,
    headers,
    cache: "no-store",
    body: body && body.length > 0 ? body : undefined,
  });

  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) responseHeaders.set("content-type", upstreamContentType);
  const payload = await upstream.text();
  return new NextResponse(payload, { status: upstream.status, headers: responseHeaders });
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}
