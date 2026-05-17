'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import FeatureGate from '@/components/FeatureGate'

type Row = { sez: string; l: string; v: string; c?: string }

function ReportContent() {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [meseLabel, setMeseLabel] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
      if (!utente?.club_id) return
      const clubId = utente.club_id
      const oggi = new Date()
      const mese = oggi.toISOString().slice(0, 7)
      const inizioMese = `${mese}-01`
      setMeseLabel(oggi.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }))

      // Carica le squadre del club per filtrare le partite per club
      const { data: squadre } = await supabase
        .from('squadre').select('id').eq('club_id', clubId)
      const squadraIds = (squadre ?? []).map((s: any) => s.id)

      const [
        { count: tesserati },
        { count: quotePagate },
        { count: quoteArretrate },
        { data: entrate },
        { data: uscite },
        { count: certScad },
        { count: contrScad },
        { data: partite },
      ] = await Promise.all([
        supabase.from('tesseramenti').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('stato', 'attivo'),
        supabase.from('quote_iscrizione').select('*', { count: 'exact', head: true }).eq('club_id', clubId).eq('stato', 'pagato'),
        supabase.from('quote_iscrizione').select('*', { count: 'exact', head: true }).eq('club_id', clubId).in('stato', ['non_pagato', 'parziale']),
        supabase.from('prima_nota').select('importo').eq('club_id', clubId).eq('tipo', 'entrata').gte('data', inizioMese),
        supabase.from('prima_nota').select('importo').eq('club_id', clubId).eq('tipo', 'uscita').gte('data', inizioMese),
        supabase.from('certificati_medici').select('*', { count: 'exact', head: true }).eq('club_id', clubId).lte('data_scadenza', new Date(oggi.getTime() + 30 * 86400000).toISOString().split('T')[0]).gte('data_scadenza', oggi.toISOString().split('T')[0]),
        supabase.from('contratti').select('*', { count: 'exact', head: true }).eq('club_id', clubId).lte('data_scadenza', new Date(oggi.getTime() + 90 * 86400000).toISOString().split('T')[0]).gte('data_scadenza', oggi.toISOString().split('T')[0]),
        squadraIds.length > 0
          ? supabase.from('partite').select('gol_fatti, gol_subiti').eq('stato', 'giocata').in('squadra_id', squadraIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const totE = entrate?.reduce((s: number, r: any) => s + Number(r.importo), 0) ?? 0
      const totU = uscite?.reduce((s: number, r: any) => s + Number(r.importo), 0) ?? 0
      const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
      const V = (partite ?? []).filter((p: any) => (p.gol_fatti ?? 0) > (p.gol_subiti ?? 0)).length
      const P = (partite ?? []).filter((p: any) => (p.gol_fatti ?? 0) === (p.gol_subiti ?? 0) && p.gol_fatti !== null).length
      const S = (partite ?? []).filter((p: any) => (p.gol_fatti ?? 0) < (p.gol_subiti ?? 0)).length

      setRows([
        { sez: 'Tesserati', l: 'Giocatori attivi', v: `${tesserati ?? 0}` },
        { sez: 'Quote', l: 'Quote pagate', v: `${quotePagate ?? 0}` },
        { sez: 'Quote', l: 'Quote arretrate', v: `${quoteArretrate ?? 0}`, c: quoteArretrate && quoteArretrate > 0 ? 'var(--rosso)' : undefined },
        { sez: 'Finanze', l: 'Entrate mese', v: fmt(totE), c: 'var(--verde)' },
        { sez: 'Finanze', l: 'Uscite mese', v: fmt(totU), c: 'var(--rosso)' },
        { sez: 'Finanze', l: 'Saldo mese', v: fmt(totE - totU), c: (totE - totU) >= 0 ? 'var(--verde)' : 'var(--rosso)' },
        { sez: 'Compliance', l: 'Certificati in scadenza (30gg)', v: `${certScad ?? 0}`, c: certScad && certScad > 0 ? 'var(--ambra)' : undefined },
        { sez: 'Compliance', l: 'Contratti in scadenza (90gg)', v: `${contrScad ?? 0}`, c: contrScad && contrScad > 0 ? 'var(--ambra)' : undefined },
        { sez: 'Sport', l: 'Partite giocate', v: `${(partite ?? []).length}` },
        { sez: 'Sport', l: 'Risultati V/P/S', v: `${V} / ${P} / ${S}` },
      ])
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sezioni = [...new Set(rows.map(r => r.sez))]

  if (loading) return <div style={{ color: 'var(--grigio-4)', padding: 40 }}>Caricamento...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Report mensile</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>{meseLabel}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨 Stampa</button>
      </div>
      {sezioni.map(sez => (
        <div key={sez} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--grigio-5)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grigio-4)' }}>{sez}</div>
          {rows.filter(r => r.sez === sez).map(r => (
            <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--grigio-6)' }}>
              <span style={{ fontSize: 14, color: 'var(--grigio-2)' }}>{r.l}</span>
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: r.c ?? 'var(--grigio)' }}>{r.v}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function PresidenteReportPage() {
  return (
    <FeatureGate feature="report_mensile_automatico" featureLabel="Report Mensile">
      <ReportContent />
    </FeatureGate>
  )
}
