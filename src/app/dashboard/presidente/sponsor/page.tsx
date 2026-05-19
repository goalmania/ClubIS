'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Modal, FormField, FormGrid, FormSection,
  Select, Toast, TabBar,
} from '@/components/ui'
import { formatEuro, formatData, giorniAlla } from '@/lib/helpers'

const tipoBadge: Record<string, string> = {
  main: 'badge-viola', gold: 'badge-ambra', silver: 'badge-grigio',
  bronze: 'badge-grigio', tecnico: 'badge-blu', media: 'badge-blu',
}
const statoBadge: Record<string, string> = {
  attivo: 'badge-verde', in_trattativa: 'badge-ambra',
  scaduto: 'badge-rosso', rescisso: 'badge-grigio',
}

const TIPO_OPTIONS = [
  { value: 'main',    label: 'Main Sponsor' },
  { value: 'gold',    label: 'Gold' },
  { value: 'silver',  label: 'Silver' },
  { value: 'bronze',  label: 'Bronze' },
  { value: 'tecnico', label: 'Tecnico' },
  { value: 'media',   label: 'Media' },
]
const STATO_OPTIONS = [
  { value: 'attivo',        label: 'Attivo' },
  { value: 'in_trattativa', label: 'In trattativa' },
  { value: 'scaduto',       label: 'Scaduto' },
  { value: 'rescisso',      label: 'Rescisso' },
]
const TAB_OPTIONS = [
  { key: 'attivo',        label: 'Attivi' },
  { key: 'in_trattativa', label: 'In trattativa' },
  { key: 'scaduto',       label: 'Scaduti' },
  { key: 'tutti',         label: 'Tutti' },
]

export default function SponsorPage() {
  const supabase = createClient()

  const [sponsors, setSponsors] = useState<any[]>([])
  const [clubId, setClubId] = useState('')
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [editingSponsor, setEditingSponsor] = useState<any | null>(null)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [tabAttiva, setTabAttiva] = useState('attivo')

  const [nome, setNome] = useState('')
  const [ragioneSociale, setRagioneSociale] = useState('')
  const [settore, setSettore] = useState('')
  const [referenteNome, setReferenteNome] = useState('')
  const [referenteEmail, setReferenteEmail] = useState('')
  const [referenteTel, setReferenteTel] = useState('')
  const [sitoWeb, setSitoWeb] = useState('')
  const [tipo, setTipo] = useState('silver')
  const [importoAnnuo, setImportoAnnuo] = useState('')
  const [dataInizio, setDataInizio] = useState('')
  const [dataScadenza, setDataScadenza] = useState('')
  const [stato, setStato] = useState('attivo')
  const [benefici, setBenefici] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
      setClubId(utente!.club_id)
      const { data } = await supabase
        .from('sponsors')
        .select('*')
        .eq('club_id', utente!.club_id)
        .order('tipo')
        .order('importo_annuo', { ascending: false })
      setSponsors(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function ricarica(cid: string) {
    const { data } = await supabase
      .from('sponsors').select('*').eq('club_id', cid)
      .order('tipo').order('importo_annuo', { ascending: false })
    setSponsors(data ?? [])
  }

  function apriNuovo() {
    setEditingSponsor(null)
    setNome(''); setRagioneSociale(''); setSettore('')
    setReferenteNome(''); setReferenteEmail(''); setReferenteTel('')
    setSitoWeb(''); setTipo('silver'); setImportoAnnuo('')
    setDataInizio(''); setDataScadenza(''); setStato('attivo')
    setBenefici(''); setNote('')
    setOpenModal(true)
  }

  function apriModifica(s: any) {
    setEditingSponsor(s)
    setNome(s.nome ?? ''); setRagioneSociale(s.ragione_sociale ?? '')
    setSettore(s.settore ?? ''); setReferenteNome(s.referente_nome ?? '')
    setReferenteEmail(s.referente_email ?? ''); setReferenteTel(s.referente_telefono ?? '')
    setSitoWeb(s.sito_web ?? ''); setTipo(s.tipo ?? 'silver')
    setImportoAnnuo(s.importo_annuo?.toString() ?? '')
    setDataInizio(s.data_inizio ?? ''); setDataScadenza(s.data_scadenza ?? '')
    setStato(s.stato ?? 'attivo'); setBenefici(s.benefici ?? ''); setNote(s.note ?? '')
    setOpenModal(true)
  }

  async function salva() {
    if (!nome.trim()) { setToast({ msg: 'Nome sponsor obbligatorio', tipo: 'error' }); return }
    setSaving(true)
    const payload = {
      club_id: clubId,
      nome: nome.trim(),
      ragione_sociale: ragioneSociale || null,
      settore: settore || null,
      referente_nome: referenteNome || null,
      referente_email: referenteEmail || null,
      referente_telefono: referenteTel || null,
      sito_web: sitoWeb || null,
      tipo,
      importo_annuo: importoAnnuo ? parseFloat(importoAnnuo) : null,
      data_inizio: dataInizio || null,
      data_scadenza: dataScadenza || null,
      stato,
      benefici: benefici || null,
      note: note || null,
      updated_at: new Date().toISOString(),
    }
    let error
    if (editingSponsor) {
      ;({ error } = await supabase.from('sponsors').update(payload).eq('id', editingSponsor.id))
    } else {
      ;({ error } = await supabase.from('sponsors').insert(payload))
    }
    setSaving(false)
    if (error) { setToast({ msg: error.message, tipo: 'error' }); return }
    await ricarica(clubId)
    setOpenModal(false)
    setToast({ msg: editingSponsor ? 'Sponsor aggiornato' : 'Sponsor aggiunto', tipo: 'success' })
  }

  // KPI
  const attivi = sponsors.filter(s => s.stato === 'attivo')
  const totAnnuo = attivi.reduce((acc, s) => acc + Number(s.importo_annuo ?? 0), 0)
  const in60gg = attivi.filter(s => s.data_scadenza && giorniAlla(s.data_scadenza) < 60 && giorniAlla(s.data_scadenza) >= 0)
  const trattativa = sponsors.filter(s => s.stato === 'in_trattativa')
  const sponsorsFiltrati = tabAttiva === 'tutti' ? sponsors : sponsors.filter(s => s.stato === tabAttiva)
  const tabs = TAB_OPTIONS.map(t => ({
    ...t,
    count: t.key === 'tutti' ? sponsors.length : sponsors.filter(s => s.stato === t.key).length,
  }))

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Caricamento...</div>

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Sponsor</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Gestione partnership e ricavi commerciali
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={apriNuovo} data-onboarding="btn-aggiungi-sponsor">+ Nuovo sponsor</button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Sponsor attivi</div>
          <div className="stat-value">{attivi.length}</div>
          <div className="stat-sub">{sponsors.length} totali</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Valore totale annuo</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--accent-green)' }}>
            {totAnnuo > 0 ? formatEuro(totAnnuo) : '—'}
          </div>
          <div className="stat-sub">da sponsor attivi</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In scadenza (60gg)</div>
          <div className="stat-value" style={{ color: in60gg.length > 0 ? 'var(--accent-orange)' : 'var(--text-primary)' }}>
            {in60gg.length}
          </div>
          <div className="stat-sub">richiedono rinnovo</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In trattativa</div>
          <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{trattativa.length}</div>
          <div className="stat-sub">potenziali partner</div>
        </div>
      </div>

      {/* Tab + griglia */}
      <TabBar tabs={tabs} active={tabAttiva} onChange={setTabAttiva} />

      {sponsorsFiltrati.length === 0 ? (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Nessuno sponsor in questa categoria
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {sponsorsFiltrati.map(s => {
            const gg = s.data_scadenza ? giorniAlla(s.data_scadenza) : null
            return (
              <div key={s.id} className="card" style={{ padding: 20 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {s.nome}
                    </div>
                    {s.ragione_sociale && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.ragione_sociale}</div>
                    )}
                  </div>
                  <span className={`badge ${tipoBadge[s.tipo] ?? 'badge-grigio'}`} style={{ marginLeft: 8, flexShrink: 0 }}>
                    {s.tipo}
                  </span>
                </div>

                {/* Importo */}
                {s.importo_annuo && (
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-green)', marginBottom: 12 }}>
                    {formatEuro(Number(s.importo_annuo))}/anno
                  </div>
                )}

                {s.referente_nome && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    👤 {s.referente_nome}
                  </div>
                )}
                {s.referente_email && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    ✉ {s.referente_email}
                  </div>
                )}
                {s.sito_web && (
                  <div style={{ fontSize: 12, color: 'var(--accent-blue)', marginBottom: 4 }}>
                    🌐 {s.sito_web}
                  </div>
                )}
                {s.settore && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                    Settore: {s.settore}
                  </div>
                )}

                {s.data_scadenza && (
                  <div style={{
                    fontSize: 12, marginBottom: 8,
                    color: gg !== null && gg < 60 ? 'var(--accent-orange)' : 'var(--text-muted)',
                  }}>
                    Scade: {formatData(s.data_scadenza)}
                    {gg !== null && gg < 60 && gg >= 0 && ` (${gg}gg)`}
                    {gg !== null && gg < 0 && ' — scaduto'}
                  </div>
                )}

                {s.benefici && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.4 }}>
                    {s.benefici}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => apriModifica(s)}>
                    Modifica
                  </button>
                  <span className={`badge ${statoBadge[s.stato] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>
                    {s.stato?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={editingSponsor ? 'Modifica sponsor' : 'Nuovo sponsor'}
        width={680}
      >
        <FormSection title="Dati azienda">
          <FormGrid cols={2}>
            <FormField label="Nome sponsor" required>
              <input className="input" value={nome} onChange={e => setNome(e.target.value)} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Ragione sociale">
              <input className="input" value={ragioneSociale} onChange={e => setRagioneSociale(e.target.value)} style={{ width: '100%' }} />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Settore">
              <input className="input" placeholder="es. Abbigliamento sportivo" value={settore} onChange={e => setSettore(e.target.value)} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Sito web">
              <input className="input" type="url" value={sitoWeb} onChange={e => setSitoWeb(e.target.value)} style={{ width: '100%' }} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Referente">
          <FormGrid cols={3}>
            <FormField label="Nome referente">
              <input className="input" value={referenteNome} onChange={e => setReferenteNome(e.target.value)} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Email">
              <input className="input" type="email" value={referenteEmail} onChange={e => setReferenteEmail(e.target.value)} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Telefono">
              <input className="input" type="tel" value={referenteTel} onChange={e => setReferenteTel(e.target.value)} style={{ width: '100%' }} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Contratto">
          <FormGrid cols={2}>
            <FormField label="Tipo sponsor">
              <Select value={tipo} onChange={setTipo} options={TIPO_OPTIONS} />
            </FormField>
            <FormField label="Importo annuo (€)">
              <input className="input" type="number" min={0} value={importoAnnuo} onChange={e => setImportoAnnuo(e.target.value)} style={{ width: '100%' }} />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Data inizio">
              <input className="input" type="date" value={dataInizio} onChange={e => setDataInizio(e.target.value)} style={{ width: '100%' }} />
            </FormField>
            <FormField label="Data scadenza">
              <input className="input" type="date" value={dataScadenza} onChange={e => setDataScadenza(e.target.value)} style={{ width: '100%' }} />
            </FormField>
          </FormGrid>
          <FormField label="Stato">
            <Select value={stato} onChange={setStato} options={STATO_OPTIONS} />
          </FormField>
          <FormField label="Benefici sponsor" hint="Cosa riceve in cambio (logo maglia, banner, ecc.)">
            <textarea className="input" rows={2} value={benefici} onChange={e => setBenefici(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
          </FormField>
          <FormField label="Note interne">
            <textarea className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
          </FormField>
        </FormSection>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setOpenModal(false)}>Annulla</button>
          <button className="btn btn-primary btn-sm" onClick={salva} disabled={saving}>
            {saving ? 'Salvataggio...' : editingSponsor ? 'Aggiorna' : 'Aggiungi'}
          </button>
        </div>
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
