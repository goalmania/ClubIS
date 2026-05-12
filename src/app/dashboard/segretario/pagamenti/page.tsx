'use client'
import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast } from '@/components/ui'
import { useSharedData } from '@/hooks/useSharedData'
import Link from 'next/link'
import { matchSearch } from '@/lib/search'
import QuickPianoPagamento from '@/components/forms/QuickPianoPagamento'

type FiltroStato = 'tutti' | 'in_attesa' | 'in_ritardo' | 'pagata'

interface RataRow {
  id: string
  numero_rata: number
  importo: number
  scadenza: string
  stato: string
  data_pagamento: string | null
  ricevuta_numero: string | null
  ultimo_sollecito_at: string | null
  piano: {
    id: string
    descrizione: string
    famiglia_id: string
    famiglia: { id: string; nome: string; cognome: string; email: string } | null
    giocatore: { id: string; nome: string; cognome: string } | null
  }
}

function statoEffettivo(stato: string, scadenza: string): string {
  if (stato === 'in_attesa' && new Date(scadenza) < new Date()) return 'in_ritardo'
  return stato
}

function StatoBadge({ stato, scadenza }: { stato: string; scadenza: string }) {
  const s = statoEffettivo(stato, scadenza)
  const map: Record<string, { label: string; cls: string }> = {
    pagata:     { label: 'Pagata',     cls: 'badge-verde' },
    in_attesa:  { label: 'In attesa',  cls: 'badge-grigio' },
    in_ritardo: { label: 'In ritardo', cls: 'badge-rosso' },
    annullata:  { label: 'Annullata',  cls: 'badge-grigio' },
  }
  const { label, cls } = map[s] ?? { label: s, cls: 'badge-grigio' }
  return <span className={`badge ${cls}`}>{label}</span>
}

function KpiCard({ label, value, sub, colore }: {
  label: string; value: string; sub?: string; colore?: string
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 24, color: colore ?? 'var(--grigio)' }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

const fmt = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const TEMPLATE_NUOVO_PIANO = [{ numero: 1, importoDef: 0, mesiDaOggi: 0 }]

export default function PagamentiDashboard() {
  const supabase = createClient()
  const [rate, setRate] = useState<RataRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<FiltroStato>('tutti')
  const [cerca, setCerca] = useState('')
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [clubId, setClubId] = useState<string | null>(null)
  const [nuovoPianoOpen, setNuovoPianoOpen] = useState(false)

  useSharedData(async () => {
    setBannerDismissed(localStorage.getItem('cis_banner_golee_dismissed') === '1')
    await load()
  })

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
    const clubId = utente!.club_id
    setClubId(clubId)

    const { data } = await supabase
      .from('rate_pagamento')
      .select(`
        id, numero_rata, importo, scadenza, stato,
        data_pagamento, ricevuta_numero, ultimo_sollecito_at,
        piano_id(
          id, descrizione, famiglia_id,
          famiglie(id, nome, cognome, email),
          giocatori(id, nome, cognome)
        )
      `)
      .eq('club_id', clubId)
      .neq('stato', 'annullata')
      .order('scadenza')

    setRate((data ?? []).map((r: any) => ({
      ...r,
      piano: {
        ...r.piano_id,
        famiglia: r.piano_id?.famiglie ?? null,
        giocatore: r.piano_id?.giocatori ?? null,
      },
    })))
    setLoading(false)
  }

  // Sottoscrizione realtime: aggiorna la lista rate quando un qualsiasi ruolo del club
  // modifica rate_pagamento o piani_pagamento (senza aspettare il cambio di tab)
  useEffect(() => {
    if (!clubId) return
    const channel = supabase
      .channel(`segretario_pagamenti:${clubId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'rate_pagamento',
        filter: `club_id=eq.${clubId}`,
      }, () => load())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'piani_pagamento',
        filter: `club_id=eq.${clubId}`,
      }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clubId])

  const dismissBanner = () => {
    localStorage.setItem('cis_banner_golee_dismissed', '1')
    setBannerDismissed(true)
  }

  // KPI
  const oggi = new Date()
  const fineM = new Date(oggi.getFullYear(), oggi.getFullYear(), 0)
  const inizioM = new Date(oggi.getFullYear(), oggi.getMonth(), 1)
  const fineM2 = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0)

  const kpi = useMemo(() => {
    const famiglieUnique = new Set(rate.map(r => r.piano?.famiglia_id).filter(Boolean))
    const pagatoMese = rate
      .filter(r => r.stato === 'pagata' && r.data_pagamento && new Date(r.data_pagamento) >= inizioM && new Date(r.data_pagamento) <= fineM2)
      .reduce((s, r) => s + Number(r.importo), 0)
    const ritardo = rate.filter(r => statoEffettivo(r.stato, r.scadenza) === 'in_ritardo')
    const famInRitardo = new Set(ritardo.map(r => r.piano?.famiglia_id).filter(Boolean))
    const totRitardo = ritardo.reduce((s, r) => s + Number(r.importo), 0)
    const attesaFineM = rate
      .filter(r => r.stato === 'in_attesa' && new Date(r.scadenza) <= fineM2 && new Date(r.scadenza) >= oggi)
      .reduce((s, r) => s + Number(r.importo), 0)
    return { famiglie: famiglieUnique.size, pagatoMese, famInRitardo: famInRitardo.size, totRitardo, attesaFineM }
  }, [rate])

  // Raggruppamento per famiglia: prende la rata "corrente" (prossima in attesa o più recente in ritardo)
  const righeTabella = useMemo(() => {
    const byFam = new Map<string, RataRow[]>()
    for (const r of rate) {
      const fid = r.piano?.famiglia_id ?? 'unknown'
      if (!byFam.has(fid)) byFam.set(fid, [])
      byFam.get(fid)!.push(r)
    }

    return Array.from(byFam.entries()).map(([famId, righe]) => {
      const inRitardo = righe.filter(r => statoEffettivo(r.stato, r.scadenza) === 'in_ritardo')
      const inAttesa  = righe.filter(r => r.stato === 'in_attesa' && new Date(r.scadenza) >= oggi)
      const corrente  = inRitardo[0] ?? inAttesa.sort((a, b) => new Date(a.scadenza).getTime() - new Date(b.scadenza).getTime())[0] ?? righe[righe.length - 1]
      const statoGen  = inRitardo.length > 0 ? 'in_ritardo' : inAttesa.length > 0 ? 'in_attesa' : 'pagata'
      return { famId, corrente, statoGen, famiglia: righe[0].piano?.famiglia, giocatore: righe[0].piano?.giocatore }
    })
  }, [rate])

  const righeFiltrate = righeTabella.filter(r => {
    if (filtro !== 'tutti' && r.statoGen !== filtro) return false
    if (cerca && !matchSearch(cerca,
      r.famiglia?.cognome, r.famiglia?.nome,
      r.giocatore?.cognome, r.giocatore?.nome
    )) return false
    return true
  })

  const export730 = () => {
    window.open('/api/pagamenti/export-730?anno=' + oggi.getFullYear(), '_blank')
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>

  return (
    <div>
      <PageHeader
        title="Pagamenti"
        subtitle="Dashboard rate e piani di pagamento"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={export730}>
              Scarica per 730
            </button>
            <Link href="/dashboard/segretario/pagamenti/rendiconto" className="btn btn-secondary btn-sm">
              Rendiconto
            </Link>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setNuovoPianoOpen(true)}
            >
              + Nuovo piano
            </button>
          </div>
        }
      />

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Famiglie iscritte" value={String(kpi.famiglie)} sub="con piano attivo" />
        <KpiCard label="Pagato questo mese" value={fmt(kpi.pagatoMese)} colore="var(--verde)" />
        <KpiCard
          label="In ritardo"
          value={fmt(kpi.totRitardo)}
          sub={`${kpi.famInRitardo} famiglie`}
          colore={kpi.totRitardo > 0 ? 'var(--rosso)' : undefined}
        />
        <KpiCard label="Atteso entro fine mese" value={fmt(kpi.attesaFineM)} colore="var(--ambra)" />
      </div>

      {/* Banner anti-Golee */}
      {!bannerDismissed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10,
          padding: '12px 18px', marginBottom: 20, gap: 12,
        }}>
          <span style={{ fontSize: 13, color: '#92400e' }}>
            💡 <strong>ClubIS non applica commissioni sui pagamenti.</strong>{' '}
            Con 80 famiglie a 50 €/mese, risparmiate ~<strong>€ 800/anno</strong> rispetto a piattaforme che trattengono il 2%.
          </span>
          <button
            onClick={dismissBanner}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#92400e', flexShrink: 0 }}
            title="Chiudi"
          >
            ×
          </button>
        </div>
      )}

      {/* Filtri + ricerca */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        {(['tutti', 'in_attesa', 'in_ritardo', 'pagata'] as FiltroStato[]).map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filtro === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltro(f)}
          >
            {{ tutti: 'Tutti', in_attesa: 'In attesa', in_ritardo: 'In ritardo', pagata: 'Pagati' }[f]}
            {f !== 'tutti' && (
              <span style={{ marginLeft: 6, opacity: 0.8 }}>
                ({righeTabella.filter(r => r.statoGen === f).length})
              </span>
            )}
          </button>
        ))}
        <input
          className="input"
          style={{ marginLeft: 'auto', width: 240 }}
          placeholder="Cerca famiglia / giocatore..."
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
                <th>Famiglia</th>
                <th>Giocatore</th>
                <th>Rata corrente</th>
                <th>Scadenza</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {righeFiltrate.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--grigio-4)' }}>
                    {filtro === 'tutti' ? 'Nessun piano di pagamento registrato' : 'Nessuna riga con questo filtro'}
                  </td>
                </tr>
              ) : righeFiltrate.map(({ famId, corrente, statoGen, famiglia, giocatore }) => (
                <tr key={famId}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {famiglia?.cognome ?? '—'} {famiglia?.nome ?? ''}
                    </div>
                    {famiglia?.email && (
                      <div style={{ fontSize: 11, color: 'var(--grigio-4)' }}>{famiglia.email}</div>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {giocatore ? `${giocatore.cognome} ${giocatore.nome}` : '—'}
                  </td>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {fmt(Number(corrente?.importo ?? 0))}
                    </div>
                    {corrente && (
                      <div style={{ fontSize: 11, color: 'var(--grigio-4)' }}>Rata {corrente.numero_rata}</div>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {corrente?.scadenza
                      ? new Date(corrente.scadenza).toLocaleDateString('it-IT')
                      : '—'}
                  </td>
                  <td>
                    {corrente && <StatoBadge stato={corrente.stato} scadenza={corrente.scadenza} />}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {famiglia?.id && (
                        <Link
                          href={`/dashboard/segretario/pagamenti/${famiglia.id}`}
                          className="btn btn-secondary btn-sm"
                        >
                          Dettaglio
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {clubId && (
        <QuickPianoPagamento
          open={nuovoPianoOpen}
          onClose={() => { setNuovoPianoOpen(false); load() }}
          clubId={clubId}
          templateNome="Nuovo piano di pagamento"
          templateRate={TEMPLATE_NUOVO_PIANO}
        />
      )}
    </div>
  )
}
