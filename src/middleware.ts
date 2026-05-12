import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Route sempre pubbliche — mai intercettate dai redirect di piano
const PUBLIC_PATHS = [
  '/auth/',
  '/api/webhooks/',
  '/abbonamento-scaduto',
  '/onboarding',
  '/_next/',
  '/favicon',
]

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some(p => path.startsWith(p))
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Rinnova token e ottieni utente corrente
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // ── 1. Route pubbliche: lascia sempre passare
  if (isPublic(path)) {
    // /onboarding è accessibile solo se onboarding NON completato
    // → lo gestiamo lato page per semplicità, qui passiamo
    return response
  }

  // ── 2. Utente non autenticato → /auth/login
  if (!user) {
    if (path.startsWith('/dashboard') || path.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    return response
  }

  // ── 3. Utente autenticato: controlli piano e onboarding
  //    (solo per route dashboard/admin, non per API routes — quelle si proteggono server-side)
  if (path.startsWith('/dashboard') || path.startsWith('/admin')) {
    const { data: utente } = await supabase
      .from('utenti')
      .select('club_id, is_super_admin, ruolo')
      .eq('id', user.id)
      .maybeSingle()

    if (!utente) {
      return NextResponse.redirect(new URL('/auth/errore', request.url))
    }

    // Super admin bypassa tutti i controlli di piano e onboarding
    if (utente.is_super_admin) {
      return response
    }

    const { data: club } = await supabase
      .from('clubs')
      .select('plan_status, onboarding_completed, trial_ends_at')
      .eq('id', utente.club_id)
      .maybeSingle()

    if (!club) return response

    // ── 4. Onboarding non completato → /onboarding (solo il presidente)
    // Lo staff invitato durante l'onboarding accede direttamente alla propria dashboard.
    if (!club.onboarding_completed && utente.ruolo === 'presidente') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // ── 5. Controllo accesso per piano — solo il presidente gestisce l'abbonamento
    if (utente.ruolo === 'presidente') {
      const now = new Date()

      // Trial attivo: consenti accesso
      if (
        club.plan_status === 'trial' &&
        club.trial_ends_at &&
        new Date(club.trial_ends_at) > now
      ) {
        return response
      }

      // Trial scaduto: blocca con motivo
      if (
        club.plan_status === 'trial' &&
        (!club.trial_ends_at || new Date(club.trial_ends_at) <= now)
      ) {
        const url = new URL('/abbonamento-scaduto', request.url)
        url.searchParams.set('motivo', 'trial_scaduto')
        return NextResponse.redirect(url)
      }

      // Abbonamento attivo: consenti
      if (club.plan_status === 'active') {
        return response
      }

      // Qualsiasi altro stato (inactive, expired): blocca
      const url = new URL('/abbonamento-scaduto', request.url)
      url.searchParams.set('motivo', club.plan_status ?? 'inactive')
      return NextResponse.redirect(url)
    }
  }

  // ── 6. Tutto ok: lascia passare
  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/onboarding',
    '/abbonamento-scaduto',
  ],
}
