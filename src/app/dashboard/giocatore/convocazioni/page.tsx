'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Convocazione {
  id: string
  partita: {
    id: string
    avversario: string
    data_ora: string
    tipo: string
    casa_trasferta: string
    campo: string | null
    gol_fatti: number | null
    gol_subiti: number | null
    stato: string
  }
  stato_risposta: string
  titolare: boolean | null
  minuti_giocati: number | null
}

const CASA_TRASFERTA_LABEL: Record<string, string> = {
  casa: 'Casa', trasferta: 'Trasferta', neutro: 'Campo neutro',
}

export default function ConvocazioniPage() {
  const [conv, setConv]       = useState<Convocazione[]>([])
  const [loading, setLoading] = useState(true)
  const [giocId, setGiocId]   = useState<string | null>(null)

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
      setGiocId(gioc.id)

      const { data } = await supabase
        .from('convocazioni')
        .select(`
          id, stato_risposta, titolare, minuti_giocati,
          partite ( id, avversario, data_ora, tipo, casa_trasferta, campo, gol_fatti, gol_subiti, stato )
        `)
        .eq('giocatore_id', gioc.id)
        .order('created_at', { ascending: false })

      setConv((data ?? []).map((c: any) => ({
        id: c.id,
        stato_risposta: c.stato_risposta,
        titolare: c.titolare,
        minuti_giocati: c.minuti_giocati,
        partita: c.partite,
      })))
      setLoading(false)
    }
    load()
  }, [])

  async function rispondi(id: string, risposta: 'confermato' | 'indisponibile') {
    const supabase = createClient()
    await supabase
      .from('convocazioni')
      .update({ stato_risposta: risposta, risposta_at: new Date().toISOString() })
      .eq('id', id)
    setConv(prev => prev.map(c => c.id === id ? { ...c, stato_risposta: risposta } : c))
  }

  if (loading) return (
    <div style={{ color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 40 }}>Caricamento...</div>
  )

  const future = conv.filter(c => c.partita && new Date(c.partita.data_ora) >= new Date())
  const past   = conv.filter(c => c.partita && new Date(c.partita.data_ora) <  new Date())

  function CardConvocazione({ c, showActions }: { c: Convocazione; showActions: boolean }) {
    const p = c.partita
    if (!p) return null
    const data = new Date(p.data_ora)
    const risultato = p.gol_fatti !== null && p.gol_subiti !== null
      ? `${p.gol_fatti} - ${p.gol_subiti}` : null

    return (
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--white)' }}>{data.getDate()}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gray)', textTransform: 'uppercase' }}>
            {data.toLocaleString('it-IT', { month: 'short' })}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, color: 'var(--white)' }}>
            vs {p.avversario}
            {risultato && <span style={{ marginLeft: 10, color: 'var(--accent)', fontWeight: 900 }}>{risultato}</span>}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray)', marginTop: 2 }}>
            {CASA_TRASFERTA_LABEL[p.casa_trasferta]} · {data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            {p.campo && ` · ${p.campo}`}
          </div>
          {c.titolare && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', marginTop: 2 }}>
              ⭐ Titolare {c.minuti_giocati !== null ? `· ${c.minuti_giocati}'` : ''}
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          {c.stato_risposta === 'confermato' && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', background: 'rgba(200,240,0,0.08)', padding: '3px 8px', border: '1px solid rgba(200,240,0,0.2)' }}>✓ CONFERMATO</span>
          )}
          {c.stato_risposta === 'indisponibile' && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--rosso)', background: 'rgba(255,60,60,0.08)', padding: '3px 8px', border: '1px solid rgba(255,60,60,0.2)' }}>✕ NON DISPONIBILE</span>
          )}
          {c.stato_risposta === 'in_attesa' && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ambra)', padding: '3px 8px', border: '1px solid var(--border)' }}>IN ATTESA</span>
          )}
          {showActions && c.stato_risposta === 'in_attesa' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm btn-primary" style={{ fontSize: 10 }} onClick={() => rispondi(c.id, 'confermato')}>Confermo</button>
              <button className="btn btn-sm btn-ghost" style={{ fontSize: 10, color: 'var(--rosso)' }} onClick={() => rispondi(c.id, 'indisponibile')}>Non disponibile</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', fontSize: 26, letterSpacing: '0.04em', color: 'var(--white)' }}>
          Convocazioni
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', marginTop: 6 }}>
          Le tue convocazioni per le partite
        </div>
      </div>

      {future.length > 0 && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', marginBottom: 20 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, color: 'var(--accent)' }}>
            Prossime partite ({future.length})
          </div>
          {future.map(c => <CardConvocazione key={c.id} c={c} showActions={true} />)}
        </div>
      )}

      {past.length > 0 && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, color: 'var(--white)' }}>
            Storico ({past.length})
          </div>
          {past.map(c => <CardConvocazione key={c.id} c={c} showActions={false} />)}
        </div>
      )}

      {conv.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Nessuna convocazione trovata
        </div>
      )}
    </div>
  )
}
