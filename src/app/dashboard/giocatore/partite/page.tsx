'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Partita {
  id: string
  avversario: string
  data_ora: string
  tipo: string
  casa_trasferta: string
  campo: string | null
  gol_fatti: number | null
  gol_subiti: number | null
  stato: string
  convocazione: { stato_risposta: string; titolare: boolean | null; minuti_giocati: number | null } | null
}

const TIPO_LABEL: Record<string, string> = { campionato: 'Campionato', coppa: 'Coppa', amichevole: 'Amichevole', playoff: 'Playoff' }

export default function PartiteGiocatorePage() {
  const [partite, setPartite] = useState<Partita[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro,  setFiltro]  = useState<'tutte' | 'convocato'>('tutte')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: me } = await supabase.auth.getUser()
      if (!me.user) return

      const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', me.user.id).maybeSingle()
      const clubId = utente?.club_id

      const { data: gioc } = await supabase
        .from('giocatori')
        .select('id')
        .eq('auth_user_id', me.user.id)
        .maybeSingle()
      if (!gioc) { setLoading(false); return }

      const { data: conv } = await supabase
        .from('convocazioni')
        .select('partita_id, stato_risposta, titolare, minuti_giocati')
        .eq('giocatore_id', gioc.id)
      const convMap: Record<string, any> = {}
      for (const c of conv ?? []) convMap[(c as any).partita_id] = c

      const query = supabase
        .from('partite')
        .select('id, avversario, data_ora, tipo, casa_trasferta, campo, gol_fatti, gol_subiti, stato')
        .order('data_ora', { ascending: false })
        .limit(50)
      const { data: parts } = clubId ? await query.eq('club_id', clubId) : await query

      setPartite((parts ?? []).map((p: any) => ({
        ...p,
        convocazione: convMap[p.id] ?? null,
      })))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 40 }}>Caricamento...</div>

  const list = filtro === 'convocato' ? partite.filter(p => p.convocazione) : partite
  const gocate = partite.filter(p => p.convocazione && p.stato === 'giocata')
  const titolari = gocate.filter(p => p.convocazione?.titolare).length
  const minuti = gocate.reduce((s, p) => s + (p.convocazione?.minuti_giocati ?? 0), 0)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', fontSize: 26, letterSpacing: '0.04em', color: 'var(--white)' }}>
          Partite
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Partite giocate', val: gocate.length },
          { label: 'Da titolare', val: titolari },
          { label: 'Minuti totali', val: minuti },
        ].map(s => (
          <div key={s.label} style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '16px 20px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--accent)' }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['tutte', 'convocato'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)} className={`btn btn-sm ${filtro === f ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 11 }}>
            {f === 'tutte' ? 'Tutte' : 'Solo mie convocazioni'}
          </button>
        ))}
      </div>

      <div style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        {list.map(p => {
          const data = new Date(p.data_ora)
          const ris = p.gol_fatti !== null && p.gol_subiti !== null ? `${p.gol_fatti} - ${p.gol_subiti}` : null
          return (
            <div key={p.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--white)' }}>{data.getDate()}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gray)', textTransform: 'uppercase' }}>{data.toLocaleString('it-IT', { month: 'short' })}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, color: 'var(--white)' }}>
                  vs {p.avversario}
                  {ris && <span style={{ marginLeft: 10, color: 'var(--accent)' }}>{ris}</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
                  {TIPO_LABEL[p.tipo] ?? p.tipo} · {p.casa_trasferta === 'casa' ? 'Casa' : 'Trasferta'}
                  {p.campo && ` · ${p.campo}`}
                </div>
              </div>
              {p.convocazione && (
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {p.convocazione.titolare && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)' }}>⭐ Titolare</div>
                  )}
                  {p.convocazione.minuti_giocati !== null && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)' }}>{p.convocazione.minuti_giocati}'</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {list.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            Nessuna partita trovata
          </div>
        )}
      </div>
    </div>
  )
}
