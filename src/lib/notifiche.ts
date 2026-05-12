import type { SupabaseClient } from '@supabase/supabase-js'

export type TipoNotifica =
  | 'alert_sistema'
  | 'scadenza_certificato'
  | 'scadenza_contratto'
  | 'quota_arretrata'
  | 'convocazione'
  | 'messaggio'
  | 'abbonamento_cis'

export type RuoloDestinatario =
  | 'presidente'
  | 'segretario'
  | 'ds'
  | 'team_manager'
  | 'allenatore'
  | 'medico'
  | 'osservatore'
  | 'ufficio_stampa'
  | 'custode'
  | 'giocatore'
  | 'famiglia'

interface PayloadNotifica {
  club_id:             string
  destinatario_id:     string
  ruolo_destinatario:  RuoloDestinatario
  tipo?:               TipoNotifica
  titolo:              string
  messaggio:           string
  azione_url?:         string | null
  riferimento_id?:     string | null
}

/** Inserisce una singola notifica interna per un utente specifico. */
export async function notificaUtente(
  supabase: SupabaseClient,
  payload: PayloadNotifica,
) {
  const { error } = await supabase.from('notifiche_sistema').insert({
    club_id:            payload.club_id,
    destinatario_id:    payload.destinatario_id,
    ruolo_destinatario: payload.ruolo_destinatario,
    tipo:               payload.tipo ?? 'alert_sistema',
    titolo:             payload.titolo,
    messaggio:          payload.messaggio,
    azione_url:         payload.azione_url ?? null,
    riferimento_id:     payload.riferimento_id ?? null,
    letta:              false,
  })
  return error
}

/**
 * Inserisce notifiche per tutti gli utenti del club che hanno il ruolo indicato.
 * Esclude opzionalmente un utente (es. il mittente).
 */
export async function notificaRuolo(
  supabase: SupabaseClient,
  {
    club_id,
    ruolo,
    tipo = 'alert_sistema',
    titolo,
    messaggio,
    azione_url = null,
    riferimento_id = null,
    escludi_utente_id,
  }: {
    club_id:             string
    ruolo:               RuoloDestinatario
    tipo?:               TipoNotifica
    titolo:              string
    messaggio:           string
    azione_url?:         string | null
    riferimento_id?:     string | null
    escludi_utente_id?:  string
  },
) {
  const query = supabase
    .from('utenti')
    .select('id')
    .eq('club_id', club_id)
    .eq('ruolo', ruolo)
    .eq('attivo', true)

  if (escludi_utente_id) query.neq('id', escludi_utente_id)

  const { data: utenti } = await query
  if (!utenti?.length) return

  const records = utenti.map((u: { id: string }) => ({
    club_id,
    destinatario_id:    u.id,
    ruolo_destinatario: ruolo,
    tipo,
    titolo,
    messaggio,
    azione_url,
    riferimento_id,
    letta: false,
  }))

  await supabase.from('notifiche_sistema').insert(records)
}

/**
 * Inserisce notifiche per più ruoli contemporaneamente.
 * Usa notificaRuolo internamente per ogni ruolo.
 */
export async function notificaRuoli(
  supabase: SupabaseClient,
  {
    club_id,
    ruoli,
    tipo = 'alert_sistema',
    titolo,
    messaggio,
    azione_url = null,
    riferimento_id = null,
    escludi_utente_id,
  }: {
    club_id:             string
    ruoli:               RuoloDestinatario[]
    tipo?:               TipoNotifica
    titolo:              string
    messaggio:           string
    azione_url?:         string | null
    riferimento_id?:     string | null
    escludi_utente_id?:  string
  },
) {
  await Promise.all(
    ruoli.map(ruolo =>
      notificaRuolo(supabase, {
        club_id, ruolo, tipo, titolo, messaggio,
        azione_url, riferimento_id, escludi_utente_id,
      })
    )
  )
}
