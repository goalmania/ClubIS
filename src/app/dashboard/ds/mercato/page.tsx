'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Drawer, FormSection, FormField, FormGrid, Select, Toast, TabBar,
} from '@/components/ui'
import { useSharedData } from '@/hooks/useSharedData'
import FeatureGate from '@/components/FeatureGate'

type Trattativa = {
  id: string
  nome_giocatore: string | null
  giocatore_id: string | null
  club_provenienza: string | null
  club_destinazione: string | null
  tipo: string
  stato: string
  importo_richiesto: number | null
  importo_offerto: number | null
  importo_accordo: number | null
  procuratore: string | null
  data_scadenza: string | null
  note: string | null
  giocatori?: { nome: string; cognome: string } | null
}

const STATI = [
  { key: 'esplorazione', label: 'Esplorazione', c: 'var(--text-muted)' },
  { key: 'contatto',     label: 'Contatto',     c: 'var(--accent-blue)' },
  { key: 'proposta',     label: 'Proposta',      c: 'var(--accent-orange)' },
  { key: 'trattativa',   label: 'Trattativa',    c: 'var(--accent-purple)' },
  { key: 'conclusa',     label: 'Conclusa',      c: 'var(--accent-green)' },
  { key: 'saltata',      label: 'Saltata',        c: 'var(--accent-red)' },
]

const TIPI = [
  { value: 'acquisto',    label: 'Acquisto' },
  { value: 'cessione',    label: 'Cessione' },
  { value: 'prestito_in', label: 'Prestito in' },
  { value: 'prestito_out',label: 'Prestito out' },
  { value: 'svincolo',    label: 'Svincolo' },
]

const fmt = (n: number | null) =>
  n ? n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : null

export default function DSMercatoPage() {
  const supabase = createClient()
  const [clubId, setClubId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [trattative, setTrattative] = useState<Trattativa[]>([])
  const [giocatoriDB, setGiocatoriDB] = useState<any[]>([])

  // Drawer state
  const [openDrawer, setOpenDrawer] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  // Tab
  const [tabStato, setTabStato] = useState('tutti')

  // Form state
  const [tipoGioc, setTipoGioc] = useState<'db' | 'esterno'>('esterno')
  const [giocSel, setGiocSel] = useState('')
  const [nomeGioc, setNomeGioc] = useState('')
  const [cognomeGioc, setCognomeGioc] = useState('')
  const [clubAttuale, setClubAttuale] = useState('')
  const [tipo, setTipo] = useState('acquisto')
  const [stato, setStato] = useState('esplorazione')
  const [dataContatto, setDataContatto] = useState('')
  const [impRichiesto, setImpRichiesto] = useState('')
  const [impOfferto, setImpOfferto] = useState('')
  const [impAccordo, setImpAccordo] = useState('')
  const [procuratore, setProcuratore] = useState('')
  const [clubProv, setClubProv] = useState('')
  const [clubDest, setClubDest] = useState('')
  const [dataScadenza, setDataScadenza] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return
    setClubId(utente.club_id)

    const [{ data: tratt }, { data: scout }] = await Promise.all([
      supabase.from('trattative')
        .select('*, giocatori(nome, cognome)')
        .eq('club_id', utente.club_id)
        .order('created_at', { ascending: false }),
      supabase.from('report_scouting')
        .select('id, giocatore_id, nome_giocatore_ext, club_attuale_ext, giocatori(nome, cognome, ruolo_principale)')
        .eq('club_richiedente_id', utente.club_id)
        .order('created_at', { ascending: false }),
    ])
    setTrattative(tratt ?? [])

    // deduplicate: prefer giocatore_id key, fallback to nome_giocatore_ext
    const seen = new Set<string>()
    const dedup = (scout ?? []).filter((r: any) => {
      const key = r.giocatore_id ?? r.nome_giocatore_ext ?? r.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).map((r: any) => ({
      id: r.id,
      giocatore_id: r.giocatore_id ?? null,
      nome: r.giocatori
        ? `${r.giocatori.cognome} ${r.giocatori.nome}`
        : (r.nome_giocatore_ext ?? '—'),
      club_attuale: r.club_attuale_ext ?? null,
      ruolo: r.giocatori?.ruolo_principale ?? null,
    }))
    setGiocatoriDB(dedup)
  }, [])

  useSharedData(load)

  const resetForm = () => {
    setTipoGioc('esterno'); setGiocSel(''); setNomeGioc(''); setCognomeGioc('')
    setClubAttuale(''); setTipo('acquisto'); setStato('esplorazione')
    setDataContatto(''); setImpRichiesto(''); setImpOfferto(''); setImpAccordo('')
    setProcuratore(''); setClubProv(''); setClubDest(''); setDataScadenza(''); setNote('')
  }

  const salva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clubId) return
    setSaving(true)

    const scoutSel = tipoGioc === 'db' ? giocatoriDB.find((g: any) => g.id === giocSel) : null
    const nomeFinale = tipoGioc === 'db'
      ? (scoutSel?.nome ?? '')
      : `${cognomeGioc} ${nomeGioc}`.trim()

    const { error } = await supabase.from('trattative').insert({
      club_id: clubId,
      giocatore_id: scoutSel?.giocatore_id ?? null,
      nome_giocatore: nomeFinale || null,
      giocatore_nome: nomeFinale || '—',
      club_provenienza: clubProv || scoutSel?.club_attuale || clubAttuale || null,
      club_destinazione: clubDest || null,
      tipo,
      stato,
      importo_richiesto: impRichiesto ? parseFloat(impRichiesto) : null,
      importo_offerto:   impOfferto   ? parseFloat(impOfferto)   : null,
      importo_accordo:   impAccordo   ? parseFloat(impAccordo)   : null,
      procuratore: procuratore || null,
      note: note || null,
      data_contatto: dataContatto || null,
      data_scadenza: dataScadenza || null,
      ds_responsabile: userId,
    })

    setSaving(false)
    if (error) { setToast({ msg: error.message, tipo: 'error' }); return }
    setToast({ msg: 'Trattativa salvata', tipo: 'success' })
    setOpenDrawer(false)
    resetForm()
    load()
  }

  const filtered = tabStato === 'tutti'
    ? trattative
    : trattative.filter(t => t.stato === tabStato)

  const nomeDisplay = (t: Trattativa) =>
    t.giocatori ? `${(t.giocatori as any).cognome} ${(t.giocatori as any).nome}` : t.nome_giocatore ?? '—'

  const statoInfo = (s: string) => STATI.find(x => x.key === s) ?? { label: s, c: 'var(--text-muted)' }

  return (
    <FeatureGate feature="trattative_mercato" featureLabel="Trattative di Mercato">
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Mercato</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Pipeline trattative</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setOpenDrawer(true)}>
          + Nuova trattativa
        </button>
      </div>

      {/* TabBar */}
      <TabBar
        tabs={[
          { key: 'tutti', label: 'Tutte', count: trattative.length },
          ...STATI.map(s => ({
            key: s.key,
            label: s.label,
            count: trattative.filter(t => t.stato === s.key).length,
          })),
        ]}
        active={tabStato}
        onChange={setTabStato}
      />

      {/* Tabella trattative */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Giocatore</th>
                <th>Tipo</th>
                <th>Stato</th>
                <th>Club</th>
                <th>Importo</th>
                <th>Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 13 }}>
                    Nessuna trattativa{tabStato !== 'tutti' ? ` in stato "${statoInfo(tabStato).label}"` : ''}
                  </td>
                </tr>
              ) : filtered.map(t => {
                const si = statoInfo(t.stato)
                const importo = fmt(t.importo_accordo ?? t.importo_offerto ?? t.importo_richiesto)
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{nomeDisplay(t)}</td>
                    <td>
                      <span className="badge badge-grigio" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                        {TIPI.find(x => x.value === t.tipo)?.label ?? t.tipo}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: si.c + '22', color: si.c }}>
                        {si.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {t.club_provenienza ?? t.club_destinazione ?? '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>
                      {importo ?? '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {t.data_scadenza ? new Date(t.data_scadenza).toLocaleDateString('it-IT') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer nuova trattativa */}
      <Drawer open={openDrawer} onClose={() => { setOpenDrawer(false); resetForm() }} title="Nuova trattativa" width={640}>
        <form onSubmit={salva}>
          <FormSection title="Giocatore">
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {(['db', 'esterno'] as const).map(v => (
                <button key={v} type="button"
                  className={`btn btn-sm ${tipoGioc === v ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTipoGioc(v)}>
                  {v === 'db' ? 'Da report scouting' : 'Giocatore esterno'}
                </button>
              ))}
            </div>
            {tipoGioc === 'db' ? (
              <FormField label="Giocatore" required>
                <Select value={giocSel} onChange={setGiocSel}
                  placeholder="Seleziona giocatore..."
                  options={(giocatoriDB as any[]).map(g => ({
                    value: g.id,
                    label: [g.nome, g.ruolo && `· ${g.ruolo}`, g.club_attuale && `(${g.club_attuale})`].filter(Boolean).join(' '),
                  }))} />
              </FormField>
            ) : (
              <FormGrid cols={2}>
                <FormField label="Nome" required>
                  <input className="input" value={nomeGioc} onChange={e => setNomeGioc(e.target.value)} placeholder="Nome" />
                </FormField>
                <FormField label="Cognome" required>
                  <input className="input" value={cognomeGioc} onChange={e => setCognomeGioc(e.target.value)} placeholder="Cognome" />
                </FormField>
              </FormGrid>
            )}
            {tipoGioc === 'esterno' && (
              <FormField label="Club attuale">
                <input className="input" value={clubAttuale} onChange={e => setClubAttuale(e.target.value)} placeholder="Club di provenienza" />
              </FormField>
            )}
          </FormSection>

          <FormSection title="Tipo operazione">
            <FormField label="Tipo" required>
              <Select value={tipo} onChange={setTipo} options={TIPI} />
            </FormField>
            <FormGrid cols={2}>
              <FormField label="Stato">
                <Select value={stato} onChange={setStato} options={STATI.map(s => ({ value: s.key, label: s.label }))} />
              </FormField>
              <FormField label="Data contatto">
                <input className="input" type="date" value={dataContatto} onChange={e => setDataContatto(e.target.value)} />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Importi">
            <FormGrid cols={3}>
              <FormField label="Importo richiesto (€)">
                <input className="input" type="number" value={impRichiesto} onChange={e => setImpRichiesto(e.target.value)} placeholder="0" min="0" step="0.01" />
              </FormField>
              <FormField label="Importo offerto (€)">
                <input className="input" type="number" value={impOfferto} onChange={e => setImpOfferto(e.target.value)} placeholder="0" min="0" step="0.01" />
              </FormField>
              <FormField label="Importo accordo (€)">
                <input className="input" type="number" value={impAccordo} onChange={e => setImpAccordo(e.target.value)} placeholder="0" min="0" step="0.01" />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Dettagli">
            <FormField label="Procuratore">
              <input className="input" value={procuratore} onChange={e => setProcuratore(e.target.value)} placeholder="Nome procuratore" />
            </FormField>
            <FormGrid cols={2}>
              {tipo === 'acquisto' || tipo === 'prestito_in' ? (
                <FormField label="Club provenienza">
                  <input className="input" value={clubProv} onChange={e => setClubProv(e.target.value)} placeholder="Club cedente" />
                </FormField>
              ) : (
                <FormField label="Club destinazione">
                  <input className="input" value={clubDest} onChange={e => setClubDest(e.target.value)} placeholder="Club acquirente" />
                </FormField>
              )}
              <FormField label="Deadline trattativa" hint="Data entro cui deve concludersi">
                <input className="input" type="date" value={dataScadenza} onChange={e => setDataScadenza(e.target.value)} />
              </FormField>
            </FormGrid>
            <FormField label="Note">
              <textarea className="input" value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ resize: 'vertical' }} placeholder="Annotazioni sulla trattativa..." />
            </FormField>
          </FormSection>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => { setOpenDrawer(false); resetForm() }}>
              Annulla
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvo...' : 'Salva trattativa'}
            </button>
          </div>
        </form>
      </Drawer>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
    </FeatureGate>
  )
}
