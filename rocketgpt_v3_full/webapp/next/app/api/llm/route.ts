import { NextRequest, NextResponse } from 'next/server'
import { runtimeGuard } from '@/rgpt/runtime/runtime-guard'
import { callLLM } from '@/lib/llm/router'
import { LLMRouterRequest } from '@/lib/llm/types'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  await runtimeGuard(req, { permission: 'API_CALL' }) // TODO(S4): tighten permission per route
  try {
    const body = (await req.json()) as LLMRouterRequest

    const result = await callLLM(body, {
      retries: 2,
      delayMs: 500,
    })

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('[LLM ROUTE ERROR]', err)

    if (err instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          provider: (err as any).provider,
          status: (err as any).status,
        },
        { status: (err as any).status || 500 },
      )
    }

    return NextResponse.json({ success: false, error: 'Unknown error' }, { status: 500 })
  }
}
