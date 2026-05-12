'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Valutazione {
  id: string
  data: string
  tecnica: number | null
  tattica: number | null
  fisico: number | null
  mentale: number | null
  note: string | null
  allenatore: { nome: string; cognome: string } | null
}

function Indicatore({ label, val }: { label: string; val: number | null }) {
  if (val === null) return null
  const perc = (val / 10) * 100
  const color = val >= 8 ? 'var(--accent)' : val >= 6 ? 'var(--ambra)' : 'var(--rosso)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color }}>{val}/10</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 2, height: 4 }}>
        <div style={{ width: `${perc}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
    </div>
  )
}

export default function ValutazioniPage() {
  const [valutazioni, setValutazioni] = useState<Valutazione[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: me } = await supabase.auth.getUser()
      if (!me.user) return

      const { data: gioc } = await supabase
        .from('giocatori')
        .select('id')
        .eq('auth_user_id', me.user.id)
        .maybeSingle()

      if (!gioc) { setLoading(false); return }

      const { data } = await supabase
        .from('valutazioni_tecniche')
        .select('id, data, tecnica, tattica, fisico, mentale, note, utenti!allenatore_id(nome, cognome)')
        .eq('giocatore_id', gioc.id)
        .eq('visibile_famiglia', true)
        .order('data', { ascending: false })

      setValutazioni((data ?? []).map((v: any) => ({
        ...v,
        allenatore: v.utenti ?? null,
      })))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 40 }}>Caricamento...</div>
  )

  const media = (campo: keyof Pick<Valutazione, 'tecnica'|'tattica'|'fisico'|'mentale'>) => {
    const vals = valutazioni.map(v => v[campo]).filter((x): x is number => x !== null)
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—'
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', fontSize: 26, letterSpacing: '0.04em', color: 'var(--white)' }}>
          Valutazioni
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginTop: 6 }}>
          Feedback dello staff tecnico
        </div>
      </div>

      {/* Medie generali */}
      {valutazioni.length > 0 && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, color: 'var(--accent)', marginBottom: 16 }}>
            Media generale
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {[
              { label: 'Tecnica', val: media('tecnica') },
              { label: 'Tattica', val: media('tattica') },
              { label: 'Fisico',  val: media('fisico') },
              { label: 'Mentale', val: media('mentale') },
            ].map(m => (
              <div key={m.label}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--white)' }}>{m.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista valutazioni */}
      {valutazioni.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Nessuna valutazione disponibile
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {valutazioni.map(v => (
          <div key={v.id} style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '18px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, color: 'var(--white)' }}>
                  {new Date(v.data).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                {v.allenatore && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
                    {v.allenatore.nome} {v.allenatore.cognome}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <Indicatore label="Tecnica" val={v.tecnica} />
              <Indicatore label="Tattica" val={v.tattica} />
              <Indicatore label="Fisico"  val={v.fisico} />
              <Indicatore label="Mentale" val={v.mentale} />
            </div>
            {v.note && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderLeft: '2px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>
                {v.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
