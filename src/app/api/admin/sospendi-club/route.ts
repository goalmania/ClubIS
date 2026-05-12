import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase
    .from('utenti')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!utente?.is_super_admin) {
    return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  const { id, attivo } = await req.json()
  if (!id || typeof attivo !== 'boolean') {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  }

  const { error } = await supabase.from('clubs').update({ attivo }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
