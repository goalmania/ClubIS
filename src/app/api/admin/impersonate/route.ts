import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { IMPERSONATION_COOKIE, readImpersonation, type ImpersonationData } from '@/lib/impersonation'

const RUOLI_IMPERSONABILI = new Set([
  'presidente',
  'ds',
  'segretario',
  'medico',
  'team_manager',
  'allenatore',
  'osservatore',
  'famiglia',
  'giocatore',
  'ufficio_stampa',
  'custode',
])

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Partial<ImpersonationData> | null
  if (!body?.ruolo) {
    return NextResponse.json({ error: 'Ruolo richiesto' }, { status: 400 })
  }

  if (!RUOLI_IMPERSONABILI.has(body.ruolo)) {
    return NextResponse.json({ error: 'Ruolo non valido' }, { status: 400 })
  }

  const sessionClient = createClient()


  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  // Verifica che sia super admin
  const { data: utente } = await supabase
    .from('utenti')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!utente?.is_super_admin) {
    return NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 })
  }

  const currentImpersonation = readImpersonation()
  const clubId = body.clubId ?? currentImpersonation?.clubId
  if (!clubId) {
    return NextResponse.json({ error: 'clubId richiesto' }, { status: 400 })
  }

  // Recupera nome club per banner
  const { data: club } = await supabase
    .from('clubs')
    .select('nome')
    .eq('id', clubId)
    .single()

  // Se il ruolo è 'famiglia', cerca un giocatore demo per il collegamento
  let giocatoreId: string | undefined
  if (body.ruolo === 'famiglia') {
    const { data: g } = await supabase
      .from('giocatori')
      .select('id')
      .eq('club_id', clubId)
      .eq('attivo', true)
      .limit(1)
      .single()
    giocatoreId = g?.id
  }

  const payload: ImpersonationData = {
    clubId,
    ruolo: body.ruolo,
    giocatoreId,
    clubNome: club?.nome,
  }

  cookies().set(IMPERSONATION_COOKIE, encodeURIComponent(JSON.stringify(payload)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 ore
  })

  return NextResponse.json({ ok: true, redirect: '/dashboard' })
}
