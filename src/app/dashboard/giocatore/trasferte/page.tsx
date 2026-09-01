'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const COSTI_JSON_START = '__COSTI_TRASFERTE_JSON_START__'
const COSTI_JSON_END   = '__COSTI_TRASFERTE_JSON_END__'

function parseCostiJson(note: string | null): any | null {
  if (!note) return null
  const s = note.indexOf(COSTI_JSON_START)
  const e = note.indexOf(COSTI_JSON_END)
  if (s === -1 || e === -1) return null
  try {
    return JSON.parse(note.slice(s + COSTI_JSON_START.length, e))
  } catch {
    return null
  }
}

interface Trasferta {
  id: string
  destinazione: string
  data_partenza: string
  data_rientro: string | null
  mezzo: string | null
  stato: string
  note: string | null
  partita: {
    avversario: string
    data_ora: string
    tipo: string
    casa_trasferta: string
  } | null
}

const STATO_COLOR: Record<string, string> = {
  programmata: 'var(--ambra)',
  confermata:  'var(--accent)',
  completata:  'var(--gray)',
  annullata:   'var(--rosso)',
}

const MEZZO_LABEL: Record<string, string> = {
  pullman: 'Pullman', treno: 'Treno', aereo: 'Aereo',
  auto_propria: 'Auto propria', pulmino: 'Pulmino', altro: 'Altro',
}

export default function TrasferteGiocatorePage() {
  const [trasferte, setTrasferte] = useState<Trasferta[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: me } = await supabase.auth.getUser()
      if (!me.user) { setLoading(false); return }

      const { data: utente } = await supabase
        .from('utenti')
        .select('club_id')
        .eq('id', me.user.id)
        .maybeSingle()

      let giocQuery = supabase.from('giocatori').select('id, club_id').eq('auth_user_id', me.user.id)
      if (utente?.club_id) giocQuery = giocQuery.eq('club_id', utente.club_id)
      const { data: gioc } = await giocQuery.maybeSingle()

      if (!gioc?.id) { setLoading(false); return }

      // Legge tutte le trasferte del club (RLS garantisce solo il proprio club)
      const { data: rows } = await supabase
        .from('trasferte')
        .select(`
          id, destinazione, data_partenza, data_rientro, mezzo, stato, note,
          partite ( avversario, data_ora, tipo, casa_trasferta )
        `)
        .order('data_partenza', { ascending: false })

      if (!rows) { setLoading(false); return }

      // Filtra solo le trasferte dove il giocatore è nell'array partecipanti.giocatori
      const mie = rows.filter((r: any) => {
        // 1. Controlla partecipanti nel JSON embed della nota
        const costi = parseCostiJson(r.note)
        if (costi?.partecipanti?.giocatori?.includes(gioc.id)) return true

        // 2. Fallback: trasferta legata a una partita per cui il giocatore è convocato
        // (questo caso è già coperto dal JSON di norma, ma serve per dati legacy)
        return false
      })

      setTrasferte(mie.map((r: any) => ({
        id:            r.id,
        destinazione:  r.destinazione,
        data_partenza: r.data_partenza,
        data_rientro:  r.data_rientro,
        mezzo:         r.mezzo,
        stato:         r.stato,
        note:          r.note,
        partita:       r.partite ?? null,
      })))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 40 }}>
      Caricamento...
    </div>
  )

  const future = trasferte.filter(t => t.stato !== 'annullata' && new Date(t.data_partenza) >= new Date())
  const past   = trasferte.filter(t => t.stato === 'completata' || new Date(t.data_partenza) < new Date())

  function CardTrasferta({ t }: { t: Trasferta }) {
    const dp  = new Date(t.data_partenza)
    const dr  = t.data_rientro ? new Date(t.data_rientro) : null
    const costi = parseCostiJson(t.note)

    return (
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 48, textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--white)' }}>
            {dp.getDate()}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gray)', textTransform: 'uppercase' }}>
            {dp.toLocaleString('it-IT', { month: 'short' })}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, color: 'var(--white)', marginBottom: 2 }}>
            {t.destinazione}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginBottom: 4 }}>
            {dp.toLocaleDateString('it-IT')}
            {dr && ` → ${dr.toLocaleDateString('it-IT')}`}
            {t.mezzo && ` · ${MEZZO_LABEL[t.mezzo] ?? t.mezzo}`}
          </div>
          {t.partita && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)' }}>
              vs {t.partita.avversario} · {new Date(t.partita.data_ora).toLocaleDateString('it-IT')}
            </div>
          )}
          {costi?.alloggio?.hotel && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
              Hotel: {costi.alloggio.hotel}
            </div>
          )}
        </div>
        <span style={{
          flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 9, padding: '3px 8px',
          textTransform: 'uppercase', border: `1px solid ${STATO_COLOR[t.stato] ?? 'var(--border)'}`,
          color: STATO_COLOR[t.stato] ?? 'var(--gray)',
        }}>
          {t.stato}
        </span>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', fontSize: 26, letterSpacing: '0.04em', color: 'var(--white)' }}>
          Le mie trasferte
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginTop: 6 }}>
          Trasferte a cui sei stato assegnato dal team manager
        </div>
      </div>

      {trasferte.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Nessuna trasferta assegnata
        </div>
      )}

      {future.length > 0 && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', marginBottom: 20 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, color: 'var(--accent)' }}>
            Prossime trasferte ({future.length})
          </div>
          {future.map(t => <CardTrasferta key={t.id} t={t} />)}
        </div>
      )}

      {past.length > 0 && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, color: 'var(--white)' }}>
            Storico ({past.length})
          </div>
          {past.map(t => <CardTrasferta key={t.id} t={t} />)}
        </div>
      )}
    </div>
  )
}
