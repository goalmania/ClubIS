import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const ctx = await getUserContext()
  if (!ctx?.isSuperAdmin) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const sb = createAdminClient()
  const results: Record<string, number> = {}

  // 0. Backfill giocatori.club_id — questo era il passo mancante.
  //    Catena A: giocatori → tesseramenti → squadre (se squadra_id esiste)
  //    Catena B: giocatori → valutazioni_tecniche.club_id
  //    Catena C: giocatori → squalifiche.club_id
  //    Catena D: giocatori → infortuni.club_id
  {
    let fixed = 0

    // Catena A: via tesseramenti → squadre
    const { data: nullGioc } = await sb
      .from('giocatori')
      .select('id')
      .is('club_id', null)

    if (nullGioc?.length) {
      const ids = nullGioc.map(g => g.id)

      // Prende tesseramenti con squadra_id valorizzato
      const { data: tess } = await sb
        .from('tesseramenti')
        .select('giocatore_id, squadra_id')
        .in('giocatore_id', ids)
        .not('squadra_id', 'is', null)

      if (tess?.length) {
        const squadraIds = [...new Set(tess.map(t => t.squadra_id))]
        const { data: squadre } = await sb
          .from('squadre')
          .select('id, club_id')
          .in('id', squadraIds)
          .not('club_id', 'is', null)

        const squadraMap = Object.fromEntries((squadre ?? []).map(s => [s.id, s.club_id]))
        const giocatoreClubMap: Record<string, string> = {}
        for (const t of tess) {
          const cid = squadraMap[t.squadra_id]
          if (cid) giocatoreClubMap[t.giocatore_id] = cid
        }

        for (const [gid, cid] of Object.entries(giocatoreClubMap)) {
          await sb.from('giocatori').update({ club_id: cid }).eq('id', gid)
          fixed++
        }
      }

      // Catena B: via valutazioni_tecniche
      const { data: valGioc } = await sb
        .from('giocatori')
        .select('id')
        .is('club_id', null)
      if (valGioc?.length) {
        const remainIds = valGioc.map(g => g.id)
        const { data: vals } = await sb
          .from('valutazioni_tecniche')
          .select('giocatore_id, club_id')
          .in('giocatore_id', remainIds)
          .not('club_id', 'is', null)
        for (const v of vals ?? []) {
          await sb.from('giocatori').update({ club_id: v.club_id }).eq('id', v.giocatore_id)
          fixed++
        }
      }

      // Catena C: via squalifiche
      const { data: sqGioc } = await sb
        .from('giocatori')
        .select('id')
        .is('club_id', null)
      if (sqGioc?.length) {
        const remainIds = sqGioc.map(g => g.id)
        const { data: sq } = await sb
          .from('squalifiche')
          .select('giocatore_id, club_id')
          .in('giocatore_id', remainIds)
          .not('club_id', 'is', null)
        for (const s of sq ?? []) {
          await sb.from('giocatori').update({ club_id: s.club_id }).eq('id', s.giocatore_id)
          fixed++
        }
      }

      // Catena D: via infortuni
      const { data: infGioc } = await sb
        .from('giocatori')
        .select('id')
        .is('club_id', null)
      if (infGioc?.length) {
        const remainIds = infGioc.map(g => g.id)
        const { data: inf } = await sb
          .from('infortuni')
          .select('giocatore_id, club_id')
          .in('giocatore_id', remainIds)
          .not('club_id', 'is', null)
        for (const i of inf ?? []) {
          await sb.from('giocatori').update({ club_id: i.club_id }).eq('id', i.giocatore_id)
          fixed++
        }
      }
    }

    results.giocatori = fixed
  }

  // 1. Backfill partite.club_id via squadre
  {
    const { data: rows } = await sb
      .from('partite')
      .select('id, squadra_id')
      .is('club_id', null)
    if (rows?.length) {
      const squadraIds = [...new Set(rows.map(r => r.squadra_id))]
      const { data: squadre } = await sb.from('squadre').select('id, club_id').in('id', squadraIds)
      const map = Object.fromEntries((squadre ?? []).map(s => [s.id, s.club_id]))
      for (const r of rows) {
        const cid = map[r.squadra_id]
        if (cid) await sb.from('partite').update({ club_id: cid }).eq('id', r.id)
      }
    }
    results.partite = rows?.length ?? 0
  }

  // 2. Backfill tesseramenti.club_id via giocatori
  {
    const { data: rows } = await sb
      .from('tesseramenti')
      .select('id, giocatore_id')
      .is('club_id', null)
    if (rows?.length) {
      const gIds = [...new Set(rows.map(r => r.giocatore_id))]
      const { data: giocatori } = await sb.from('giocatori').select('id, club_id').in('id', gIds)
      const map = Object.fromEntries((giocatori ?? []).map(g => [g.id, g.club_id]))
      for (const r of rows) {
        const cid = map[r.giocatore_id]
        if (cid) await sb.from('tesseramenti').update({ club_id: cid }).eq('id', r.id)
      }
    }
    results.tesseramenti = rows?.length ?? 0
  }

  // 3. Backfill certificati_medici.club_id via giocatori
  {
    const { data: rows } = await sb
      .from('certificati_medici')
      .select('id, giocatore_id')
      .is('club_id', null)
    if (rows?.length) {
      const gIds = [...new Set(rows.map(r => r.giocatore_id))]
      const { data: giocatori } = await sb.from('giocatori').select('id, club_id').in('id', gIds)
      const map = Object.fromEntries((giocatori ?? []).map(g => [g.id, g.club_id]))
      for (const r of rows) {
        const cid = map[r.giocatore_id]
        if (cid) await sb.from('certificati_medici').update({ club_id: cid }).eq('id', r.id)
      }
    }
    results.certificati_medici = rows?.length ?? 0
  }

  // 4. Backfill convocazioni.club_id via partite (già aggiornate)
  {
    const { data: rows } = await sb
      .from('convocazioni')
      .select('id, partita_id')
      .is('club_id', null)
    if (rows?.length) {
      const pIds = [...new Set(rows.map(r => r.partita_id))]
      const { data: partite } = await sb.from('partite').select('id, club_id').in('id', pIds)
      const map = Object.fromEntries((partite ?? []).map(p => [p.id, p.club_id]))
      for (const r of rows) {
        const cid = map[r.partita_id]
        if (cid) await sb.from('convocazioni').update({ club_id: cid }).eq('id', r.id)
      }
    }
    results.convocazioni = rows?.length ?? 0
  }

  return NextResponse.json({ ok: true, fixed: results })
}

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx?.isSuperAdmin) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const sb = createAdminClient()

  const { data: partite, error: ep } = await sb
    .from('partite')
    .select('id, club_id, squadra_id, avversario, data_ora')
    .order('data_ora', { ascending: false })
    .limit(10)

  const { data: squadre } = await sb
    .from('squadre')
    .select('id, nome, club_id, attiva')
    .limit(20)

  const { data: tesseramenti, error: et } = await sb
    .from('tesseramenti')
    .select('id, club_id, giocatore_id')
    .is('club_id', null)
    .limit(5)

  const { count: totPartite } = await sb
    .from('partite')
    .select('*', { count: 'exact', head: true })

  const { count: partiteNullClub } = await sb
    .from('partite')
    .select('*', { count: 'exact', head: true })
    .is('club_id', null)

  return NextResponse.json({
    totPartite,
    partiteNullClub,
    ultimePartite: partite,
    squadre,
    tesseramentiNullClub: tesseramenti,
    errors: { partite: ep?.message, tesseramenti: et?.message },
    userCtx: { clubId: ctx.clubId, isSuperAdmin: ctx.isSuperAdmin },
  })
}
