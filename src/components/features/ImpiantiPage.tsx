'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PageHeader, TabBar, Modal, FormField,
  FormGrid, Select, Toast, EmptyState,
} from '@/components/ui'
import {
  AREE_IMPIANTO, URGENZA_TICKET, STATO_TICKET,
  FREQUENZA_CHECKLIST,
} from '@/lib/impianti'
import type { AreaImpianto, UrgenzaTicket } from '@/lib/impianti'
import { formatData, formatEuro } from '@/lib/helpers'

interface Props {
  defaultTab?: string
}

export default function ImpiantiPage({ defaultTab = 'dashboard' }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState(defaultTab)
  const [templates, setTemplates] = useState<any[]>([])
  const [ultimeEsec, setUltimeEsec] = useState<any[]>([])
  const [ticket, setTicket] = useState<any[]>([])
  const [manutenzioni, setManutenzioni] = useState<any[]>([])
  const [utenti, setUtenti] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; tipo: string } | null>(null)
  const [clubId, setClubId] = useState('')
  const [ruolo, setRuolo] = useState('')

  const [modalTicket, setModalTicket] = useState(false)
  const [modalManutenzione, setModalManutenzione] = useState(false)
  const [ticketDettaglio, setTicketDettaglio] = useState<any>(null)

  const [formTicket, setFormTicket] = useState({
    area: 'spogliatoi' as AreaImpianto,
    descrizione_problema: '',
    urgenza: 'media' as UrgenzaTicket,
  })

  const [formMan, setFormMan] = useState({
    area: 'spogliatoi' as AreaImpianto,
    tipo_intervento: '',
    fornitore: '',
    costo_preventivo: '',
    costo_consuntivo: '',
    data_intervento: new Date().toISOString().split('T')[0],
    data_prossima_scad: '',
    note: '',
  })

  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let mounted = true
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: utente } = await supabase
        .from('utenti')
        .select('club_id, ruolo')
        .eq('id', user.id)
        .single()
      if (!utente || !mounted) return
      setClubId(utente.club_id)
      setRuolo(utente.ruolo)
      const { data: staff } = await supabase
        .from('utenti')
        .select('id, nome, cognome, ruolo')
        .eq('club_id', utente.club_id)
        .eq('attivo', true)
      if (mounted) setUtenti(staff ?? [])
    }
    init()
    return () => { mounted = false }
  }, [])

  const caricaTutto = useCallback(async () => {
    if (!clubId) return
    const [checkRes, ticketRes, manRes] = await Promise.all([
      fetch('/api/impianti/checklist'),
      fetch('/api/impianti/ticket'),
      fetch('/api/impianti/manutenzioni'),
    ])
    const checkData = await checkRes.json()
    const ticketData = await ticketRes.json()
    const manData = await manRes.json()

    setTemplates(checkData.templates ?? [])
    setUltimeEsec(checkData.ultimeEsec ?? [])
    setTicket(ticketData.ticket ?? [])
    setManutenzioni(manData.manutenzioni ?? [])
    setLoading(false)
  }, [clubId])

  useEffect(() => { caricaTutto() }, [caricaTutto])

  const seedChecklist = async () => {
    const res = await fetch('/api/impianti/checklist/seed', { method: 'POST' })
    const data = await res.json()
    if (data.creati > 0) {
      setToast({ msg: `${data.creati} checklist predefinite create`, tipo: 'success' })
      caricaTutto()
    } else {
      setToast({ msg: data.msg ?? 'Già configurate', tipo: 'info' })
    }
  }

  const salvaTicket = async () => {
    if (!formTicket.descrizione_problema.trim()) {
      setToast({ msg: 'Descrizione obbligatoria', tipo: 'error' }); return
    }
    setSalvando(true)
    const res = await fetch('/api/impianti/ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formTicket),
    })
    if (res.ok) {
      setToast({ msg: 'Ticket aperto', tipo: 'success' })
      setModalTicket(false)
      setFormTicket({ area: 'spogliatoi', descrizione_problema: '', urgenza: 'media' })
      caricaTutto()
    } else {
      const err = await res.json().catch(() => ({}))
      setToast({ msg: err.error ?? 'Errore apertura ticket', tipo: 'error' })
    }
    setSalvando(false)
  }

  const aggiornaTicket = async (id: string, aggiornamenti: any) => {
    await fetch(`/api/impianti/ticket/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aggiornamenti),
    })
    setTicketDettaglio(null)
    caricaTutto()
    setToast({ msg: 'Ticket aggiornato', tipo: 'success' })
  }

  const salvaMan = async () => {
    if (!formMan.tipo_intervento.trim() || !formMan.data_intervento) {
      setToast({ msg: 'Tipo intervento e data obbligatori', tipo: 'error' }); return
    }
    setSalvando(true)
    const res = await fetch('/api/impianti/manutenzioni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formMan,
        costo_preventivo: formMan.costo_preventivo ? parseFloat(formMan.costo_preventivo) : null,
        costo_consuntivo: formMan.costo_consuntivo ? parseFloat(formMan.costo_consuntivo) : null,
        data_prossima_scad: formMan.data_prossima_scad || null,
      }),
    })
    if (res.ok) {
      setToast({ msg: 'Manutenzione registrata', tipo: 'success' })
      setModalManutenzione(false)
      caricaTutto()
    }
    setSalvando(false)
  }

  const ticketAperti = ticket.filter(t => t.stato === 'aperto' || t.stato === 'in_lavorazione')
  const ticketRisolti = ticket.filter(t => t.stato === 'risolto' || t.stato === 'chiuso')
  const puoGestire = ['presidente', 'ds', 'segretario', 'custode'].includes(ruolo)

  return (
    <div>
      <PageHeader
        title="Gestione Impianti"
        subtitle="Checklist, ticket problemi e manutenzioni"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            {puoGestire && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => setModalManutenzione(true)}>
                  + Manutenzione
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setModalTicket(true)}>
                  🔴 Apri ticket
                </button>
              </>
            )}
          </div>
        }
      />

      <TabBar
        tabs={[
          { key: 'dashboard',    label: '📊 Panoramica' },
          { key: 'checklist',    label: '✅ Checklist' },
          { key: 'ticket',       label: `🎫 Ticket (${ticketAperti.length})` },
          { key: 'manutenzioni', label: '🔧 Manutenzioni' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── TAB PANORAMICA ── */}
      {tab === 'dashboard' && (
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
            gap: 1, background: 'var(--border)', marginBottom: 24,
          }}>
            {[
              { label: 'TICKET APERTI',      value: ticketAperti.length,  color: ticketAperti.length > 0 ? 'var(--accent-red)' : 'var(--accent)' },
              { label: 'TICKET RISOLTI',     value: ticketRisolti.length, color: 'var(--accent)' },
              { label: 'CHECKLIST OGGI',     value: ultimeEsec.filter(e => new Date(e.data_esecuzione).toDateString() === new Date().toDateString()).length, color: 'var(--accent2)' },
              { label: 'MANUTENZIONI LOG',   value: manutenzioni.length,  color: 'var(--gray)' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--gray-light)', padding: '14px 18px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: k.color, lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#444', marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#444', marginBottom: 10 }}>
              STATO AREE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {(Object.entries(AREE_IMPIANTO) as [AreaImpianto, typeof AREE_IMPIANTO[AreaImpianto]][]).map(([key, meta]) => {
                const ticketArea = ticket.filter(t => t.area === key && t.stato !== 'risolto' && t.stato !== 'chiuso')
                const haBloccante = ticketArea.some(t => t.urgenza === 'bloccante' || t.urgenza === 'alta')
                const haMedia = ticketArea.some(t => t.urgenza === 'media')
                const statoArea = haBloccante ? 'rosso' : haMedia ? 'giallo' : 'verde'

                const colori = {
                  verde:  { bg: 'rgba(200,240,0,0.08)',  border: 'rgba(200,240,0,0.3)',  c: 'var(--accent)',        label: 'OK' },
                  giallo: { bg: 'rgba(255,153,0,0.08)',  border: 'rgba(255,153,0,0.3)', c: 'var(--accent-orange)', label: 'Attenzione' },
                  rosso:  { bg: 'rgba(255,68,68,0.08)',  border: 'rgba(255,68,68,0.3)', c: 'var(--accent-red)',    label: 'Problema' },
                }
                const col = colori[statoArea]

                return (
                  <div key={key} style={{ padding: '16px 18px', border: `1px solid ${col.border}`, background: col.bg, borderLeft: `4px solid ${col.c}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 20 }}>{meta.icona}</span>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, marginTop: 4 }}>
                          {meta.label}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: col.c, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                        {col.label}
                      </div>
                    </div>
                    {ticketArea.length > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
                        {ticketArea.length} ticket {ticketArea.length === 1 ? 'aperto' : 'aperti'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {ticketAperti.filter(t => t.urgenza === 'alta' || t.urgenza === 'bloccante').length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, color: 'var(--accent-red)' }}>
                🔴 Ticket urgenti aperti
              </div>
              {ticketAperti
                .filter(t => t.urgenza === 'alta' || t.urgenza === 'bloccante')
                .map(t => (
                  <div key={t.id} style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                    onClick={() => setTicketDettaglio(t)}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, marginBottom: 4 }}>
                      {AREE_IMPIANTO[t.area as AreaImpianto]?.icona} {t.descrizione_problema.slice(0, 80)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--accent-red)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                      {URGENZA_TICKET[t.urgenza as UrgenzaTicket]?.label}
                      {' · '}{AREE_IMPIANTO[t.area as AreaImpianto]?.label}
                      {' · '}{formatData(t.data_apertura)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB CHECKLIST ── */}
      {tab === 'checklist' && (
        <div>
          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', fontSize: 16, marginBottom: 8 }}>
                Nessuna checklist configurata
              </div>
              <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 20 }}>
                Vuoi caricare le checklist predefinite per club calcio?
              </p>
              <button className="btn btn-primary" onClick={seedChecklist}>
                Carica checklist predefinite →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(Object.entries(AREE_IMPIANTO) as [AreaImpianto, typeof AREE_IMPIANTO[AreaImpianto]][]).map(([area, meta]) => {
                const tempArea = templates.filter(t => t.area === area)
                if (tempArea.length === 0) return null
                return (
                  <div key={area}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#444', padding: '8px 0', marginTop: 8 }}>
                      {meta.icona} {meta.label}
                    </div>
                    {tempArea.map(t => {
                      const ultima = ultimeEsec.filter(e => e.template_id === t.id)[0] ?? null
                      return (
                        <div key={t.id} className="card" style={{ padding: '14px 18px', marginBottom: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, marginBottom: 4 }}>
                                {t.nome}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
                                {FREQUENZA_CHECKLIST[t.frequenza as keyof typeof FREQUENZA_CHECKLIST]?.label}
                                {' · '}{(t.voci as any[]).length} voci
                                {ultima && ` · Ultima: ${formatData(ultima.data_esecuzione)} (${ultima.completata_al}%)`}
                              </div>
                            </div>
                            {ultima && (
                              <div style={{ width: 60, height: 6, background: 'var(--gray-mid)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${ultima.completata_al}%`,
                                  background: ultima.completata_al >= 90 ? 'var(--accent)' : ultima.completata_al >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)',
                                  borderRadius: 3,
                                }} />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB TICKET ── */}
      {tab === 'ticket' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setModalTicket(true)}>
              + Apri nuovo ticket
            </button>
          </div>

          {ticket.length === 0 ? (
            <EmptyState icon="🎫" title="Nessun ticket" subtitle="Nessun problema impianto segnalato" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...ticket]
                .sort((a, b) => {
                  const pA = URGENZA_TICKET[a.urgenza as UrgenzaTicket]?.priorita ?? 0
                  const pB = URGENZA_TICKET[b.urgenza as UrgenzaTicket]?.priorita ?? 0
                  return pB - pA
                })
                .map(t => {
                  const urgMeta  = URGENZA_TICKET[t.urgenza as UrgenzaTicket]
                  const statMeta = STATO_TICKET[t.stato as keyof typeof STATO_TICKET]
                  const areaMeta = AREE_IMPIANTO[t.area as AreaImpianto]
                  const seg = t.segnalato_da_utente as any
                  return (
                    <div key={t.id} className="card"
                      style={{ padding: '14px 18px', cursor: 'pointer', borderLeft: `4px solid ${urgMeta?.colore ?? 'var(--gray)'}` }}
                      onClick={() => setTicketDettaglio(t)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 12 }}>
                              {areaMeta?.icona} {t.descrizione_problema.slice(0, 80)}{t.descrizione_problema.length > 80 && '...'}
                            </span>
                            <span style={{ fontSize: 9, padding: '2px 6px', background: `${urgMeta?.colore}22`, border: `1px solid ${urgMeta?.colore}55`, color: urgMeta?.colore, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                              {urgMeta?.label}
                            </span>
                            <span style={{ fontSize: 9, padding: '2px 6px', background: `${statMeta?.colore}22`, border: `1px solid ${statMeta?.colore}55`, color: statMeta?.colore, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                              {statMeta?.label}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
                            {areaMeta?.label}
                            {' · '}{formatData(t.data_apertura)}
                            {seg && ` · Segnalato da: ${seg.nome} ${seg.cognome}`}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>→</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB MANUTENZIONI ── */}
      {tab === 'manutenzioni' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setModalManutenzione(true)}>
              + Registra manutenzione
            </button>
          </div>

          {manutenzioni.length === 0 ? (
            <EmptyState icon="🔧" title="Nessuna manutenzione" subtitle="Registra gli interventi di manutenzione sull'impianto" />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {manutenzioni.map((m, i) => {
                const areaMeta = AREE_IMPIANTO[m.area as AreaImpianto]
                const scadenzaProx = m.data_prossima_scad
                const giorniAllaScad = scadenzaProx
                  ? Math.ceil((new Date(scadenzaProx).getTime() - Date.now()) / 86400000)
                  : null
                const scadenzaAlert = giorniAllaScad !== null && giorniAllaScad <= 30
                return (
                  <div key={m.id} style={{ padding: '14px 20px', borderBottom: i < manutenzioni.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, marginBottom: 4 }}>
                          {areaMeta?.icona} {m.tipo_intervento}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>{areaMeta?.label}</span>
                          <span>📅 {formatData(m.data_intervento)}</span>
                          {m.fornitore && <span>🏢 {m.fornitore}</span>}
                          {m.costo_consuntivo && <span>💰 {formatEuro(Number(m.costo_consuntivo))}</span>}
                        </div>
                        {scadenzaProx && (
                          <div style={{ fontSize: 10, marginTop: 5, color: scadenzaAlert ? 'var(--accent-orange)' : 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
                            {scadenzaAlert ? '⚠️ ' : '📅 '}
                            Prossima scadenza: {formatData(scadenzaProx)}
                            {giorniAllaScad !== null && ` (${giorniAllaScad} giorni)`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Nuovo ticket */}
      {modalTicket && (
        <Modal open title="Apri ticket problema" onClose={() => setModalTicket(false)} width={480}>
          <FormField label="Area impianto" required>
            <Select
              value={formTicket.area}
              onChange={v => setFormTicket(p => ({ ...p, area: v as AreaImpianto }))}
              options={Object.entries(AREE_IMPIANTO).map(([k, v]) => ({ value: k, label: `${v.icona} ${v.label}` }))}
            />
          </FormField>
          <FormField label="Descrizione problema" required>
            <textarea className="input" rows={3}
              value={formTicket.descrizione_problema}
              onChange={e => setFormTicket(p => ({ ...p, descrizione_problema: e.target.value }))}
              placeholder="Descrivi il problema in modo chiaro..." />
          </FormField>
          <FormField label="Urgenza">
            <Select
              value={formTicket.urgenza}
              onChange={v => setFormTicket(p => ({ ...p, urgenza: v as UrgenzaTicket }))}
              options={Object.entries(URGENZA_TICKET).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </FormField>
          <div style={{ fontSize: 12, color: 'var(--accent-orange)', padding: '10px 12px', background: 'rgba(255,153,0,0.08)', border: '1px solid rgba(255,153,0,0.3)', marginTop: 8 }}>
            ⚠️ Ticket con urgenza "Alta" o "Bloccante" inviano una notifica immediata al presidente e al DG.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => setModalTicket(false)}>Annulla</button>
            <button className="btn btn-primary" onClick={salvaTicket} disabled={salvando}>
              {salvando ? 'Invio...' : 'Apri ticket →'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Dettaglio ticket */}
      {ticketDettaglio && (
        <Modal open title="Gestisci ticket" onClose={() => setTicketDettaglio(null)} width={500}>
          <div style={{ padding: '14px 16px', background: 'var(--gray-mid)', border: '1px solid var(--border)', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 13, marginBottom: 6 }}>
              {AREE_IMPIANTO[ticketDettaglio.area as AreaImpianto]?.icona}{' '}
              {ticketDettaglio.descrizione_problema}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
              Urgenza: {URGENZA_TICKET[ticketDettaglio.urgenza as UrgenzaTicket]?.label}
              {' · '}{formatData(ticketDettaglio.data_apertura)}
            </div>
          </div>
          <FormField label="Assegna a">
            <Select
              value={ticketDettaglio.assegnato_a ?? ''}
              onChange={v => setTicketDettaglio((p: any) => ({ ...p, assegnato_a: v }))}
              placeholder="Seleziona responsabile..."
              options={utenti.map(u => ({ value: u.id, label: `${u.cognome} ${u.nome} (${u.ruolo})` }))}
            />
          </FormField>
          <FormField label="Aggiorna stato">
            <Select
              value={ticketDettaglio.stato}
              onChange={v => setTicketDettaglio((p: any) => ({ ...p, stato: v }))}
              options={Object.entries(STATO_TICKET).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </FormField>
          {(ticketDettaglio.stato === 'risolto' || ticketDettaglio.stato === 'chiuso') && (
            <FormField label="Note risoluzione">
              <textarea className="input" rows={2}
                value={ticketDettaglio.note_risoluzione ?? ''}
                onChange={e => setTicketDettaglio((p: any) => ({ ...p, note_risoluzione: e.target.value }))}
                placeholder="Come è stato risolto il problema?" />
            </FormField>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => setTicketDettaglio(null)}>Annulla</button>
            <button className="btn btn-primary" onClick={() => aggiornaTicket(ticketDettaglio.id, {
              stato: ticketDettaglio.stato,
              assegnato_a: ticketDettaglio.assegnato_a,
              note_risoluzione: ticketDettaglio.note_risoluzione,
            })}>
              Salva →
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Nuova manutenzione */}
      {modalManutenzione && (
        <Modal open title="Registra manutenzione" onClose={() => setModalManutenzione(false)} width={540}>
          <FormGrid cols={2}>
            <FormField label="Area impianto" required>
              <Select
                value={formMan.area}
                onChange={v => setFormMan(p => ({ ...p, area: v as AreaImpianto }))}
                options={Object.entries(AREE_IMPIANTO).map(([k, v]) => ({ value: k, label: `${v.icona} ${v.label}` }))}
              />
            </FormField>
            <FormField label="Data intervento" required>
              <input className="input" type="date" value={formMan.data_intervento}
                onChange={e => setFormMan(p => ({ ...p, data_intervento: e.target.value }))} />
            </FormField>
          </FormGrid>
          <FormField label="Tipo intervento" required>
            <input className="input" value={formMan.tipo_intervento}
              onChange={e => setFormMan(p => ({ ...p, tipo_intervento: e.target.value }))}
              placeholder="Es. Pulizia impianto idrico, riparazione docce..." />
          </FormField>
          <FormGrid cols={2}>
            <FormField label="Fornitore">
              <input className="input" value={formMan.fornitore}
                onChange={e => setFormMan(p => ({ ...p, fornitore: e.target.value }))}
                placeholder="Nome azienda o tecnico" />
            </FormField>
            <FormField label="Prossima scadenza">
              <input className="input" type="date" value={formMan.data_prossima_scad}
                onChange={e => setFormMan(p => ({ ...p, data_prossima_scad: e.target.value }))} />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Costo preventivo (€)">
              <input className="input" type="number" step="0.01" value={formMan.costo_preventivo}
                onChange={e => setFormMan(p => ({ ...p, costo_preventivo: e.target.value }))}
                placeholder="0.00" />
            </FormField>
            <FormField label="Costo consuntivo (€)">
              <input className="input" type="number" step="0.01" value={formMan.costo_consuntivo}
                onChange={e => setFormMan(p => ({ ...p, costo_consuntivo: e.target.value }))}
                placeholder="0.00" />
            </FormField>
          </FormGrid>
          <FormField label="Note">
            <textarea className="input" rows={2} value={formMan.note}
              onChange={e => setFormMan(p => ({ ...p, note: e.target.value }))} />
          </FormField>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setModalManutenzione(false)}>Annulla</button>
            <button className="btn btn-primary" onClick={salvaMan} disabled={salvando}>
              {salvando ? 'Salvataggio...' : 'Registra →'}
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo as any} onClose={() => setToast(null)} />}
    </div>
  )
}
