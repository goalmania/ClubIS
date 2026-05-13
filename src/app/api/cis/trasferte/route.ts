import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const body = await req.json().catch(() => null) as any
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const {
    destinazione,
    data_partenza,
    data_rientro,
    mezzo,
    costo_stimato,
    costo_effettivo,
    note,
    stato,
    partita_id,
    evento_calendario_id,
  } = body as any

  if (!destinazione || typeof destinazione !== 'string') {
    return NextResponse.json({ error: 'destinazione obbligatoria' }, { status: 400 })
  }
  if (!data_partenza || !data_rientro) {
    return NextResponse.json({ error: 'Date obbligatorie' }, { status: 400 })
  }
  if (!mezzo || typeof mezzo !== 'string') {
    return NextResponse.json({ error: 'mezzo obbligatorio' }, { status: 400 })
  }
  if (typeof note !== 'string') {
    return NextResponse.json({ error: 'note obbligatoria' }, { status: 400 })
  }

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente, error: utenteError } = await supabase
    .from('utenti')
    .select('club_id')
    .eq('id', user.id)
    .single()

  if (utenteError || !utente) return NextResponse.json({ error: 'Utente non valido' }, { status: 403 })

  const clubId = utente.club_id

  const insertPayload: any = {
    club_id: clubId,
    destinazione: String(destinazione),
    data_partenza,
    data_rientro,
    mezzo,
    costo_stimato: costo_stimato ?? null,
    costo_effettivo: costo_effettivo ?? null,
    note,
    stato: stato ?? 'programmata',
    partita_id: partita_id ?? null,
    evento_calendario_id: evento_calendario_id ?? null,
  }

  const { data: ins, error } = await supabase
    .from('trasferte')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error || !ins) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  return NextResponse.json({ ok: true, id: ins.id })
}

