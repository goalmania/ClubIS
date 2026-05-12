'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Sessione {
  id: string
  data_ora: string
  tipologia: string
  obiettivo: string | null
  campo: string | null
  durata_minuti: number
  stato: string
  presente: boolean | null
}

const TIPO_LABEL: Record<string, string> = {
  tecnico: 'Tecnico', tattico: 'Tattico', fisico: 'Fisico',
  partitella: 'Partitella', recupero: 'Recupero', video: 'Video',
}

export default function AllenamentiPage() {
  const [sessioni, setSessioni] = useState<Sessione[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: me } = await supabase.auth.getUser()
      if (!me.user) return

      const { data: gioc } = await supabase
        .from('giocatori')
        .select('id, squadra_id:tesseramenti(squadra_id)')
        .eq('auth_user_id', me.user.id)
        .maybeSingle()

      if (!gioc) { setLoading(false); return }

      // Carica sessioni delle ultime 8 settimane
      const da = new Date(Date.now() - 56 * 86400000).toISOString()
      const { data: sess } = await supabase
        .from('sessioni_allenamento')
        .select('id, data_ora, tipologia, obiettivo, campo, durata_minuti, stato')
        .gte('data_ora', da)
        .order('data_ora', { ascending: false })

      // Carica presenze del giocatore
      const sessIds = (sess ?? []).map((s: any) => s.id)
      let presenzeMap: Record<string, boolean> = {}
      if (sessIds.length > 0) {
        const { data: pres } = await supabase
          .from('presenze')
          .select('sessione_id, presente')
          .eq('giocatore_id', gioc.id)
          .in('sessione_id', sessIds)
        for (const p of pres ?? []) {
          presenzeMap[(p as any).sessione_id] = (p as any).presente
        }
      }

      setSessioni((sess ?? []).map((s: any) => ({
        ...s,
        presente: presenzeMap[s.id] ?? null,
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

  const presenze = sessioni.filter(s => s.presente === true).length
  const assenze  = sessioni.filter(s => s.presente === false).length
  const effettuate = sessioni.filter(s => s.stato === 'effettuato').length
  const percPresenza = effettuate > 0 ? Math.round((presenze / effettuate) * 100) : 0

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', fontSize: 26, letterSpacing: '0.04em', color: 'var(--white)' }}>
          Allenamenti
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginTop: 6 }}>
          Ultime 8 settimane
        </div>
      </div>

      {/* Statistiche rapide */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Presenze', val: presenze, color: 'var(--accent)' },
          { label: 'Assenze', val: assenze, color: 'var(--rosso)' },
          { label: '% Presenze', val: `${percPresenza}%`, color: 'var(--white)' },
        ].map(s => (
          <div key={s.label} style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '16px 20px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Lista sessioni */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, color: 'var(--white)' }}>
          Storico sessioni ({sessioni.length})
        </div>
        {sessioni.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            Nessuna sessione trovata
          </div>
        )}
        {sessioni.map(s => {
          const data = new Date(s.data_ora)
          const statoPres = s.stato !== 'effettuato' ? null : s.presente
          return (
            <div key={s.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--white)' }}>{data.getDate()}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gray)', textTransform: 'uppercase' }}>
                  {data.toLocaleString('it-IT', { month: 'short' })}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, color: 'var(--white)' }}>
                  {TIPO_LABEL[s.tipologia] ?? s.tipologia}
                  {s.campo && <span style={{ fontWeight: 400, color: 'var(--gray)', marginLeft: 8 }}>· {s.campo}</span>}
                </div>
                {s.obiettivo && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>{s.obiettivo}</div>
                )}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
                  {data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} · {s.durata_minuti} min
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                {statoPres === true && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', background: 'rgba(200,240,0,0.08)', padding: '3px 8px', border: '1px solid rgba(200,240,0,0.2)' }}>✓ PRESENTE</span>
                )}
                {statoPres === false && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--rosso)', background: 'rgba(255,60,60,0.08)', padding: '3px 8px', border: '1px solid rgba(255,60,60,0.2)' }}>✕ ASSENTE</span>
                )}
                {statoPres === null && s.stato === 'programmato' && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', padding: '3px 8px', border: '1px solid var(--border)' }}>PROGRAMMATO</span>
                )}
                {s.stato === 'annullato' && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ambra)', padding: '3px 8px', border: '1px solid var(--border)' }}>ANNULLATO</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
