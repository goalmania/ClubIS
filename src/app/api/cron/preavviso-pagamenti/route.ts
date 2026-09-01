import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Questo endpoint viene chiamato da un job cron esterno (es. Vercel Cron, GitHub Actions).
// Autenticazione via header secret: Authorization: Bearer <CRON_SECRET>
// Trova le quote_iscrizione con scadenza entro i prossimi 5 giorni non ancora pagate
// e crea notifiche_sistema per i segretari/presidenti del club.

const GIORNI_PREAVVISO = 5

export async function GET(req: NextRequest) {
  // Verifica secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const oggi = new Date()
  const limite = new Date(oggi)
  limite.setDate(limite.getDate() + GIORNI_PREAVVISO)

  const oggiStr   = oggi.toISOString().split('T')[0]
  const limiteStr = limite.toISOString().split('T')[0]

  // 1. Trova quote in scadenza entro 5 giorni, non ancora pagate
  const { data: rateGrezze, error: rateError } = await supabase
    .from('quote_iscrizione')
    .select(`
      id,
      club_id,
      giocatore_id,
      stagione,
      importo_totale,
      importo_pagato,
      scadenza,
      giocatori ( nome, cognome )
    `)
    .gte('scadenza', oggiStr)
    .lte('scadenza', limiteStr)
    .neq('stato', 'pagato')

  if (rateError) {
    console.error('[preavviso-pagamenti] Errore query rate:', rateError.message)
    return NextResponse.json({ error: rateError.message }, { status: 500 })
  }

  if (!rateGrezze || rateGrezze.length === 0) {
    return NextResponse.json({ ok: true, notifiche_create: 0, messaggio: 'Nessuna rata in scadenza' })
  }

  // Non ha senso ricordare la retta a chi è già in addebito automatico —
  // esclude i giocatori con un retta_abbonamenti attivo o in attesa.
  const giocatoreIds = Array.from(new Set(rateGrezze.map(r => r.giocatore_id).filter(Boolean)))
  const { data: abbonamentiAttivi } = await supabase
    .from('retta_abbonamenti')
    .select('giocatore_id')
    .in('giocatore_id', giocatoreIds)
    .in('stato', ['attivo', 'in_attesa'])
  const giocatoriInAutopay = new Set((abbonamentiAttivi ?? []).map(a => a.giocatore_id))
  const rate = rateGrezze.filter(r => !giocatoriInAutopay.has(r.giocatore_id))

  if (rate.length === 0) {
    return NextResponse.json({ ok: true, notifiche_create: 0, messaggio: 'Nessuna rata in scadenza (le altre sono già in addebito automatico)' })
  }

  // 2. Raggruppa per club
  const perClub: Record<string, typeof rate> = {}
  for (const r of rate) {
    const clubId = r.club_id as string
    if (!perClub[clubId]) perClub[clubId] = []
    perClub[clubId].push(r)
  }

  // Famiglie collegate ai giocatori in scadenza (auth_user_id → utenti.id),
  // per notificare anche loro, non solo lo staff.
  const { data: famiglieGiocatori } = await supabase
    .from('famiglie')
    .select('giocatore_id, auth_user_id')
    .in('giocatore_id', giocatoreIds)

  const authUserIds = Array.from(new Set((famiglieGiocatori ?? []).map(f => f.auth_user_id).filter(Boolean)))
  const { data: utentiFamiglia } = authUserIds.length > 0
    ? await supabase.from('utenti').select('id, auth_user_id').in('auth_user_id', authUserIds)
    : { data: [] as { id: string; auth_user_id: string }[] }

  const utenteIdPerAuthUserId = new Map((utentiFamiglia ?? []).map(u => [u.auth_user_id, u.id]))
  const utenteIdsPerGiocatore = new Map<string, string[]>()
  for (const f of famiglieGiocatori ?? []) {
    const utenteId = utenteIdPerAuthUserId.get(f.auth_user_id)
    if (!utenteId) continue
    const lista = utenteIdsPerGiocatore.get(f.giocatore_id) ?? []
    lista.push(utenteId)
    utenteIdsPerGiocatore.set(f.giocatore_id, lista)
  }

  let totaleNotifiche = 0

  for (const [clubId, rateClub] of Object.entries(perClub)) {
    // 3. Trova destinatari: segretari e presidenti del club
    const { data: destinatariStaff } = await supabase
      .from('utenti')
      .select('id')
      .eq('club_id', clubId)
      .in('ruolo', ['segretario', 'presidente'])

    const destinatari = destinatariStaff ?? []
    if (destinatari.length === 0 && utenteIdsPerGiocatore.size === 0) continue

    // 4. Per ogni rata, crea una notifica per ogni destinatario
    const notificheDaInserire: {
      club_id:         string
      destinatario_id: string
      tipo:            string
      riferimento_id:  string
      titolo:          string
      messaggio:       string
      azione_url:      string
    }[] = []

    for (const rata of rateClub) {
      const giocatore = (rata.giocatori as unknown) as { nome: string; cognome: string } | null
      const nomeGiocatore = giocatore
        ? `${giocatore.nome} ${giocatore.cognome}`
        : 'Giocatore sconosciuto'

      const residuo = (Number(rata.importo_totale) - Number(rata.importo_pagato)).toFixed(2)
      const scadenzaFormattata = new Date(rata.scadenza as string).toLocaleDateString('it-IT')

      for (const dest of destinatari) {
        // Evita duplicati: controlla se già esiste una notifica per questa rata
        const { count } = await supabase
          .from('notifiche_sistema')
          .select('id', { count: 'exact', head: true })
          .eq('club_id', clubId)
          .eq('destinatario_id', dest.id as string)
          .eq('tipo', 'quota_arretrata')
          .eq('riferimento_id', rata.id as string)

        if ((count ?? 0) > 0) continue

        notificheDaInserire.push({
          club_id:         clubId,
          destinatario_id: dest.id as string,
          tipo:            'quota_arretrata',
          riferimento_id:  rata.id as string,
          titolo:          `Quota in scadenza — ${nomeGiocatore}`,
          messaggio:       `La quota di ${nomeGiocatore} (stagione ${rata.stagione}) scade il ${scadenzaFormattata}. Residuo: €${residuo}.`,
          azione_url:      '/dashboard/segretario/pagamenti',
        })
      }

      // 5. Notifica anche la famiglia collegata (se ha un account utenti)
      const destinatariFamiglia = utenteIdsPerGiocatore.get(rata.giocatore_id as string) ?? []
      for (const utenteId of destinatariFamiglia) {
        const { count } = await supabase
          .from('notifiche_sistema')
          .select('id', { count: 'exact', head: true })
          .eq('club_id', clubId)
          .eq('destinatario_id', utenteId)
          .eq('tipo', 'quota_arretrata')
          .eq('riferimento_id', rata.id as string)

        if ((count ?? 0) > 0) continue

        notificheDaInserire.push({
          club_id:         clubId,
          destinatario_id: utenteId,
          tipo:            'quota_arretrata',
          riferimento_id:  rata.id as string,
          titolo:          `Quota in scadenza — ${nomeGiocatore}`,
          messaggio:       `La quota di ${nomeGiocatore} (stagione ${rata.stagione}) scade il ${scadenzaFormattata}. Residuo: €${residuo}.`,
          azione_url:      '/dashboard/famiglia/pagamenti',
        })
      }
    }

    if (notificheDaInserire.length > 0) {
      const { error: insError } = await supabase
        .from('notifiche_sistema')
        .insert(notificheDaInserire)

      if (insError) {
        console.error(`[preavviso-pagamenti] Errore insert notifiche club ${clubId}:`, insError.message)
      } else {
        totaleNotifiche += notificheDaInserire.length
      }
    }
  }

  return NextResponse.json({
    ok:                 true,
    notifiche_create:   totaleNotifiche,
    rate_in_scadenza:   rate.length,
    eseguito_alle:      new Date().toISOString(),
  })
}
