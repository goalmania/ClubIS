'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast } from '@/components/ui'

type TabModulo = 'infortuni' | 'svincolo' | 'distinta' | 'affiliazione'

interface Giocatore {
  id: string
  nome: string
  cognome: string
  data_nascita: string
  numero_maglia: number | null
  ruolo_principale: string | null
}

interface LogEntry {
  id: string
  tipo_modulo: string
  dati: Record<string, string>
  created_at: string
}

// ---------- Form dati ----------
interface FormInfortuni {
  data: string
  giocatore_id: string
  tipo_infortunio: string
  circostanze: string
  medico_sociale: string
  note: string
}

interface FormSvincolo {
  giocatore_id: string
  club_acquirente: string
  data_richiesta: string
  motivazione: string
}

interface FormDistintaFIGC {
  partita: string
  avversario: string
  data_ora: string
  competizione: string
  campo: string
}

// ---------- Print helpers ----------
function PrintInfortuni({ form, giocatore, club }: { form: FormInfortuni; giocatore: Giocatore | undefined; club: string }) {
  return (
    <div style={{ fontFamily: 'serif', fontSize: 13, color: '#000', padding: '20px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 16, textTransform: 'uppercase' }}>Referto Infortuni</div>
        <div style={{ fontSize: 12 }}>Federazione Italiana Giuoco Calcio</div>
        <div style={{ borderBottom: '2px solid black', marginTop: 12 }} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <b>Società:</b> {club}<br />
        <b>Data evento:</b> {form.data ? new Date(form.data).toLocaleDateString('it-IT') : '—'}<br />
        <b>Tesserato infortunato:</b> {giocatore ? `${giocatore.cognome} ${giocatore.nome}` : '—'}<br />
        {giocatore?.data_nascita && <><b>Data di nascita:</b> {new Date(giocatore.data_nascita).toLocaleDateString('it-IT')}<br /></>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <b>Tipo di infortunio:</b><br />
        <div style={{ border: '1px solid #ccc', padding: 8, minHeight: 40, marginTop: 4 }}>{form.tipo_infortunio || '—'}</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <b>Circostanze:</b><br />
        <div style={{ border: '1px solid #ccc', padding: 8, minHeight: 60, marginTop: 4 }}>{form.circostanze || '—'}</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <b>Medico sociale:</b> {form.medico_sociale || '—'}
      </div>
      {form.note && (
        <div style={{ marginBottom: 16 }}>
          <b>Note:</b><br />
          <div style={{ border: '1px solid #ccc', padding: 8, marginTop: 4 }}>{form.note}</div>
        </div>
      )}
      <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
        <div style={{ borderTop: '1px solid black', paddingTop: 8 }}><div style={{ fontSize: 10 }}>Firma medico sociale</div></div>
        <div style={{ borderTop: '1px solid black', paddingTop: 8 }}><div style={{ fontSize: 10 }}>Firma dirigente</div></div>
        <div style={{ borderTop: '1px solid black', paddingTop: 8 }}><div style={{ fontSize: 10 }}>Timbro societario</div></div>
      </div>
    </div>
  )
}

function PrintSvincolo({ form, giocatore, club }: { form: FormSvincolo; giocatore: Giocatore | undefined; club: string }) {
  return (
    <div style={{ fontFamily: 'serif', fontSize: 13, color: '#000', padding: '20px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 16, textTransform: 'uppercase' }}>Richiesta di Svincolo</div>
        <div style={{ fontSize: 12 }}>Federazione Italiana Giuoco Calcio</div>
        <div style={{ borderBottom: '2px solid black', marginTop: 12 }} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <b>Data richiesta:</b> {form.data_richiesta ? new Date(form.data_richiesta).toLocaleDateString('it-IT') : '—'}<br />
        <b>Club cedente:</b> {club}<br />
        <b>Club acquirente:</b> {form.club_acquirente || '—'}<br />
      </div>
      <div style={{ marginBottom: 16 }}>
        <b>Tesserato:</b> {giocatore ? `${giocatore.cognome} ${giocatore.nome}` : '—'}<br />
        {giocatore?.data_nascita && <><b>Data di nascita:</b> {new Date(giocatore.data_nascita).toLocaleDateString('it-IT')}<br /></>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <b>Motivazione dello svincolo:</b><br />
        <div style={{ border: '1px solid #ccc', padding: 8, minHeight: 60, marginTop: 4 }}>{form.motivazione || '—'}</div>
      </div>
      <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
        <div style={{ borderTop: '1px solid black', paddingTop: 8 }}><div style={{ fontSize: 10 }}>Firma dirigente cedente</div></div>
        <div style={{ borderTop: '1px solid black', paddingTop: 8 }}><div style={{ fontSize: 10 }}>Firma dirigente acquirente</div></div>
        <div style={{ borderTop: '1px solid black', paddingTop: 8 }}><div style={{ fontSize: 10 }}>Timbro FIGC</div></div>
      </div>
    </div>
  )
}

// ---------- Modale preview ----------
function ModalePreview({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 12, padding: '24px 32px',
        maxWidth: 680, width: '100%', maxHeight: '90vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Anteprima modulo</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        {children}
        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Chiudi</button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>Stampa / Salva PDF</button>
        </div>
      </div>
    </div>
  )
}

export default function ModuliFIGCPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<TabModulo>('infortuni')
  const [giocatori, setGiocatori] = useState<Giocatore[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const [club, setClub] = useState<{ id: string; nome: string; figc_codice?: string } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  // Form states
  const oggi = new Date().toISOString().split('T')[0]
  const [fInfortuni, setFInfortuni] = useState<FormInfortuni>({
    data: oggi, giocatore_id: '', tipo_infortunio: '', circostanze: '', medico_sociale: '', note: '',
  })
  const [fSvincolo, setFSvincolo] = useState<FormSvincolo>({
    giocatore_id: '', club_acquirente: '', data_richiesta: oggi, motivazione: '',
  })
  const [fDistinta, setFDistinta] = useState<FormDistintaFIGC>({
    partita: '', avversario: '', data_ora: '', competizione: '', campo: '',
  })
  const [importoAffiliazione, setImportoAffiliazione] = useState('850')
  const [affiliazioneRegistrata, setAffiliazioneRegistrata] = useState(false)
  const [giorni30Sept, setGiorni30Sept] = useState<number | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
    const clubId = utente!.club_id

    const [{ data: cl }, { data: tess }, { data: logData }] = await Promise.all([
      supabase.from('clubs').select('id, nome, figc_codice').eq('id', clubId).single(),
      supabase.from('tesseramenti')
        .select('numero_maglia, giocatori(id, nome, cognome, data_nascita, ruolo_principale)')
        .eq('club_id', clubId).eq('stato', 'attivo'),
      supabase.from('figc_moduli_log')
        .select('id, tipo_modulo, dati, created_at')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    setClub(cl)
    setGiocatori((tess ?? []).map((t: any) => ({ ...t.giocatori, numero_maglia: t.numero_maglia ?? null })))
    setLog(logData ?? [])

    // Controlla quota affiliazione anno corrente
    const anno = new Date().getFullYear()
    const { data: movimenti } = await supabase.from('prima_nota')
      .select('id')
      .eq('club_id', clubId)
      .eq('categoria', 'federazione')
      .ilike('descrizione', '%affiliazione figc%')
      .gte('data', `${anno}-01-01`)
      .limit(1)
    setAffiliazioneRegistrata((movimenti?.length ?? 0) > 0)

    // Giorni al 30 settembre
    const oggi = new Date()
    const scad = new Date(oggi.getFullYear(), 8, 30) // 30 sett
    if (scad < oggi) scad.setFullYear(oggi.getFullYear() + 1)
    const gg = Math.ceil((scad.getTime() - oggi.getTime()) / 86400000)
    setGiorni30Sept(gg)

    setLoading(false)
  }

  const salvaLog = async (tipo: string, dati: Record<string, string>) => {
    if (!club || !userId) return
    await supabase.from('figc_moduli_log').insert({
      club_id: club.id, tipo_modulo: tipo, dati, creato_da: userId,
    })
    init()
  }

  const stampaInfortuni = async () => {
    if (!fInfortuni.giocatore_id || !fInfortuni.tipo_infortunio) {
      setToast({ msg: 'Giocatore e tipo infortunio obbligatori', tipo: 'error' }); return
    }
    await salvaLog('referto_infortuni', { ...fInfortuni })
    setPreview(true)
  }

  const stampaSvincolo = async () => {
    if (!fSvincolo.giocatore_id || !fSvincolo.club_acquirente) {
      setToast({ msg: 'Giocatore e club acquirente obbligatori', tipo: 'error' }); return
    }
    await salvaLog('richiesta_svincolo', { ...fSvincolo })
    setPreview(true)
  }

  const registraAffiliazione = async () => {
    if (!importoAffiliazione || parseFloat(importoAffiliazione) <= 0) {
      setToast({ msg: 'Importo non valido', tipo: 'error' }); return
    }
    setSaving(true)
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', userId!).single()
    const { error } = await supabase.from('prima_nota').insert({
      club_id: utente!.club_id,
      tipo: 'uscita',
      categoria: 'federazione',
      importo: parseFloat(importoAffiliazione),
      data: oggi,
      descrizione: `Quota affiliazione FIGC ${new Date().getFullYear()}`,
      registrato_da: userId,
    })
    setSaving(false)
    if (error) { setToast({ msg: 'Errore nella registrazione', tipo: 'error' }); return }
    setToast({ msg: 'Quota affiliazione FIGC registrata in prima nota', tipo: 'success' })
    setAffiliazioneRegistrata(true)
  }

  const gSel = (id: string) => giocatori.find(g => g.id === id)

  const tipoModuloLabel: Record<string, string> = {
    referto_infortuni: 'Referto Infortuni',
    richiesta_svincolo: 'Richiesta Svincolo',
    distinta_ufficiale: 'Distinta Ufficiale',
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>

  return (
    <div>
      <PageHeader
        title="Moduli FIGC"
        subtitle="Genera e stampa i moduli ufficiali federali"
      />

      {/* Alert affiliazione */}
      {!affiliazioneRegistrata && giorni30Sept !== null && giorni30Sept <= 30 && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
          <span>
            <strong>Quota affiliazione FIGC non registrata</strong> — scadenza 30 settembre ({giorni30Sept} giorni).{' '}
            <button onClick={() => setTab('affiliazione')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rosso)', textDecoration: 'underline', fontWeight: 600 }}>
              Registra ora →
            </button>
          </span>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--grigio-5)', paddingBottom: 0 }}>
        {([['infortuni', 'Referto Infortuni'], ['svincolo', 'Richiesta Svincolo'], ['distinta', 'Distinta Ufficiale'], ['affiliazione', 'Affiliazione FIGC']] as [TabModulo, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--verde)' : '2px solid transparent',
              padding: '10px 16px', fontSize: 13, fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--grigio)' : 'var(--grigio-4)',
              cursor: 'pointer', marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* --- REFERTO INFORTUNI --- */}
      {tab === 'infortuni' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Compila referto infortuni</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label">Data evento *</label>
                <input className="input" type="date" value={fInfortuni.data} onChange={e => setFInfortuni(p => ({ ...p, data: e.target.value }))} />
              </div>
              <div>
                <label className="label">Giocatore infortunato *</label>
                <select className="input" value={fInfortuni.giocatore_id} onChange={e => setFInfortuni(p => ({ ...p, giocatore_id: e.target.value }))}>
                  <option value="">Seleziona giocatore...</option>
                  {giocatori.map(g => <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tipo infortunio *</label>
                <select className="input" value={fInfortuni.tipo_infortunio} onChange={e => setFInfortuni(p => ({ ...p, tipo_infortunio: e.target.value }))}>
                  <option value="">Seleziona...</option>
                  {['Distorsione', 'Contusione', 'Frattura', 'Elongazione muscolare', 'Stiramento', 'Strappo muscolare', 'Lussazione', 'Trauma cranico', 'Altro'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Circostanze</label>
                <textarea className="input" rows={3} style={{ resize: 'vertical' }} value={fInfortuni.circostanze} onChange={e => setFInfortuni(p => ({ ...p, circostanze: e.target.value }))} placeholder="Descrivi le circostanze dell'infortunio..." />
              </div>
              <div>
                <label className="label">Medico sociale</label>
                <input className="input" value={fInfortuni.medico_sociale} onChange={e => setFInfortuni(p => ({ ...p, medico_sociale: e.target.value }))} placeholder="Nome e cognome medico" />
              </div>
              <div>
                <label className="label">Note aggiuntive</label>
                <textarea className="input" rows={2} style={{ resize: 'vertical' }} value={fInfortuni.note} onChange={e => setFInfortuni(p => ({ ...p, note: e.target.value }))} />
              </div>
              <button className="btn btn-primary" onClick={stampaInfortuni}>
                Genera e anteprima modulo
              </button>
            </div>
          </div>

          <StoriaModuli log={log.filter(l => l.tipo_modulo === 'referto_infortuni')} tipoLabel="Referto Infortuni" />
        </div>
      )}

      {/* --- RICHIESTA SVINCOLO --- */}
      {tab === 'svincolo' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Compila richiesta svincolo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label">Giocatore *</label>
                <select className="input" value={fSvincolo.giocatore_id} onChange={e => setFSvincolo(p => ({ ...p, giocatore_id: e.target.value }))}>
                  <option value="">Seleziona giocatore...</option>
                  {giocatori.map(g => <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Club cedente</label>
                <input className="input" value={club?.nome ?? ''} disabled style={{ opacity: 0.7 }} />
              </div>
              <div>
                <label className="label">Club acquirente *</label>
                <input className="input" value={fSvincolo.club_acquirente} onChange={e => setFSvincolo(p => ({ ...p, club_acquirente: e.target.value }))} placeholder="Nome società acquirente" />
              </div>
              <div>
                <label className="label">Data richiesta</label>
                <input className="input" type="date" value={fSvincolo.data_richiesta} onChange={e => setFSvincolo(p => ({ ...p, data_richiesta: e.target.value }))} />
              </div>
              <div>
                <label className="label">Motivazione</label>
                <textarea className="input" rows={4} style={{ resize: 'vertical' }} value={fSvincolo.motivazione} onChange={e => setFSvincolo(p => ({ ...p, motivazione: e.target.value }))} placeholder="Motivazione dello svincolo..." />
              </div>
              <button className="btn btn-primary" onClick={stampaSvincolo}>
                Genera e anteprima modulo
              </button>
            </div>
          </div>

          <StoriaModuli log={log.filter(l => l.tipo_modulo === 'richiesta_svincolo')} tipoLabel="Richiesta Svincolo" />
        </div>
      )}

      {/* --- DISTINTA UFFICIALE --- */}
      {tab === 'distinta' && (
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Distinta Ufficiale FIGC</div>
          <p style={{ fontSize: 13, color: 'var(--grigio-3)', marginBottom: 20 }}>
            Per generare la distinta ufficiale FIGC usa il modulo dedicato nella sezione{' '}
            <a href="/dashboard/segretario/distinte" style={{ color: 'var(--verde)', fontWeight: 500 }}>
              Gare → Distinte gara
            </a>
            {' '}— già integrata con convocazioni e firma FIGC.
          </p>
          <a href="/dashboard/segretario/distinte" className="btn btn-primary btn-sm">
            Vai a Distinte gara →
          </a>
        </div>
      )}

      {/* --- AFFILIAZIONE FIGC --- */}
      {tab === 'affiliazione' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Quota affiliazione FIGC</div>
            <p style={{ fontSize: 12, color: 'var(--grigio-3)', marginBottom: 16 }}>
              Registra il pagamento della quota annuale di affiliazione FIGC in prima nota.
              Scadenza standard dilettanti: <strong>30 settembre</strong>.
            </p>

            {affiliazioneRegistrata ? (
              <div style={{ padding: '14px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 13, color: '#15803d', marginBottom: 16 }}>
                Quota affiliazione FIGC già registrata per l'anno {new Date().getFullYear()}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="label">Importo (€)</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={importoAffiliazione}
                    onChange={e => setImportoAffiliazione(e.target.value)}
                    placeholder="850"
                  />
                  <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 4 }}>Importo configurabile — valore di default per dilettanti</div>
                </div>
                <div>
                  <label className="label">Data</label>
                  <input className="input" type="date" value={oggi} disabled style={{ opacity: 0.7 }} />
                </div>
                <button className="btn btn-primary" onClick={registraAffiliazione} disabled={saving}>
                  {saving ? 'Registrazione...' : 'Registra in prima nota'}
                </button>
              </div>
            )}

            {giorni30Sept !== null && (
              <div style={{
                marginTop: 20, padding: '12px 14px', borderRadius: 8, fontSize: 12,
                background: giorni30Sept <= 30 ? '#fef3c7' : '#f9fafb',
                border: `1px solid ${giorni30Sept <= 30 ? '#fcd34d' : 'var(--grigio-5)'}`,
                color: giorni30Sept <= 30 ? '#92400e' : 'var(--grigio-3)',
              }}>
                Scadenza affiliazione: 30 settembre — {giorni30Sept} giorni rimanenti
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Riepilogo stagione corrente</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <InfoRow label="Club" value={club?.nome ?? '—'} />
              <InfoRow label="Codice FIGC" value={club?.figc_codice ?? 'Non impostato'} />
              <InfoRow label="Anno sportivo" value={`${new Date().getFullYear()}/${new Date().getFullYear() + 1}`} />
              <InfoRow label="Affiliazione registrata" value={affiliazioneRegistrata ? 'Sì' : 'No'} highlight={!affiliazioneRegistrata} />
            </div>
          </div>
        </div>
      )}

      {/* Storia moduli (visibile per tutti i tab) */}
      {tab !== 'infortuni' && tab !== 'svincolo' && log.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <StoriaModuli log={log} tipoLabel="Tutti i moduli" showTipo />
        </div>
      )}

      {/* Preview modale */}
      {preview && tab === 'infortuni' && (
        <ModalePreview onClose={() => setPreview(false)}>
          <PrintInfortuni form={fInfortuni} giocatore={gSel(fInfortuni.giocatore_id)} club={club?.nome ?? ''} />
        </ModalePreview>
      )}
      {preview && tab === 'svincolo' && (
        <ModalePreview onClose={() => setPreview(false)}>
          <PrintSvincolo form={fSvincolo} giocatore={gSel(fSvincolo.giocatore_id)} club={club?.nome ?? ''} />
        </ModalePreview>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--grigio-6)', paddingBottom: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--grigio-4)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: highlight ? 'var(--rosso)' : 'var(--grigio)' }}>{value}</span>
    </div>
  )
}

function StoriaModuli({ log, tipoLabel, showTipo }: { log: LogEntry[]; tipoLabel: string; showTipo?: boolean }) {
  const tipoLabel2: Record<string, string> = {
    referto_infortuni: 'Referto Infortuni',
    richiesta_svincolo: 'Richiesta Svincolo',
    distinta_ufficiale: 'Distinta Ufficiale',
  }
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)', fontSize: 13, fontWeight: 600 }}>
        Storico — {tipoLabel}
      </div>
      {log.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
          Nessun modulo generato
        </div>
      ) : (
        <div>
          {log.map(entry => (
            <div key={entry.id} style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--grigio-6)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                {showTipo && (
                  <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginBottom: 2 }}>
                    {tipoLabel2[entry.tipo_modulo] ?? entry.tipo_modulo}
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--grigio)' }}>
                  {entry.dati?.tipo_infortunio ?? entry.dati?.club_acquirente ?? entry.dati?.partita ?? '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 2 }}>
                  {new Date(entry.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
