import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { IMPERSONATION_COOKIE } from '@/lib/impersonation'

export async function POST() {
  cookies().delete(IMPERSONATION_COOKIE)
  return NextResponse.json({ ok: true, redirect: '/admin' })
}
