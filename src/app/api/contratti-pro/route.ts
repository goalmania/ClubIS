import { createAdminClient } from '@/lib/supabase/admin'
import { getClubFromSession } from '@/lib/server-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { isPro } from '@/lib/categorie-club'

async function getClubPro() {
  const session = await getClubFromSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data: club } = await supabase
    .from('clubs')
    .select('categoria')
    .eq('id', session.clubId)
    .single()
  if (!club || !isPro(club.categoria)) return null
  return { ...session, supabase }
}

export async function GET() {
  const ctx = await getClubPro()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { data, error } = await ctx.supabase
    .from('contratti_professionisti')
    .select('*')
    .eq('club_id', ctx.clubId)
    .order('data_scadenza')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const ctx = await getClubPro()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()

  const payload = {
    club_id:                   ctx.clubId,
    tesserato_id:              body.tesserato_id || null,
    nome_tesserato:            body.nome_tesserato,
    cognome_tesserato:         body.cognome_tesserato,
    tipo_lavoratore:           body.tipo_lavoratore ?? 'calciatore_professionista',
    retribuzione_lorda_annua:  body.retribuzione_lorda_annua ? Number(body.retribuzione_lorda_annua) : null,
    premi:                     body.premi ?? [],
    data_inizio:               body.data_inizio,
    data_scadenza:             body.data_scadenza,
    durata_anni:               body.durata_anni ? Number(body.durata_anni) : null,
    clausola_rescissoria:      body.clausola_rescissoria ? Number(body.clausola_rescissoria) : null,
    stato_deposito:            body.stato_deposito ?? 'da_depositare',
    lega_ref:                  body.lega_ref || null,
    note:                      body.note || null,
    rappresentante_legale:     body.rappresentante_legale || null,
    qualifica_rappresentante:  body.qualifica_rappresentante || null,
    cf_tesserato:              body.cf_tesserato || null,
    data_nascita_tesserato:    body.data_nascita_tesserato || null,
    luogo_nascita_tesserato:   body.luogo_nascita_tesserato || null,
    domicilio_tesserato:       body.domicilio_tesserato || null,
    matricola_tesserato:       body.matricola_tesserato || null,
    agente_calciatore_nome:    body.agente_calciatore_nome || null,
    agente_calciatore_reg:     body.agente_calciatore_reg || null,
    agente_societa_nome:       body.agente_societa_nome || null,
    agente_societa_reg:        body.agente_societa_reg || null,
    numero_modulo:             body.numero_modulo || null,
  }

  if (!payload.nome_tesserato || !payload.cognome_tesserato || !payload.data_inizio || !payload.data_scadenza) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  const { data, error } = await ctx.supabase
    .from('contratti_professionisti')
    .insert(payload)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
