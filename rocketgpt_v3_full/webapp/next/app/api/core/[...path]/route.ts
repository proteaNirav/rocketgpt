export const runtime = 'nodejs' // ensure server runtime
export const dynamic = 'force-dynamic' // disable caching

const CORE = process.env.NEXT_PUBLIC_CORE_API_BASE!
if (!CORE) {
  // This logs on the server; if you see it, set the env var on Vercel (step 3).
  console.error('NEXT_PUBLIC_CORE_API_BASE is not set on the server')
}

async function forward(req: Request, method: 'GET' | 'POST', path: string[]) {
  const target = `${CORE}/${path.join('/')}`
  const headers: Record<string, string> = { 'content-type': 'application/json' }

  let body: string | undefined = undefined
  if (method === 'POST') {
    try {
      body = JSON.stringify(await req.json())
    } catch {
      body = '{}'
    }
  }

  const res = await fetch(target, { method, headers, body })
  const text = await res.text()
  const ct = res.headers.get('content-type') || 'application/json'

  return new Response(text, { status: res.status, headers: { 'content-type': ct } })
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  return forward(req, 'GET', path)
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  return forward(req, 'POST', path)
}
