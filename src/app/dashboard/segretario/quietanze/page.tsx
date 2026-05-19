'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast } from '@/components/ui'
import { useSharedData } from '@/hooks/useSharedData'
import { matchSearch } from '@/lib/search'
import { stagioneCorrente } from '@/lib/helpers'

type FiltroStato = 'tutti' | 'da_generare' | 'generata' | 'firmata'

interface QuotaRow {
  id: string
  giocatore_id: string
  importo_totale: number
  importo_pagato: number
  stato: string
  giocatore: {
    id: string
    nome: string
    cognome: string
    codice_fiscale: string
    data_nascita: string
    luogo_nascita: string | null
  } | null
}

interface QuietanzaRow {
  id: string
  giocatore_id: string
  numero_quietanza: string | null
  tipo: string
  importo_totale: number
  firmata: boolean
  firma_data: string | null
  stagione: string
}

const fmt = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const STAGIONE_CORRENTE = stagioneCorrente()

function KpiCard({ label, value, sub, colore }: {
  label: string; value: string | number; sub?: string; colore?: string
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 24, color: colore ?? 'var(--grigio)' }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export default function QuietanzePage() {
  const supabase = createClient()
  const [quote, setQuote] = useState<QuotaRow[]>([])
  const [quietanze, setQuietanze] = useState<QuietanzaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [filtro, setFiltro] = useState<FiltroStato>('tutti')
  const [cerca, setCerca] = useState('')
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  useSharedData(async () => { await load() })

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
    const clubId = utente!.club_id

    const [{ data: quoteData }, { data: quietanzeData }] = await Promise.all([
      supabase
        .from('quote_iscrizione')
        .select('id, giocatore_id, importo_totale, importo_pagato, stato, giocatori(id, nome, cognome, codice_fiscale, data_nascita, luogo_nascita)')
        .eq('club_id', clubId)
        .eq('stagione', STAGIONE_CORRENTE)
        .neq('stato', 'esonerato')
        .order('giocatori(cognome)'),
      supabase
        .from('quietanze')
        .select('id, giocatore_id, numero_quietanza, tipo, importo_totale, firmata, firma_data, stagione')
        .eq('club_id', clubId)
        .eq('stagione', STAGIONE_CORRENTE),
    ])

    setQuote((quoteData ?? []).map((q: any) => ({
      ...q,
      giocatore: q.giocatori ?? null,
    })))
    setQuietanze(quietanzeData ?? [])
    setLoading(false)
  }

  async function generaTutte() {
    setGenerando(true)
    try {
      const res = await fetch('/api/quietanze/genera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore generazione')
      setToast({ msg: `${json.created} quietanze generate`, tipo: 'success' })
      await load()
    } catch (e: any) {
      setToast({ msg: e.message, tipo: 'error' })
    } finally {
      setGenerando(false)
    }
  }

  async function generaSingola(quotaId: string) {
    try {
      const res = await fetch('/api/quietanze/genera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quota_id: quotaId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore generazione')
      setToast({ msg: 'Quietanza generata', tipo: 'success' })
      await load()
    } catch (e: any) {
      setToast({ msg: e.message, tipo: 'error' })
    }
  }

  async function toggleFirma(quietanzaId: string, firmataOra: boolean) {
    const { error } = await supabase
      .from('quietanze')
      .update({ firmata: !firmataOra, firma_data: !firmataOra ? new Date().toISOString() : null })
      .eq('id', quietanzaId)
    if (error) {
      setToast({ msg: 'Errore aggiornamento firma', tipo: 'error' })
    } else {
      setQuietanze(prev => prev.map(q => q.id === quietanzaId
        ? { ...q, firmata: !firmataOra, firma_data: !firmataOra ? new Date().toISOString() : null }
        : q
      ))
    }
  }

  const quietanzeByGiocatore = useMemo(() => {
    const map = new Map<string, QuietanzaRow>()
    for (const q of quietanze) map.set(q.giocatore_id, q)
    return map
  }, [quietanze])

  const righe = useMemo(() => quote.map(q => ({
    quota: q,
    quietanza: quietanzeByGiocatore.get(q.giocatore_id) ?? null,
  })), [quote, quietanzeByGiocatore])

  const righeFiltrate = useMemo(() => righe.filter(({ quota, quietanza }) => {
    if (filtro === 'da_generare' && quietanza) return false
    if (filtro === 'generata' && (quietanza == null || quietanza.firmata)) return false
    if (filtro === 'firmata' && !quietanza?.firmata) return false
    if (cerca && !matchSearch(cerca, quota.giocatore?.cognome, quota.giocatore?.nome)) return false
    return true
  }), [righe, filtro, cerca])

  const kpi = useMemo(() => ({
    totGiocatori: righe.length,
    generate: righe.filter(r => r.quietanza).length,
    firmate: righe.filter(r => r.quietanza?.firmata).length,
    mancanti: righe.filter(r => !r.quietanza).length,
  }), [righe])

  const tipoLabel: Record<string, string> = {
    quota_tesseramento: 'Quota tesseramento',
    rimborso_spese: 'Rimborso spese',
    compenso: 'Compenso',
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>

  return (
    <div>
      <PageHeader
        title="Quietanze"
        subtitle={`Stagione ${STAGIONE_CORRENTE} — pagamenti per iscrizione campionato`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => window.open('/api/quietanze/export-campionato', '_blank')}
            >
              Export iscrizione campionato
            </button>
            <button
              data-onboarding="btn-genera-quietanze"
              className="btn btn-primary btn-sm"
              onClick={generaTutte}
              disabled={generando}
            >
              {generando ? 'Generazione...' : 'Genera tutte le quietanze'}
            </button>
          </div>
        }
      />

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Totale giocatori" value={kpi.totGiocatori} sub={`stagione ${STAGIONE_CORRENTE}`} />
        <KpiCard label="Quietanze generate" value={kpi.generate} colore="var(--grigio)" />
        <KpiCard
          label="Firmate"
          value={kpi.firmate}
          sub={kpi.generate > 0 ? `${Math.round((kpi.firmate / kpi.generate) * 100)}% del totale` : undefined}
          colore={kpi.firmate > 0 ? 'var(--verde)' : undefined}
        />
        <KpiCard
          label="Da generare"
          value={kpi.mancanti}
          colore={kpi.mancanti > 0 ? 'var(--ambra)' : undefined}
        />
      </div>

      {/* Filtri + ricerca */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        {([
          ['tutti', 'Tutti'],
          ['da_generare', 'Da generare'],
          ['generata', 'Generate'],
          ['firmata', 'Firmate'],
        ] as [FiltroStato, string][]).map(([f, label]) => (
          <button
            key={f}
            className={`btn btn-sm ${filtro === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltro(f)}
          >
            {label}
            {f !== 'tutti' && (
              <span style={{ marginLeft: 6, opacity: 0.8 }}>
                ({f === 'da_generare' ? kpi.mancanti : f === 'generata' ? kpi.generate - kpi.firmate : kpi.firmate})
              </span>
            )}
          </button>
        ))}
        <input
          className="input"
          style={{ marginLeft: 'auto', width: 240 }}
          placeholder="Cerca giocatore..."
          value={cerca}
          onChange={e => setCerca(e.target.value)}
        />
      </div>

      {/* Tabella */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Giocatore</th>
                <th>Quota iscrizione</th>
                <th>N. Quietanza</th>
                <th>Tipo</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {righeFiltrate.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--grigio-4)' }}>
                    {filtro === 'tutti' ? 'Nessun giocatore iscritto per questa stagione' : 'Nessuna riga con questo filtro'}
                  </td>
                </tr>
              ) : righeFiltrate.map(({ quota, quietanza }) => (
                <tr key={quota.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {quota.giocatore?.cognome ?? '—'} {quota.giocatore?.nome ?? ''}
                    </div>
                    {quota.giocatore?.codice_fiscale && (
                      <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
                        {quota.giocatore.codice_fiscale}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {fmt(Number(quota.importo_totale))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--grigio-4)' }}>
                      {fmt(Number(quota.importo_pagato))} pagati
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {quietanza?.numero_quietanza ?? '—'}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {quietanza ? (tipoLabel[quietanza.tipo] ?? quietanza.tipo) : '—'}
                  </td>
                  <td>
                    {!quietanza ? (
                      <span className="badge badge-grigio">Da generare</span>
                    ) : quietanza.firmata ? (
                      <span className="badge badge-verde">Firmata</span>
                    ) : (
                      <span className="badge badge-ambra">Generata</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!quietanza ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => generaSingola(quota.id)}
                        >
                          Genera
                        </button>
                      ) : (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => window.open(`/api/quietanze/genera-pdf/${quietanza.id}`, '_blank')}
                          >
                            Stampa
                          </button>
                          <button
                            className={`btn btn-sm ${quietanza.firmata ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => toggleFirma(quietanza.id, quietanza.firmata)}
                          >
                            {quietanza.firmata ? 'Rimuovi firma' : 'Segna firmata'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export per iscrizione campionato */}
      <div className="card" style={{ marginTop: 24, padding: '20px 24px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Export per iscrizione campionato</div>
        <div style={{ fontSize: 13, color: 'var(--grigio-4)', marginBottom: 16 }}>
          Genera il documento riepilogativo con tutte le quietanze firmate da allegare alla domanda di iscrizione al campionato.
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: 'var(--verde)' }}>{kpi.firmate}</span> quietanze firmate su{' '}
            <span style={{ fontWeight: 600 }}>{kpi.totGiocatori}</span> giocatori
            {kpi.mancanti > 0 && (
              <span style={{ color: 'var(--ambra)', marginLeft: 8 }}>
                ({kpi.mancanti} ancora mancanti)
              </span>
            )}
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => window.open('/api/quietanze/export-campionato', '_blank')}
            disabled={kpi.firmate === 0}
          >
            Stampa quietanze firmate
          </button>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
