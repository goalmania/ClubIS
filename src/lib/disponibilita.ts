import { formatData } from '@/lib/helpers'

/* ─── Tipi ───────────────────────────────────────────────────── */

export type StatoDisponibilita =
  | 'disponibile'
  | 'squalificato'
  | 'infortunato'
  | 'in_recupero'
  | 'certificato_scaduto'
  | 'non_tesserato'
  | 'diffidato'  // disponibile ma a rischio alla prossima ammonizione

export interface DisponibilitaGiocatore {
  giocatore_id:    string
  nome:            string
  cognome:         string
  ruolo_principale: string | null
  numero_maglia:   number | null
  stato:           StatoDisponibilita
  motivi:          string[]  // motivi di indisponibilità
  alert:           string[]  // warning non bloccanti
  dati: {
    squalifica?: {
      giornate_rimanenti:  number
      comunicato:          string
      scade_dopo_partita:  boolean  // true = torna disponibile dopo questa gara
    }
    infortunio?: {
      tipo:                   string
      data_rientro_prevista:  string | null
      giorni_rimanenti:       number | null
    }
    certificato?: {
      scaduto_il:    string
      giorni_scaduto: number
    }
    diffida?: {
      n_ammonizioni:        number
      soglia:               number
      ammonizioni_mancanti: number
    }
  }
}

/* ─── Funzione principale ────────────────────────────────────── */

export async function getDisponibilitaSquadra(
  supabase: any,
  clubId: string,
  _partitaId?: string,
): Promise<DisponibilitaGiocatore[]> {
  const oggi   = new Date().toISOString().split('T')[0]
  const in30g  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  // 1. Tesserati attivi
  const { data: tesserati } = await supabase
    .from('tesseramenti')
    .select('giocatore_id, numero_maglia, giocatori(id, nome, cognome, ruolo_principale)')
    .eq('club_id', clubId)
    .eq('stato', 'attivo')

  if (!tesserati || tesserati.length === 0) return []

  const gIds = tesserati.map((t: any) => t.giocatore_id)

  // 2–5: Fetch parallelo di tutti i dati necessari
  const [
    { data: squalifiche },
    { data: infortuni },
    { data: certificati },
    { data: diffide },
  ] = await Promise.all([
    supabase
      .from('squalifiche')
      .select('giocatore_id, giornate_rimanenti, giornate_squalifica, comunicato_numero, comunicato_data, tipo_provvedimento')
      .eq('club_id', clubId)
      .gt('giornate_rimanenti', 0)
      .in('giocatore_id', gIds),

    supabase
      .from('infortuni')
      .select('giocatore_id, tipo, gravita, data_rientro_prevista, stato')
      .eq('club_id', clubId)
      .is('data_rientro_effettiva', null)
      .in('giocatore_id', gIds),

    supabase
      .from('certificati_medici')
      .select('giocatore_id, data_scadenza')
      .eq('club_id', clubId)
      .order('data_scadenza', { ascending: false }),

    supabase
      .from('diffide')
      .select('giocatore_id, n_ammonizioni, soglia_diffida, soglia_squalifica')
      .eq('club_id', clubId)
      .in('giocatore_id', gIds),
  ])

  // Certificato: tieni solo l'ultimo per giocatore
  const certMap = new Map<string, string>()
  certificati?.forEach((c: any) => {
    if (!certMap.has(c.giocatore_id)) certMap.set(c.giocatore_id, c.data_scadenza)
  })

  // Mappe O(1)
  const sqMap   = new Map<string, any>(squalifiche?.map((s: any) => [s.giocatore_id, s]) ?? [])
  const infMap  = new Map<string, any>(infortuni?.map((i: any) => [i.giocatore_id, i]) ?? [])
  const diffMap = new Map<string, any>(diffide?.map((d: any) => [d.giocatore_id, d]) ?? [])

  // 6. Costruisci disponibilità per ogni giocatore
  return tesserati.map((t: any) => {
    const g                                    = t.giocatori
    const id                                   = g.id
    const motivi: string[]                     = []
    const alert: string[]                      = []
    const dati: DisponibilitaGiocatore['dati'] = {}
    let stato: StatoDisponibilita              = 'disponibile'

    /* ── Squalifica ──────────────────────────────────────────── */
    const sq = sqMap.get(id)
    if (sq && sq.giornate_rimanenti > 0) {
      stato = 'squalificato'
      const gg  = sq.giornate_rimanenti
      const com = sq.comunicato_numero ? `Com. ${sq.comunicato_numero}` : 'comunicato FIGC'
      motivi.push(
        `Squalificato — ${gg} giornata${gg > 1 ? 'e' : ''} rimanente${gg > 1 ? 'i' : ''}`,
      )
      dati.squalifica = {
        giornate_rimanenti: gg,
        comunicato:         com,
        scade_dopo_partita: gg === 1,
      }
    }

    /* ── Infortunio ──────────────────────────────────────────── */
    const inf = infMap.get(id)
    if (inf) {
      if (stato === 'disponibile') {
        // Determina in_recupero: rientro previsto entro 7 giorni
        const gg = inf.data_rientro_prevista
          ? Math.ceil((new Date(inf.data_rientro_prevista).getTime() - Date.now()) / 86400000)
          : null
        stato = gg !== null && gg >= 0 && gg <= 7 ? 'in_recupero' : 'infortunato'
      }
      const gg = inf.data_rientro_prevista
        ? Math.ceil((new Date(inf.data_rientro_prevista).getTime() - Date.now()) / 86400000)
        : null
      const prefisso = stato === 'in_recupero' ? 'In recupero' : 'Infortunato'
      motivi.push(
        `${prefisso} — ${inf.tipo}` +
        (inf.gravita ? ` (${inf.gravita})` : '') +
        (gg !== null ? ` · rientro${gg <= 0 ? ' imminente' : ` tra ${gg}gg`}` : ''),
      )
      dati.infortunio = {
        tipo:                  inf.tipo,
        data_rientro_prevista: inf.data_rientro_prevista,
        giorni_rimanenti:      gg,
      }
    }

    /* ── Certificato medico ──────────────────────────────────── */
    const certScadenza = certMap.get(id)
    if (!certScadenza) {
      if (stato === 'disponibile') stato = 'certificato_scaduto'
      motivi.push('Nessun certificato medico — non eleggibile')
      dati.certificato = { scaduto_il: 'mai', giorni_scaduto: Infinity }
    } else if (certScadenza < oggi) {
      if (stato === 'disponibile') stato = 'certificato_scaduto'
      const giorniScaduto = Math.floor((Date.now() - new Date(certScadenza).getTime()) / 86400000)
      motivi.push(`Certificato scaduto il ${formatData(certScadenza)} (da ${giorniScaduto}gg)`)
      dati.certificato = { scaduto_il: certScadenza, giorni_scaduto: giorniScaduto }
    } else if (certScadenza <= in30g) {
      alert.push(`⚠️ Certificato in scadenza il ${formatData(certScadenza)}`)
    }

    /* ── Diffida ─────────────────────────────────────────────── */
    const diff = diffMap.get(id)
    if (diff) {
      const mancanti = diff.soglia_diffida - diff.n_ammonizioni
      if (mancanti <= 1 && stato === 'disponibile') {
        stato = 'diffidato'
        alert.push(
          `⚡ Diffidato — ${diff.n_ammonizioni}a ammonizione su ${diff.soglia_diffida}` +
          ` (ancora ${mancanti} alla squalifica)`,
        )
        dati.diffida = {
          n_ammonizioni:        diff.n_ammonizioni,
          soglia:               diff.soglia_diffida,
          ammonizioni_mancanti: mancanti,
        }
      }
    }

    return {
      giocatore_id:     id,
      nome:             g.nome,
      cognome:          g.cognome,
      ruolo_principale: g.ruolo_principale,
      numero_maglia:    t.numero_maglia,
      stato,
      motivi,
      alert,
      dati,
    } satisfies DisponibilitaGiocatore
  })
}

/* ─── Contatori ──────────────────────────────────────────────── */

export function countByStato(lista: DisponibilitaGiocatore[]) {
  return {
    disponibili:   lista.filter(g => g.stato === 'disponibile').length,
    diffidati:     lista.filter(g => g.stato === 'diffidato').length,
    squalificati:  lista.filter(g => g.stato === 'squalificato').length,
    infortunati:   lista.filter(g => g.stato === 'infortunato' || g.stato === 'in_recupero').length,
    cert_scaduto:  lista.filter(g => g.stato === 'certificato_scaduto').length,
    indisponibili: lista.filter(g => !['disponibile', 'diffidato'].includes(g.stato)).length,
  }
}
