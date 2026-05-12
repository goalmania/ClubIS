'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export default function PresidenteFinanzePage() {
  const supabase = createClient()
  const [clubId, setClubId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [totEntrate, setTotEntrate] = useState(0)
  const [totUscite, setTotUscite] = useState(0)
  const [quoteArretrate, setQuoteArretrate] = useState(0)
  const [quotePagate, setQuotePagate] = useState(0)
  const [catEntrate, setCatEntrate] = useState<Record<string, number>>({})
  const [catUscite, setCatUscite] = useState<Record<string, number>>({})

  // Carica club_id una sola volta
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('utenti').select('club_id').eq('id', user.id).single()
        .then(({ data }) => { if (data) setClubId(data.club_id) })
    })
  }, [])

  useEffect(() => { if (clubId) load(clubId) }, [clubId])

  // Realtime: si aggiorna quando prima_nota o quote_iscrizione cambiano nel club
  useEffect(() => {
    if (!clubId) return
    const channel = supabase
      .channel(`presidente_finanze:${clubId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'prima_nota',
        filter: `club_id=eq.${clubId}`,
      }, () => load(clubId))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'quote_iscrizione',
        filter: `club_id=eq.${clubId}`,
      }, () => load(clubId))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clubId])

  async function load(cid: string) {
    setLoading(true)
    const oggi = new Date()
    const mesi = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1)
      mesi.push(d.toISOString().slice(0, 7))
    }

    const [{ data: movimenti }, { data: quote }] = await Promise.all([
      supabase
        .from('prima_nota')
        .select('tipo, importo, data, categoria')
        .eq('club_id', cid)
        .gte('data', `${mesi[0]}-01`)
        .order('data', { ascending: false }),
      supabase
        .from('quote_iscrizione')
        .select('importo_totale, importo_pagato, stato')
        .eq('club_id', cid),
    ])

    const entrate = movimenti?.filter(m => m.tipo === 'entrata').reduce((s, m) => s + Number(m.importo), 0) ?? 0
    const uscite  = movimenti?.filter(m => m.tipo === 'uscita').reduce((s, m) => s + Number(m.importo), 0) ?? 0

    const ce: Record<string, number> = {}
    const cu: Record<string, number> = {}
    movimenti?.forEach(m => {
      if (m.tipo === 'entrata') ce[m.categoria] = (ce[m.categoria] ?? 0) + Number(m.importo)
      else cu[m.categoria] = (cu[m.categoria] ?? 0) + Number(m.importo)
    })

    setTotEntrate(entrate)
    setTotUscite(uscite)
    setCatEntrate(ce)
    setCatUscite(cu)
    setQuotePagate(quote?.filter(q => q.stato === 'pagato').reduce((s, q) => s + Number(q.importo_pagato), 0) ?? 0)
    setQuoteArretrate(quote?.filter(q => q.stato !== 'pagato' && q.stato !== 'esonerato').reduce((s, q) => s + (Number(q.importo_totale) - Number(q.importo_pagato)), 0) ?? 0)
    setLoading(false)
  }

  const saldo = totEntrate - totUscite

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Caricamento…</div>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Finanze</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>Ultimi 6 mesi</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { l: 'Entrate totali',   v: fmt(totEntrate),     c: 'var(--verde)' },
          { l: 'Uscite totali',    v: fmt(totUscite),      c: 'var(--rosso)' },
          { l: 'Saldo',            v: fmt(saldo),          c: saldo >= 0 ? 'var(--verde)' : 'var(--rosso)' },
          { l: 'Quote arretrate',  v: fmt(quoteArretrate), c: quoteArretrate > 0 ? 'var(--ambra)' : 'var(--grigio)' },
        ].map(s => (
          <div key={s.l} className="stat-card">
            <div className="stat-label">{s.l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.c, marginTop: 4 }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)', fontSize: 14, fontWeight: 600, color: 'var(--verde)' }}>Entrate per categoria</div>
          {Object.entries(catEntrate).sort((a, b) => b[1] - a[1]).map(([cat, imp]) => (
            <div key={cat} style={{ padding: '11px 18px', borderBottom: '1px solid var(--grigio-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, textTransform: 'capitalize', color: 'var(--grigio-2)' }}>{cat.replace(/_/g, ' ')}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--verde)' }}>{fmt(imp)}</span>
            </div>
          ))}
          {Object.keys(catEntrate).length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>Nessuna entrata registrata</div>}
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)', fontSize: 14, fontWeight: 600, color: 'var(--rosso)' }}>Uscite per categoria</div>
          {Object.entries(catUscite).sort((a, b) => b[1] - a[1]).map(([cat, imp]) => (
            <div key={cat} style={{ padding: '11px 18px', borderBottom: '1px solid var(--grigio-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, textTransform: 'capitalize', color: 'var(--grigio-2)' }}>{cat.replace(/_/g, ' ')}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--rosso)' }}>{fmt(imp)}</span>
            </div>
          ))}
          {Object.keys(catUscite).length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>Nessuna uscita registrata</div>}
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/segretario/prima-nota" className="btn btn-secondary btn-sm">Vai alla prima nota completa →</Link>
      </div>
    </div>
  )
}
