import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/guest
 * Ensures a guest session exists for anonymous users.
 * Creates a guest_id cookie and corresponding database record.
 */
export async function POST(_req: NextRequest) {
  try {
    const cookieStore = cookies()
    let guestId = cookieStore.get('guest_id')?.value

    // If guest_id already exists, just ensure the row exists in DB
    if (guestId) {
      const supabase = createSupabaseRouteHandlerClient()
      
      // Try to touch the existing guest record
      const { error } = await supabase.rpc('touch_guest', {
        p_guest_id: guestId,
        p_user_agent: _req.headers.get('user-agent') || 'unknown'
      })
      
      // If touch fails, the guest might not exist, so we'll create a new one
      if (error) {
        console.log('[api/guest] Touch failed, creating new guest:', error.message)
        guestId = null // Force new guest creation
      } else {
        return NextResponse.json({ 
          ok: true, 
          guest_id: guestId,
          existing: true 
        })
      }
    }

    // Generate new guest_id if needed
    if (!guestId) {
      guestId = crypto.randomUUID()
    }

    // Use service role to bypass RLS for guest creation
    const supabase = createSupabaseRouteHandlerClient()
    
    // Insert guest record (with ON CONFLICT DO NOTHING for idempotency)
    const { error: insertError } = await supabase
      .from('guests')
      .insert({ 
        id: guestId,
        user_agent: _req.headers.get('user-agent') || 'unknown',
        ip_address: _req.headers.get('x-forwarded-for')?.split(',')[0] || 
                    _req.headers.get('x-real-ip') || 
                    'unknown'
      })
      .select()
      .single()

    // Check if insert failed due to duplicate (which is fine)
    if (insertError && !insertError.message.includes('duplicate')) {
      console.error('[api/guest] Insert error:', insertError)
      
      // If we can't create a guest, still set the cookie for client functionality
      // but log the error for monitoring
    }

    // Create response with cookie
    const response = NextResponse.json({ 
      ok: true, 
      guest_id: guestId,
      existing: false 
    })

    // Set the guest_id cookie
    response.cookies.set('guest_id', guestId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 90, // 90 days
      secure: process.env.NODE_ENV === 'production',
    })

    return response
  } catch (err: any) {
    console.error('[api/guest] Unexpected error:', err)
    
    // Even on error, try to ensure some guest_id exists
    const fallbackId = crypto.randomUUID()
    const response = NextResponse.json({ 
      ok: false, 
      error: 'internal_error',
      guest_id: fallbackId 
    }, { status: 500 })
    
    response.cookies.set('guest_id', fallbackId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 90,
      secure: process.env.NODE_ENV === 'production',
    })
    
    return response
  }
}

/**
 * GET /api/guest
 * Returns the current guest_id if it exists
 */
export async function GET(_req: NextRequest) {
  const cookieStore = cookies()
  const guestId = cookieStore.get('guest_id')?.value
  
  if (!guestId) {
    return NextResponse.json({ 
      ok: false, 
      error: 'no_guest_session' 
    }, { status: 404 })
  }
  
  return NextResponse.json({ 
    ok: true, 
    guest_id: guestId 
  })
}
