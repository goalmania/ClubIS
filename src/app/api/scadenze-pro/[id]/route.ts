import { createAdminClient } from '@/lib/supabase/admin'
import { getClubFromSession } from '@/lib/server-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { notificaRuolo } from '@/lib/notifiche'
import { isPro } from '@/lib/categorie-club'

async function getCtx(id: string) {
  const session = await getClubFromSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data: club } = await supabase.from('clubs').select('categoria').eq('id', session.clubId).single()
  if (!club || !isPro(club.categoria)) return null
  const { data: row } = await supabase
    .from('scadenze_federali_pro')
    .select('id')
    .eq('id', id)
    .eq('club_id', session.clubId)
    .maybeSingle()
  if (!row) return null
  return { ...session, supabase }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getCtx(params.id)
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  const { error } = await ctx.supabase
    .from('scadenze_federali_pro')
    .update({
      stato:                 body.stato,
      attestazione_caricata: body.attestazione_caricata ?? false,
      attestazione_url:      body.attestazione_url || null,
      note:                  body.note || null,
      importo_coinvolto:     body.importo_coinvolto ? Number(body.importo_coinvolto) : null,
    })
    .eq('id', params.id)
    .eq('club_id', ctx.clubId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Se segnata come completata, notifica presidente e segretario
  if (body.stato === 'completata') {
    const { data: scad } = await ctx.supabase
      .from('scadenze_federali_pro')
      .select('descrizione')
      .eq('id', params.id)
      .single()

    if (scad) {
      const msg = `Scadenza completata: ${scad.descrizione}`
      await Promise.all([
        notificaRuolo(ctx.supabase as any, {
          club_id: ctx.clubId, ruolo: 'presidente',
          titolo: 'Scadenza federale completata', messaggio: msg,
          azione_url: '/dashboard/segretario/compliance-pro',
        }),
        notificaRuolo(ctx.supabase as any, {
          club_id: ctx.clubId, ruolo: 'segretario',
          titolo: 'Scadenza federale completata', messaggio: msg,
          azione_url: '/dashboard/segretario/compliance-pro',
        }),
      ])
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getCtx(params.id)
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { error } = await ctx.supabase
    .from('scadenze_federali_pro')
    .delete()
    .eq('id', params.id)
    .eq('club_id', ctx.clubId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
