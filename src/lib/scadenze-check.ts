import { createAdminClient } from '@/lib/supabase/admin'

// Controllo scadenze certificati medici e quote settore giovanile/scuola
// calcio, con relative notifiche. Condiviso da:
// - /api/cron/scadenze-notifiche (tutti i club, ogni giorno alle 9:00)
// - controllaScadenzeClubSeNecessario (un solo club, al primo accesso del
//   giorno di un utente — vedi dashboard/layout.tsx)

type AdminClient = ReturnType<typeof createAdminClient>

const GIORNI_PREAVVISO_CERTIFICATI = 30
const GIORNI_RETROATTIVI_CERTIFICATI = 14 // segnala anche i certificati scaduti da poco
const GIORNI_PREAVVISO_QUOTE = 5
const GIORNI_RETROATTIVI_QUOTE = 30 // non spammare quote scadute da troppo tempo

function aggiungiGiorni(base: Date, giorni: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + giorni)
  return d
}
function dataStr(d: Date) {
  return d.toISOString().split('T')[0]
}

export async function controllaCertificatiInScadenza(db: AdminClient, opts: { clubId?: string } = {}) {
  const oggi = new Date()
  const limiteMin = dataStr(aggiungiGiorni(oggi, -GIORNI_RETROATTIVI_CERTIFICATI))
  const limiteMax = dataStr(aggiungiGiorni(oggi, GIORNI_PREAVVISO_CERTIFICATI))

  let query = db
    .from('certificati_medici')
    .select('id, giocatore_id, club_id, tipo, data_scadenza, giocatori(nome, cognome)')
    .gte('data_scadenza', limiteMin)
    .lte('data_scadenza', limiteMax)
  if (opts.clubId) query = query.eq('club_id', opts.clubId)

  const { data: candidati, error } = await query

  if (error) {
    console.error('[scadenze-check] Errore query certificati:', error.message)
    return { errore: error.message }
  }
  if (!candidati || candidati.length === 0) return { notifiche_create: 0 }

  // Un certificato notifica solo se è quello più recente per quel giocatore
  // (evita di segnalare un certificato già superato da un rinnovo successivo).
  const giocatoreIds = Array.from(new Set(candidati.map(c => c.giocatore_id)))
  const { data: tuttiCertGiocatori } = await db
    .from('certificati_medici')
    .select('giocatore_id, data_scadenza')
    .in('giocatore_id', giocatoreIds)

  const maxScadenzaPerGiocatore = new Map<string, string>()
  for (const c of tuttiCertGiocatori ?? []) {
    const attuale = maxScadenzaPerGiocatore.get(c.giocatore_id)
    if (!attuale || c.data_scadenza > attuale) maxScadenzaPerGiocatore.set(c.giocatore_id, c.data_scadenza)
  }

  const daNotificare = candidati.filter(c => maxScadenzaPerGiocatore.get(c.giocatore_id) === c.data_scadenza)
  if (daNotificare.length === 0) return { notifiche_create: 0 }

  let totale = 0
  for (const cert of daNotificare) {
    const giocatore = (cert.giocatori as unknown) as { nome: string; cognome: string } | null
    const nomeGiocatore = giocatore ? `${giocatore.nome} ${giocatore.cognome}` : 'Giocatore'
    const scaduto = cert.data_scadenza < dataStr(oggi)
    const dataFormattata = new Date(cert.data_scadenza).toLocaleDateString('it-IT')

    const { data: destinatari } = await db
      .from('utenti')
      .select('id, ruolo')
      .eq('club_id', cert.club_id)
      .in('ruolo', ['segretario', 'medico'])

    for (const dest of destinatari ?? []) {
      const { count } = await db
        .from('notifiche_sistema')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', dest.id)
        .eq('tipo', 'scadenza_certificato')
        .eq('riferimento_id', cert.id)

      if ((count ?? 0) > 0) continue

      const { error: insErr } = await db.from('notifiche_sistema').insert({
        club_id: cert.club_id,
        destinatario_id: dest.id,
        ruolo_destinatario: dest.ruolo,
        tipo: 'scadenza_certificato',
        riferimento_id: cert.id,
        titolo: scaduto ? `Certificato medico scaduto — ${nomeGiocatore}` : `Certificato medico in scadenza — ${nomeGiocatore}`,
        messaggio: scaduto
          ? `Il certificato ${cert.tipo} di ${nomeGiocatore} è scaduto il ${dataFormattata}. Il giocatore non può essere convocato finché non viene rinnovato.`
          : `Il certificato ${cert.tipo} di ${nomeGiocatore} scade il ${dataFormattata}.`,
        azione_url: '/dashboard/segretario/certificati',
        letta: false,
      })
      if (insErr) console.error('[scadenze-check] Errore insert notifica certificato:', insErr.message)
      else totale++
    }
  }

  return { notifiche_create: totale, certificati_trovati: daNotificare.length }
}

export async function controllaQuoteGiovaniliInScadenza(db: AdminClient, opts: { clubId?: string } = {}) {
  const oggi = new Date()
  const limiteMin = dataStr(aggiungiGiorni(oggi, -GIORNI_RETROATTIVI_QUOTE))
  // mese_competenza è il primo giorno del mese; la scadenza reale è il 10 di
  // quel mese (stessa convenzione di isQuotaInRitardo in lib/settore-giovanile).
  // Includiamo quindi anche il mese successivo per catturare le quote il cui
  // 10 cade entro la finestra di preavviso.
  const limiteMax = dataStr(aggiungiGiorni(oggi, GIORNI_PREAVVISO_QUOTE + 31))

  let query = db
    .from('quote_giovanili')
    .select('id, club_id, giocatore_id, famiglia_id, importo_mensile, mese_competenza, stato, giocatori(nome, cognome)')
    .in('stato', ['da_pagare', 'in_ritardo'])
    .gte('mese_competenza', limiteMin)
    .lte('mese_competenza', limiteMax)
  if (opts.clubId) query = query.eq('club_id', opts.clubId)

  const { data: candidate, error } = await query

  if (error) {
    console.error('[scadenze-check] Errore query quote_giovanili:', error.message)
    return { errore: error.message }
  }
  if (!candidate || candidate.length === 0) return { notifiche_create: 0 }

  const oggiStrVal = dataStr(oggi)
  const preavvisoLimite = dataStr(aggiungiGiorni(oggi, GIORNI_PREAVVISO_QUOTE))

  let totale = 0
  const daAggiornareInRitardo: string[] = []

  for (const quota of candidate) {
    const scadenza = new Date(quota.mese_competenza)
    scadenza.setDate(10)
    const scadenzaStr = dataStr(scadenza)

    // Fuori dalla finestra utile: né in preavviso né ancora scaduta.
    if (scadenzaStr > preavvisoLimite) continue

    if (scadenzaStr < oggiStrVal && quota.stato === 'da_pagare') {
      daAggiornareInRitardo.push(quota.id)
    }

    const giocatore = (quota.giocatori as unknown) as { nome: string; cognome: string } | null
    const nomeGiocatore = giocatore ? `${giocatore.nome} ${giocatore.cognome}` : 'Giocatore'
    const meseLabel = new Date(quota.mese_competenza).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    const inRitardo = scadenzaStr < oggiStrVal
    const dataFormattata = scadenza.toLocaleDateString('it-IT')

    const destinatari: { id: string; ruolo: string; azione_url: string }[] = []
    if (quota.famiglia_id) destinatari.push({ id: quota.famiglia_id, ruolo: 'famiglia', azione_url: '/dashboard/famiglia/pagamenti' })

    const { data: segretari } = await db
      .from('utenti')
      .select('id')
      .eq('club_id', quota.club_id)
      .eq('ruolo', 'segretario')
    for (const s of segretari ?? []) {
      destinatari.push({ id: s.id, ruolo: 'segretario', azione_url: '/dashboard/segretario/settore-giovanile' })
    }

    for (const dest of destinatari) {
      const { count } = await db
        .from('notifiche_sistema')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', dest.id)
        .eq('tipo', 'quota_arretrata')
        .eq('riferimento_id', quota.id)

      if ((count ?? 0) > 0) continue

      const { error: insErr } = await db.from('notifiche_sistema').insert({
        club_id: quota.club_id,
        destinatario_id: dest.id,
        ruolo_destinatario: dest.ruolo,
        tipo: 'quota_arretrata',
        riferimento_id: quota.id,
        titolo: inRitardo ? `Quota scuola calcio in ritardo — ${nomeGiocatore}` : `Quota scuola calcio in scadenza — ${nomeGiocatore}`,
        messaggio: inRitardo
          ? `La quota di ${meseLabel} di ${nomeGiocatore} (€${Number(quota.importo_mensile).toFixed(2)}) doveva essere pagata entro il ${dataFormattata} e risulta ancora non saldata.`
          : `La quota di ${meseLabel} di ${nomeGiocatore} (€${Number(quota.importo_mensile).toFixed(2)}) scade il ${dataFormattata}.`,
        azione_url: dest.azione_url,
        letta: false,
      })
      if (insErr) console.error('[scadenze-check] Errore insert notifica quota:', insErr.message)
      else totale++
    }
  }

  if (daAggiornareInRitardo.length > 0) {
    await db.from('quote_giovanili').update({ stato: 'in_ritardo', updated_at: new Date().toISOString() }).in('id', daAggiornareInRitardo)
  }

  return { notifiche_create: totale, quote_trovate: candidate.length, marcate_in_ritardo: daAggiornareInRitardo.length }
}

/**
 * Esegue il controllo scadenze per un singolo club, ma solo se non è già
 * stato eseguito oggi (per club) — evitando di ripetere la scansione ad ogni
 * pagina caricata da ogni utente. Pensato per essere chiamato dal layout
 * della dashboard al primo accesso del giorno, come complemento (non
 * sostituto) del cron giornaliero delle 9:00.
 */
export async function controllaScadenzeClubSeNecessario(clubId: string | null | undefined) {
  if (!clubId) return
  const db = createAdminClient()
  const oggiStrVal = dataStr(new Date())

  const { data: stato } = await db
    .from('club_controllo_scadenze')
    .select('ultima_esecuzione')
    .eq('club_id', clubId)
    .maybeSingle()

  if (stato?.ultima_esecuzione === oggiStrVal) return // già eseguito oggi per questo club

  await Promise.all([
    controllaCertificatiInScadenza(db, { clubId }),
    controllaQuoteGiovaniliInScadenza(db, { clubId }),
  ])

  await db.from('club_controllo_scadenze').upsert({ club_id: clubId, ultima_esecuzione: oggiStrVal }, { onConflict: 'club_id' })
}
