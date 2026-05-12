import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  await supabase.auth.signOut({ scope: 'global' })

  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/auth/login`, { status: 302 })
}
