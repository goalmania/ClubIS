'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  stagione: string
  presenze_allenamento: number
  presenze_partite: number
  gol: number
  assist: number
  ammonizioni: number
  espulsioni: number
  minuti_totali: number
}

export default function StatisticheGiocatorePage() {
  const [stats,   setStats]   = useState<Stats[]>([])
  const [loading, setLoading] = useState(true)

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
        .from('statistiche_giocatore')
        .select('*')
        .eq('giocatore_id', gioc.id)
        .order('stagione', { ascending: false })

      setStats(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 40 }}>Caricamento...</div>

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', fontSize: 26, letterSpacing: '0.04em', color: 'var(--white)' }}>
          Statistiche
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginTop: 6 }}>
          Riepilogo stagionale
        </div>
      </div>

      {stats.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Nessuna statistica disponibile
        </div>
      )}

      {stats.map(s => (
        <div key={s.stagione} style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', fontSize: 16, color: 'var(--accent)', marginBottom: 20 }}>
            Stagione {s.stagione}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16 }}>
            {[
              { label: 'Pres. allenamenti', val: s.presenze_allenamento },
              { label: 'Pres. partite',     val: s.presenze_partite },
              { label: 'Gol',               val: s.gol },
              { label: 'Assist',            val: s.assist },
              { label: 'Ammonizioni',       val: s.ammonizioni },
              { label: 'Espulsioni',        val: s.espulsioni },
              { label: 'Minuti totali',     val: s.minuti_totali },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, color: 'var(--white)' }}>
                  {item.val}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
