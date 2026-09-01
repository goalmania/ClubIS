'use client'
import FeatureGate from '@/components/FeatureGate'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { matchSearch } from '@/lib/search'
import { PageHeader, StatCard, Drawer, Toast } from '@/components/ui'

type Utente = { id: string; nome: string; cognome: string; ruolo: string; email?: string }
type Collaboratore = {
  id: string
  utente_id: string | null
  nome_esterno: string | null
  cognome_esterno: string | null
  ruolo_esterno: string | null
  tipo_contratto: 'cococo' | 'autonomo' | 'dipendente' | 'volontario'
  codice_fiscale: string
  iban: string | null
  compenso_mensile: number | null
  compenso_annuale: number
  erogato_anno_corrente: number
  data_inizio: string
  data_fine: string | null
  attivo: boolean
  utenti: Utente | null
}

const roleLabel: Record<string, string> = {
  presidente: 'Presidente', ds: 'Dir. Sportivo', segretario: 'Segretario',
  allenatore: 'Allenatore', osservatore: 'Osservatore', medico: 'Medico',
  team_manager: 'Team Manager', ufficio_stampa: 'Ufficio Stampa',
}
const roleBadge: Record<string, string> = {
  presidente: 'badge-viola', ds: 'badge-blu', segretario: 'badge-verde',
  allenatore: 'badge-ambra', osservatore: 'badge-grigio', medico: 'badge-rosso',
  team_manager: 'badge-blu', ufficio_stampa: 'badge-ambra',
}
const contrattoLabel: Record<string, string> = {
  cococo: 'Co.co.co.', autonomo: 'Lavoro autonomo', dipendente: 'Dipendente', volontario: 'Volontario',
}

const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export default function StaffAnagraficaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [collaboratori, setCollaboratori] = useState<Collaboratore[]>([])
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [soloAttivi, setSoloAttivi] = useState(true)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Collaboratore | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const ruoliStaff = 'presidente,ds,allenatore,segretario,team_manager,ufficio_stampa,medico,osservatore'
    const [resC, resU] = await Promise.all([
      fetch('/api/staff/collaboratori'),
      fetch(`/api/staff?ruoli=${ruoliStaff}`),
    ])
    if (resC.ok) setCollaboratori(await resC.json() ?? [])
    if (resU.ok) setUtenti(await resU.json() ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Se arriviamo da un link "gestisci compenso" su un membro specifico
  useEffect(() => {
    const apri = searchParams.get('nuovo')
    if (apri === '1') { setEditing(null); setDrawerOpen(true) }
  }, [searchParams])

  const utentiSenzaContratto = utenti.filter(u => !collaboratori.some(c => c.utente_id === u.id && c.attivo))

  const filtrati = collaboratori.filter(c => {
    if (soloAttivi && !c.attivo) return false
    const nome = c.utenti?.nome ?? c.nome_esterno ?? ''
    const cognome = c.utenti?.cognome ?? c.cognome_esterno ?? ''
    return !filtro || matchSearch(filtro, nome, cognome)
  })

  const attivi = collaboratori.filter(c => c.attivo)
  const totMensile = attivi.reduce((s, c) => s + Number(c.compenso_mensile ?? 0), 0)
  const totAnnuale = totMensile * 12
  const totErogato = attivi.reduce((s, c) => s + c.erogato_anno_corrente, 0)

  const apriNuovo = () => { setEditing(null); setDrawerOpen(true) }
  const apriModifica = (c: Collaboratore) => { setEditing(c); setDrawerOpen(true) }
  const chiudiDrawer = () => { setDrawerOpen(false); setEditing(null); router.replace('/dashboard/segretario/staff') }

  const salva = async (payload: Record<string, any>) => {
    setSaving(true)
    const url = editing ? `/api/staff/collaboratori/${editing.id}` : '/api/staff/collaboratori'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setToast({ msg: data.error ?? 'Errore durante il salvataggio', tipo: 'error' }); return }
    setToast({ msg: editing ? 'Membro staff aggiornato' : 'Membro staff aggiunto', tipo: 'success' })
    chiudiDrawer()
    load()
  }

  const toggleAttivo = async (c: Collaboratore) => {
    const res = await fetch(`/api/staff/collaboratori/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !c.attivo }),
    })
    if (!res.ok) { setToast({ msg: 'Errore aggiornamento stato', tipo: 'error' }); return }
    setToast({ msg: c.attivo ? 'Contratto disattivato' : 'Contratto riattivato', tipo: 'success' })
    load()
  }

  const elimina = async (c: Collaboratore) => {
    const nome = `${c.utenti?.cognome ?? c.cognome_esterno ?? ''} ${c.utenti?.nome ?? c.nome_esterno ?? ''}`.trim()
    if (!confirm(`Eliminare definitivamente ${nome} dallo staff? Verrà rimossa anche la relativa voce di costo futuro dal budget stagionale. I pagamenti già registrati in prima nota restano invariati.`)) return
    const res = await fetch(`/api/staff/collaboratori/${c.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setToast({ msg: data.error ?? 'Errore durante l\'eliminazione', tipo: 'error' })
      return
    }
    setToast({ msg: `${nome} eliminato dallo staff`, tipo: 'success' })
    load()
  }

  return (
    <FeatureGate feature="compensi_staff" featureLabel="Anagrafica Staff">
      <div>
        <PageHeader
          title="Anagrafica Staff"
          subtitle="Ruoli, contratti e compensi del personale — mensile e annuale"
          actions={
            <button className="btn btn-primary btn-sm" onClick={apriNuovo}>+ Aggiungi membro staff</button>
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <StatCard label="Membri staff attivi" value={attivi.length} />
          <StatCard label="Costo mensile" value={fmt(totMensile)} />
          <StatCard label="Costo annuale previsto" value={fmt(totAnnuale)} />
          <StatCard label={`Erogato ${new Date().getFullYear()}`} value={fmt(totErogato)} color="var(--verde)" />
        </div>

        <div className="card" style={{ padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--grigio-4)' }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input className="input" style={{ paddingLeft: 36 }} placeholder="Cerca per nome o cognome..."
              value={filtro} onChange={e => setFiltro(e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--grigio-3)', cursor: 'pointer' }}>
            <input type="checkbox" checked={soloAttivi} onChange={e => setSoloAttivi(e.target.checked)} />
            Solo contratti attivi
          </label>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>Caricamento staff...</div>
          ) : filtrati.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>
              {filtro ? 'Nessun membro corrisponde alla ricerca' : 'Nessun membro dello staff registrato. Aggiungi il primo!'}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Membro staff</th>
                    <th>Ruolo</th>
                    <th>Contratto</th>
                    <th>Compenso mensile</th>
                    <th>Compenso annuale</th>
                    <th>Erogato {new Date().getFullYear()}</th>
                    <th>Stato</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrati.map(c => {
                    const u = c.utenti
                    const nome = u?.nome ?? c.nome_esterno ?? '—'
                    const cognome = u?.cognome ?? c.cognome_esterno ?? ''
                    const ruolo = u?.ruolo ?? null
                    const ruoloEsternoLabel = c.ruolo_esterno || 'Collaboratore esterno'
                    const iniziali = `${nome[0] ?? ''}${cognome[0] ?? ''}`.toUpperCase() || '?'
                    const linkPagamento = u
                      ? `/dashboard/segretario/compensi?collaboratore=${u.id}&apri=1`
                      : `/dashboard/segretario/compensi?nome_esterno=${encodeURIComponent(`${nome} ${cognome}`.trim())}&cf_esterno=${encodeURIComponent(c.codice_fiscale)}&apri=1`
                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{iniziali}</div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 500 }}>{cognome} {nome}</div>
                              <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>{c.codice_fiscale}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {ruolo ? (
                            <span className={`badge ${roleBadge[ruolo] ?? 'badge-grigio'}`} style={{ fontSize: 11 }}>
                              {roleLabel[ruolo] ?? ruolo}
                            </span>
                          ) : (
                            <span className="badge badge-grigio" style={{ fontSize: 11 }}>{ruoloEsternoLabel}</span>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--grigio-3)' }}>{contrattoLabel[c.tipo_contratto] ?? c.tipo_contratto}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {c.compenso_mensile ? fmt(Number(c.compenso_mensile)) : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {c.compenso_annuale ? fmt(c.compenso_annuale) : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--verde)', fontWeight: 600 }}>
                          {fmt(c.erogato_anno_corrente)}
                        </td>
                        <td>
                          {c.attivo
                            ? <span className="badge badge-verde" style={{ fontSize: 11 }}>Attivo</span>
                            : <span className="badge badge-rosso" style={{ fontSize: 11 }}>Cessato</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <a href={linkPagamento} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                              Registra pagamento
                            </a>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => apriModifica(c)}>
                              Modifica
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: 12, color: c.attivo ? 'var(--rosso)' : 'var(--verde)' }}
                              onClick={() => toggleAttivo(c)}
                            >
                              {c.attivo ? 'Disattiva' : 'Riattiva'}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: 12, color: 'var(--rosso)' }}
                              onClick={() => elimina(c)}
                            >
                              Elimina
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--grigio-4)', textAlign: 'right' }}>
            {filtrati.length} di {collaboratori.length} membri staff
          </div>
        )}

        <Drawer open={drawerOpen} onClose={chiudiDrawer} title={editing ? 'Modifica contratto' : 'Nuovo membro staff'} width={560}>
          <FormStaff
            key={editing?.id ?? 'nuovo'}
            editing={editing}
            utentiDisponibili={editing ? utenti : utentiSenzaContratto}
            saving={saving}
            onSave={salva}
            onCancel={chiudiDrawer}
          />
        </Drawer>

        {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
      </div>
    </FeatureGate>
  )
}

function FormStaff({ editing, utentiDisponibili, saving, onSave, onCancel }: {
  editing: Collaboratore | null
  utentiDisponibili: Utente[]
  saving: boolean
  onSave: (payload: Record<string, any>) => Promise<void>
  onCancel: () => void
}) {
  const eraEsterno = !!editing && !editing.utente_id
  const [modalita, setModalita] = useState<'utente' | 'manuale'>(eraEsterno ? 'manuale' : 'utente')
  const [utenteId, setUtenteId] = useState(editing?.utente_id ?? '')
  const [nomeEsterno, setNomeEsterno] = useState(editing?.nome_esterno ?? '')
  const [cognomeEsterno, setCognomeEsterno] = useState(editing?.cognome_esterno ?? '')
  const [ruoloEsterno, setRuoloEsterno] = useState(editing?.ruolo_esterno ?? '')
  const [tipoContratto, setTipoContratto] = useState<string>(editing?.tipo_contratto ?? 'cococo')
  const [codiceFiscale, setCodiceFiscale] = useState(editing?.codice_fiscale ?? '')
  const [iban, setIban] = useState(editing?.iban ?? '')
  const [compensoMensile, setCompensoMensile] = useState(editing?.compenso_mensile != null ? String(editing.compenso_mensile) : '')
  const [dataInizio, setDataInizio] = useState(editing?.data_inizio ?? new Date().toISOString().split('T')[0])
  const [dataFine, setDataFine] = useState(editing?.data_fine ?? '')

  const annuale = compensoMensile && !isNaN(parseFloat(compensoMensile)) ? parseFloat(compensoMensile) * 12 : 0

  // Modificando un contratto già collegato a un utente, l'identità non è
  // modificabile (si disattiva e se ne crea uno nuovo per cambiarla).
  // Modificando un contratto esterno si possono correggere i dati manuali,
  // ma non "agganciarlo" a un utente a posteriori (si crea un nuovo contratto).
  const identitaBloccata = !!editing && !eraEsterno
  const mostraToggle = !editing

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (modalita === 'utente' && !identitaBloccata && !utenteId) return
    if (modalita === 'manuale' && (!nomeEsterno.trim() || !cognomeEsterno.trim())) return
    if (!codiceFiscale.trim() || !dataInizio) return
    await onSave({
      utente_id: identitaBloccata ? undefined : (modalita === 'utente' ? utenteId : null),
      nome_esterno: modalita === 'manuale' ? nomeEsterno.trim() : undefined,
      cognome_esterno: modalita === 'manuale' ? cognomeEsterno.trim() : undefined,
      ruolo_esterno: modalita === 'manuale' ? (ruoloEsterno.trim() || null) : undefined,
      tipo_contratto: tipoContratto,
      codice_fiscale: codiceFiscale.trim(),
      iban: iban.trim() || null,
      compenso_mensile: compensoMensile === '' ? null : parseFloat(compensoMensile),
      data_inizio: dataInizio,
      data_fine: dataFine || null,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 14 }}>
        <label className="label">Membro staff *</label>
        {identitaBloccata ? (
          <div className="input" style={{ background: 'var(--gray-mid)', color: 'var(--grigio-3)' }}>
            {editing?.utenti?.cognome} {editing?.utenti?.nome} — {roleLabel[editing?.utenti?.ruolo ?? ''] ?? editing?.utenti?.ruolo}
          </div>
        ) : (
          <>
            {mostraToggle && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" checked={modalita === 'utente'} onChange={() => setModalita('utente')} />
                  Utente già presente nel club
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" checked={modalita === 'manuale'} onChange={() => setModalita('manuale')} />
                  Inserisci manualmente
                </label>
              </div>
            )}
            {modalita === 'utente' ? (
              <>
                <select className="input" value={utenteId} onChange={e => setUtenteId(e.target.value)} required>
                  <option value="">— Seleziona un utente del club —</option>
                  {utentiDisponibili.map(u => (
                    <option key={u.id} value={u.id}>{u.cognome} {u.nome} — {roleLabel[u.ruolo] ?? u.ruolo}</option>
                  ))}
                </select>
                {utentiDisponibili.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--grigio-4)', marginTop: 6 }}>
                    Tutti gli utenti del club hanno già un contratto attivo. Puoi comunque inserire manualmente un nuovo collaboratore.
                  </p>
                )}
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                <div style={{ marginBottom: 14 }}>
                  <label className="label">Nome *</label>
                  <input className="input" value={nomeEsterno} onChange={e => setNomeEsterno(e.target.value)} placeholder="Mario" required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="label">Cognome *</label>
                  <input className="input" value={cognomeEsterno} onChange={e => setCognomeEsterno(e.target.value)} placeholder="Rossi" required />
                </div>
                <div style={{ gridColumn: '1 / -1', marginBottom: 14 }}>
                  <label className="label">Ruolo <span style={{ color: 'var(--grigio-3)', fontWeight: 400 }}>(facoltativo)</span></label>
                  <input className="input" value={ruoloEsterno} onChange={e => setRuoloEsterno(e.target.value)}
                    placeholder="es. Fisioterapista, Magazziniere, Autista..." />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div style={{ marginBottom: 14 }}>
          <label className="label">Tipo contratto *</label>
          <select className="input" value={tipoContratto} onChange={e => setTipoContratto(e.target.value)}>
            <option value="cococo">Co.co.co.</option>
            <option value="autonomo">Lavoro autonomo</option>
            <option value="dipendente">Dipendente</option>
            <option value="volontario">Volontario</option>
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="label">Codice fiscale *</label>
          <input className="input" style={{ textTransform: 'uppercase' }} value={codiceFiscale}
            onChange={e => setCodiceFiscale(e.target.value.toUpperCase())} maxLength={16} required />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="label">IBAN <span style={{ color: 'var(--grigio-3)', fontWeight: 400 }}>(facoltativo)</span></label>
        <input className="input" style={{ textTransform: 'uppercase' }} value={iban} onChange={e => setIban(e.target.value.toUpperCase())} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="label">Compenso mensile (€)</label>
        <input className="input" type="number" min={0} step="0.01" value={compensoMensile}
          onChange={e => setCompensoMensile(e.target.value)} placeholder="0,00" />
        {annuale > 0 && (
          <p style={{ fontSize: 12, color: 'var(--grigio-4)', marginTop: 6 }}>
            Compenso annuale stimato: <strong style={{ color: 'var(--accent)' }}>{fmt(annuale)}</strong>
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div style={{ marginBottom: 14 }}>
          <label className="label">Data inizio *</label>
          <input className="input" type="date" value={dataInizio} onChange={e => setDataInizio(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="label">Data fine <span style={{ color: 'var(--grigio-3)', fontWeight: 400 }}>(facoltativo)</span></label>
          <input className="input" type="date" value={dataFine} onChange={e => setDataFine(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
        <button type="button" className="btn btn-sm" onClick={onCancel}>Annulla</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? '...' : editing ? 'Salva modifiche' : 'Aggiungi membro staff'}
        </button>
      </div>
    </form>
  )
}
