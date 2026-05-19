import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx

  const admin = createAdminClient()

  const [invitiRes, giocRes] = await Promise.all([
    admin
      .from('inviti_club')
      .select('id, ruolo, token, usato, scadenza, created_at, giocatore_id')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false }),
    admin
      .from('giocatori')
      .select('id, nome, cognome')
      .eq('club_id', clubId)
      .eq('attivo', true)
      .order('cognome'),
  ])

  return NextResponse.json({
    inviti:    invitiRes.data ?? [],
    giocatori: giocRes.data ?? [],
    clubId,
  })
}
