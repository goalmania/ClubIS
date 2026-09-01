import { createAdminClient } from '@/lib/supabase/admin'
import { getClubFromSession } from '@/lib/server-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { isPro } from '@/lib/categorie-club'

async function getCtx(id: string) {
  const session = await getClubFromSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data: club } = await supabase.from('clubs').select('categoria').eq('id', session.clubId).single()
  if (!club || !isPro(club.categoria)) return null
  // Verifica che il contratto appartenga al club — isolamento dati
  const { data: contratto } = await supabase
    .from('contratti_professionisti')
    .select('id')
    .eq('id', id)
    .eq('club_id', session.clubId)
    .maybeSingle()
  if (!contratto) return null
  return { ...session, supabase }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getCtx(params.id)
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  const { error } = await ctx.supabase
    .from('contratti_professionisti')
    .update({
      tesserato_id:              body.tesserato_id || null,
      nome_tesserato:            body.nome_tesserato,
      cognome_tesserato:         body.cognome_tesserato,
      tipo_lavoratore:           body.tipo_lavoratore,
      retribuzione_lorda_annua:  body.retribuzione_lorda_annua ? Number(body.retribuzione_lorda_annua) : null,
      premi:                     body.premi ?? [],
      data_inizio:               body.data_inizio,
      data_scadenza:             body.data_scadenza,
      durata_anni:               body.durata_anni ? Number(body.durata_anni) : null,
      clausola_rescissoria:      body.clausola_rescissoria ? Number(body.clausola_rescissoria) : null,
      stato_deposito:            body.stato_deposito,
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
      updated_at:                new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('club_id', ctx.clubId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getCtx(params.id)
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { error } = await ctx.supabase
    .from('contratti_professionisti')
    .delete()
    .eq('id', params.id)
    .eq('club_id', ctx.clubId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
