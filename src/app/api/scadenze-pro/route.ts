import { createAdminClient } from '@/lib/supabase/admin'
import { getClubFromSession } from '@/lib/server-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { isPro } from '@/lib/categorie-club'

async function getCtxPro() {
  const session = await getClubFromSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data: club } = await supabase.from('clubs').select('categoria').eq('id', session.clubId).single()
  if (!club || !isPro(club.categoria)) return null
  return { ...session, supabase }
}

export async function GET() {
  const ctx = await getCtxPro()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { data, error } = await ctx.supabase
    .from('scadenze_federali_pro')
    .select('*')
    .eq('club_id', ctx.clubId)
    .order('data_scadenza')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const ctx = await getCtxPro()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  const payload = {
    club_id:              ctx.clubId,
    tipo:                 body.tipo,
    categoria_scadenza:   body.categoria_scadenza,
    descrizione:          body.descrizione,
    data_scadenza:        body.data_scadenza,
    stato:                body.stato ?? 'da_completare',
    attestazione_caricata: body.attestazione_caricata ?? false,
    attestazione_url:     body.attestazione_url || null,
    note:                 body.note || null,
    importo_coinvolto:    body.importo_coinvolto ? Number(body.importo_coinvolto) : null,
    stagione:             body.stagione,
  }

  if (!payload.tipo || !payload.descrizione || !payload.data_scadenza || !payload.stagione) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  const { data, error } = await ctx.supabase
    .from('scadenze_federali_pro')
    .insert(payload)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
