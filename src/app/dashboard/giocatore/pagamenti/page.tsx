'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Quota {
  id: string
  stagione: string
  importo_totale: number
  importo_pagato: number
  stato: string
  scadenza: string | null
}

interface Pagamento {
  id: string
  quota_id: string
  importo: number
  metodo: string
  data_pagamento: string
}

const STATO_COLOR: Record<string, string> = {
  pagato: 'var(--accent)',
  parziale: 'var(--ambra)',
  non_pagato: 'var(--rosso)',
  rimborsato: 'var(--gray)',
  esonerato: 'var(--gray)',
}

const METODO_LABEL: Record<string, string> = {
  contanti: 'Contanti', bonifico: 'Bonifico', stripe: 'Carta',
  paypal: 'PayPal', assegno: 'Assegno',
}

export default function PagamentiGiocatorePage() {
  const [quote,     setQuote]     = useState<Quota[]>([])
  const [pagamenti, setPagamenti] = useState<Pagamento[]>([])
  const [loading,   setLoading]   = useState(true)
  const [espansa,   setEspansa]   = useState<string | null>(null)

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

      const { data: q } = await supabase
        .from('quote_iscrizione')
        .select('id, stagione, importo_totale, importo_pagato, stato, scadenza')
        .eq('giocatore_id', gioc.id)
        .order('stagione', { ascending: false })

      const { data: p } = await supabase
        .from('pagamenti')
        .select('id, quota_id, importo, metodo, data_pagamento')
        .in('quota_id', (q ?? []).map((x: any) => x.id))
        .order('data_pagamento', { ascending: false })

      setQuote(q ?? [])
      setPagamenti(p ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 40 }}>Caricamento...</div>
  )

  const totaleDovuto  = quote.reduce((s, q) => s + q.importo_totale, 0)
  const totalePagato  = quote.reduce((s, q) => s + q.importo_pagato, 0)
  const totaleArretr  = quote.filter(q => q.stato === 'non_pagato' || q.stato === 'parziale').reduce((s, q) => s + (q.importo_totale - q.importo_pagato), 0)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', fontSize: 26, letterSpacing: '0.04em', color: 'var(--white)' }}>
          Le mie quote
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginTop: 6 }}>
          Storico pagamenti e rate
        </div>
      </div>

      {/* Riepilogo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Totale dovuto',  val: `€ ${totaleDovuto.toFixed(2)}`,  color: 'var(--white)' },
          { label: 'Pagato',         val: `€ ${totalePagato.toFixed(2)}`,  color: 'var(--accent)' },
          { label: 'Da saldare',     val: `€ ${totaleArretr.toFixed(2)}`,  color: totaleArretr > 0 ? 'var(--rosso)' : 'var(--gray)' },
        ].map(s => (
          <div key={s.label} style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '16px 20px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Lista quote */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, color: 'var(--white)' }}>
          Quote iscrizione
        </div>
        {quote.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            Nessuna quota trovata
          </div>
        )}
        {quote.map(q => {
          const perc = q.importo_totale > 0 ? Math.min(100, Math.round((q.importo_pagato / q.importo_totale) * 100)) : 100
          const pagQ = pagamenti.filter(p => p.quota_id === q.id)
          const open = espansa === q.id

          return (
            <div key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <div
                onClick={() => setEspansa(open ? null : q.id)}
                style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, color: 'var(--white)' }}>
                      Stagione {q.stagione}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 6px', color: STATO_COLOR[q.stato] ?? 'var(--gray)', border: `1px solid ${STATO_COLOR[q.stato] ?? 'var(--border)'}`, textTransform: 'uppercase' }}>
                      {q.stato.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {/* Barra progresso */}
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 2, height: 4, marginBottom: 4 }}>
                    <div style={{ width: `${perc}%`, height: '100%', background: STATO_COLOR[q.stato] ?? 'var(--accent)', borderRadius: 2, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)' }}>
                    € {q.importo_pagato.toFixed(2)} / € {q.importo_totale.toFixed(2)}
                    {q.scadenza && ` · Scade: ${new Date(q.scadenza).toLocaleDateString('it-IT')}`}
                  </div>
                </div>
                <div style={{ color: 'var(--gray)', fontSize: 12, flexShrink: 0 }}>{open ? '▲' : '▼'}</div>
              </div>

              {open && pagQ.length > 0 && (
                <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, paddingTop: 12 }}>
                    Pagamenti registrati
                  </div>
                  {pagQ.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--white)' }}>
                        {new Date(p.data_pagamento).toLocaleDateString('it-IT')} · {METODO_LABEL[p.metodo] ?? p.metodo}
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>
                        € {p.importo.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {open && pagQ.length === 0 && (
                <div style={{ padding: '8px 18px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)' }}>
                  Nessun pagamento registrato
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
