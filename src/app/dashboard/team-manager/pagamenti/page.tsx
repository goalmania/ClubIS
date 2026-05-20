'use client'
// src/app/dashboard/team-manager/pagamenti/page.tsx
// Visualizza TUTTI i pagamenti del club (non solo TM) + crea nuovi senza vincolo famiglia
// I nuovi movimenti vengono registrati direttamente in prima_nota (API) → sincronizzati su tutti i ruoli
import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TabBar, Modal, FormField, FormGrid, Toast } from '@/components/ui'
import { useSharedData } from '@/hooks/useSharedData'

type MovimentoRow = {
  id: string
  tipo: 'entrata' | 'uscita'
  categoria: string
  importo: number
  data: string
  descrizione: string | null
  controparte: string | null
  sorgente: string | null
}

type RataRow = {
  id: string
  piano_id: string
  numero_rata: number
  importo: number
  scadenza: string
  stato: string
  data_pagamento: string | null
  descrizione?: string | null
}

const TEMPLATE_TM = [
  { nome: 'Rimborso trasferta pullman', icon: '🚌', categoria: 'trasferte',          tipo: 'uscita'  as const },
  { nome: 'Acquisto materiale sportivo', icon: '⚽', categoria: 'materiale_sportivo', tipo: 'uscita'  as const },
  { nome: 'Spese vitto trasferta',       icon: '🍽', categoria: 'trasferte',          tipo: 'uscita'  as const },
  { nome: 'Rimborso viaggio singolo',    icon: '🚗', categoria: 'trasferte',          tipo: 'uscita'  as const },
  { nome: 'Iscrizione torneo',           icon: '🏆', categoria: 'federazione',        tipo: 'uscita'  as const },
  { nome: 'Entrata da sponsorizzazione', icon: '💼', categoria: 'sponsorizzazioni',   tipo: 'entrata' as const },
  { nome: 'Incasso biglietteria',        icon: '🎫', categoria: 'proventi_gare',      tipo: 'entrata' as const },
]

function statoEffettivo(stato: string, scadenza: string) {
  if (stato === 'in_attesa' && new Date(scadenza) < new Date()) return 'in_ritardo'
  return stato
}

const fmt = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export default function TeamManagerPagamentiPage() {
  const supabase = useRef(createClient()).current

  const [movimenti, setMovimenti]       = useState<MovimentoRow[]>([])
  const [rate, setRate]                 = useState<RataRow[]>([])
  const [tab, setTab]                   = useState('prima_nota')
  const [openTemplate, setOpenTemplate] = useState(false)
  const [templateSel, setTemplateSel]   = useState<typeof TEMPLATE_TM[0] | null>(null)
  const [toast, setToast]               = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [saving, setSaving]             = useState(false)

  const [fImporto, setFImporto]         = useState('')
  const [fData, setFData]               = useState(new Date().toISOString().split('T')[0])
  const [fDescrizione, setFDescrizione] = useState('')
  const [fControparte, setFControparte] = useState('')

  const load = useCallback(async () => {
    // Prima nota — fonte di verità unificata
    const da = new Date(); da.setMonth(da.getMonth() - 6)
    const res = await fetch(`/api/prima-nota?da=${da.toISOString().split('T')[0]}&limit=300`)
    if (res.ok) {
      const json = await res.json()
      setMovimenti(json.movimenti ?? [])
    }

    // Rate in scadenza (60gg)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return

    const fra60 = new Date(); fra60.setDate(fra60.getDate() + 60)
    const { data: rateData } = await supabase
      .from('rate_pagamento')
      .select('id, piano_id, numero_rata, importo, scadenza, stato, data_pagamento')
      .eq('club_id', utente.club_id)
      .neq('stato', 'annullata')
      .lte('scadenza', fra60.toISOString().split('T')[0])
      .order('scadenza')

    if (rateData && rateData.length > 0) {
      const pianoIds = [...new Set((rateData as any[]).map(r => r.piano_id).filter(Boolean))]
      const { data: piani } = await supabase
        .from('piani_pagamento')
        .select('id, descrizione')
        .in('id', pianoIds)
      const pianoMap = Object.fromEntries((piani ?? []).map((p: any) => [p.id, p.descrizione]))
      setRate((rateData as any[]).map(r => ({ ...r, descrizione: pianoMap[r.piano_id] ?? null })))
    } else {
      setRate([])
    }
  }, [supabase])

  useSharedData(load)

  const entrateList = movimenti.filter(m => m.tipo === 'entrata')
  const usciteList  = movimenti.filter(m => m.tipo === 'uscita')
  const daPagare    = rate.filter(r => ['in_attesa', 'in_ritardo'].includes(statoEffettivo(r.stato, r.scadenza)))
  const totEntrate  = entrateList.reduce((s, m) => s + Number(m.importo), 0)
  const totUscite   = usciteList.reduce((s, m) => s + Number(m.importo), 0)
  const saldo       = totEntrate - totUscite

  const segnaPagato = async (rataId: string) => {
    const dataOggi = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from('rate_pagamento')
      .update({ stato: 'pagata', data_pagamento: dataOggi })
      .eq('id', rataId)
    if (error) { setToast({ msg: error.message, tipo: 'error' }); return }
    setToast({ msg: '✓ Rata segnata come pagata — prima nota aggiornata automaticamente', tipo: 'success' })
    load()
  }

  const creaMovimento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fImporto || !fData || !templateSel) return
    setSaving(true)
    const res = await fetch('/api/prima-nota', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        tipo:        templateSel.tipo,
        categoria:   templateSel.categoria,
        importo:     parseFloat(fImporto),
        data:        fData,
        descrizione: fDescrizione || templateSel.nome,
        controparte: fControparte || null,
        sorgente:    'team_manager',
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setToast({ msg: json.error ?? 'Errore', tipo: 'error' }); return }
    setToast({ msg: `✓ ${templateSel.tipo === 'entrata' ? 'Entrata' : 'Uscita'} registrata in prima nota`, tipo: 'success' })
    setOpenTemplate(false)
    setTemplateSel(null)
    setFImporto(''); setFData(new Date().toISOString().split('T')[0])
    setFDescrizione(''); setFControparte('')
    load()
  }

  const statoLabel = (r: RataRow) => {
    const s = statoEffettivo(r.stato, r.scadenza)
    const map: Record<string, { label: string; cls: string }> = {
      pagata:     { label: 'Pagata',     cls: 'badge-verde' },
      in_attesa:  { label: 'In attesa',  cls: 'badge-grigio' },
      in_ritardo: { label: 'In ritardo', cls: 'badge-rosso' },
    }
    return map[s] ?? { label: s, cls: 'badge-grigio' }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
            Pagamenti & Finanze
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Prima nota club — entrate e uscite condivise con presidenza e segreteria
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setOpenTemplate(true)}>
          + Nuovo movimento
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Entrate (6m)</div>
          <div className="stat-value" style={{ fontSize: 18, color: 'var(--accent-green)' }}>{fmt(totEntrate)}</div>
          <div className="stat-sub">{entrateList.length} movimenti</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Uscite (6m)</div>
          <div className="stat-value" style={{ fontSize: 18, color: 'var(--accent-red)' }}>{fmt(totUscite)}</div>
          <div className="stat-sub">{usciteList.length} movimenti</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Saldo</div>
          <div className="stat-value" style={{ fontSize: 18, color: saldo >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {fmt(saldo)}
          </div>
          <div className="stat-sub">ultimi 6 mesi</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rate in scadenza</div>
          <div className="stat-value" style={{ color: daPagare.length > 0 ? 'var(--accent-orange)' : undefined }}>
            {daPagare.length}
          </div>
          <div className="stat-sub">nei prossimi 60 giorni</div>
        </div>
      </div>

      <TabBar
        tabs={[
          { key: 'prima_nota',  label: 'Prima nota',       count: movimenti.length },
          { key: 'in_scadenza', label: 'Rate in scadenza', count: daPagare.length  },
          { key: 'tutte_rate',  label: 'Tutte le rate',    count: rate.length       },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Prima nota */}
      {tab === 'prima_nota' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrizione</th>
                  <th>Categoria</th>
                  <th>Controparte</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'right' }}>Importo</th>
                </tr>
              </thead>
              <tbody>
                {movimenti.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 13 }}>
                      Nessun movimento registrato negli ultimi 6 mesi
                    </td>
                  </tr>
                ) : movimenti.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(m.data).toLocaleDateString('it-IT')}
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>
                      {m.descrizione ?? '—'}
                      {m.sorgente && m.sorgente !== 'manuale' && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                          via {m.sorgente.replace(/_/g, ' ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-grigio" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                        {(m.categoria ?? '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.controparte ?? '—'}</td>
                    <td>
                      <span className={`badge ${m.tipo === 'entrata' ? 'badge-verde' : 'badge-rosso'}`}>
                        {m.tipo === 'entrata' ? '↑ Entrata' : '↓ Uscita'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: m.tipo === 'entrata' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {m.tipo === 'entrata' ? '+' : '–'}{fmt(Number(m.importo))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rate */}
      {(tab === 'in_scadenza' || tab === 'tutte_rate') && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Descrizione</th>
                  <th>Rata</th>
                  <th>Scadenza</th>
                  <th>Importo</th>
                  <th>Stato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(tab === 'in_scadenza' ? daPagare : rate).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 13 }}>
                      Nessuna rata
                    </td>
                  </tr>
                ) : (tab === 'in_scadenza' ? daPagare : rate).map(r => {
                  const { label, cls } = statoLabel(r)
                  return (
                    <tr key={r.id}>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>{r.descrizione ?? '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{r.numero_rata}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {new Date(r.scadenza).toLocaleDateString('it-IT')}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(Number(r.importo))}</td>
                      <td><span className={`badge ${cls}`}>{label}</span></td>
                      <td>
                        {r.stato !== 'pagata' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11 }}
                            onClick={() => segnaPagato(r.id)}
                          >
                            Segna pagata
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal nuovo movimento */}
      <Modal
        open={openTemplate}
        onClose={() => { setOpenTemplate(false); setTemplateSel(null) }}
        title="Nuovo movimento"
        width={520}
      >
        {!templateSel ? (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Scegli il tipo di movimento da registrare in prima nota:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TEMPLATE_TM.map(t => (
                <button
                  key={t.nome}
                  onClick={() => setTemplateSel(t)}
                  style={{
                    padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer', border: '1px solid var(--border)',
                    background: 'var(--bg-card)', textAlign: 'left', width: '100%', borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{t.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {t.categoria.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <span className={`badge ${t.tipo === 'entrata' ? 'badge-verde' : 'badge-rosso'}`}>
                    {t.tipo === 'entrata' ? '↑ Entrata' : '↓ Uscita'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={creaMovimento}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 8 }}>
              <span style={{ fontSize: 24 }}>{templateSel.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{templateSel.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{templateSel.categoria.replace(/_/g, ' ')}</div>
              </div>
              <span className={`badge ${templateSel.tipo === 'entrata' ? 'badge-verde' : 'badge-rosso'}`}>
                {templateSel.tipo === 'entrata' ? '↑ Entrata' : '↓ Uscita'}
              </span>
              <button type="button" onClick={() => setTemplateSel(null)}
                style={{ fontSize: 11, color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Cambia →
              </button>
            </div>

            <FormGrid cols={2}>
              <FormField label="Importo (€)" required>
                <input
                  className="input"
                  type="number"
                  value={fImporto}
                  onChange={e => setFImporto(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </FormField>
              <FormField label="Data" required>
                <input
                  className="input"
                  type="date"
                  value={fData}
                  onChange={e => setFData(e.target.value)}
                  required
                />
              </FormField>
            </FormGrid>

            <FormField label="Descrizione">
              <input
                className="input"
                value={fDescrizione}
                onChange={e => setFDescrizione(e.target.value)}
                placeholder={`Es. ${templateSel.nome}…`}
              />
            </FormField>

            <FormField label="Controparte (fornitore / cliente)">
              <input
                className="input"
                value={fControparte}
                onChange={e => setFControparte(e.target.value)}
                placeholder="Es. Autonoleggio Rossi, Comune di Milano…"
              />
            </FormField>

            <div style={{ padding: '8px 0 2px', fontSize: 12, color: 'var(--text-muted)' }}>
              💡 Visibile da presidente e segreteria in tempo reale.
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--border)', marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setOpenTemplate(false)}>
                Annulla
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Registrazione…' : 'Registra in prima nota'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
