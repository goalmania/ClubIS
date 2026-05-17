'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, TabBar, EmptyState, Modal, Toast } from '@/components/ui'

/* ─── Tipi ───────────────────────────────────────────────────────── */

type Filtro = 'tutti' | 'scaduti' | 'in_scadenza' | 'validi'

interface FormState {
  giocatoreId: string
  tipo: string
  rilascio: string
  scadenza: string
  medico: string
  struttura: string
  note: string
}

const FORM_INIT: FormState = {
  giocatoreId: '', tipo: 'agonistico',
  rilascio: '', scadenza: '',
  medico: '', struttura: '', note: '',
}

/* ─── Helper ─────────────────────────────────────────────────────── */

function addAnno(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  dt.setFullYear(dt.getFullYear() + 1)
  return dt.toISOString().split('T')[0]
}

/* ─── Pagina ─────────────────────────────────────────────────────── */

export default function MedicoCertificatiPage() {
  const supabase = createClient()

  const [certificati, setCertificati] = useState<any[]>([])
  const [giocatoriList, setGiocatoriList] = useState<any[]>([])
  const [clubId, setClubId]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro]   = useState<Filtro>('tutti')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]       = useState<FormState>(FORM_INIT)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  /* ── Load ──────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return
    setClubId(utente.club_id)

    const [{ data: certs }, giocatori] = await Promise.all([
      supabase
        .from('certificati_medici')
        .select('*, giocatori(id, nome, cognome, ruolo_principale)')
        .eq('club_id', utente.club_id)
        .order('data_scadenza'),
      fetch('/api/giocatori').then(r => r.json()).catch(() => []),
    ])

    setCertificati(certs ?? [])
    setGiocatoriList(Array.isArray(giocatori) ? giocatori : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  /* ── Classificazione ───────────────────────────────────────────── */

  const oggi  = new Date()
  const tra30 = new Date(oggi); tra30.setDate(oggi.getDate() + 30)

  const classifica = (c: any): 'scaduti' | 'in_scadenza' | 'validi' => {
    const scad = new Date(c.data_scadenza)
    if (scad < oggi)   return 'scaduti'
    if (scad <= tra30) return 'in_scadenza'
    return 'validi'
  }

  const counts = {
    scaduti:     certificati.filter(c => classifica(c) === 'scaduti').length,
    in_scadenza: certificati.filter(c => classifica(c) === 'in_scadenza').length,
    validi:      certificati.filter(c => classifica(c) === 'validi').length,
  }

  const filtrati = filtro === 'tutti'
    ? certificati
    : certificati.filter(c => classifica(c) === filtro)

  const badgeStato = (c: any) => {
    const stato = classifica(c)
    const gg = Math.ceil((new Date(c.data_scadenza).getTime() - oggi.getTime()) / 86400000)
    if (stato === 'scaduti')     return <span className="badge badge-rosso">Scaduto</span>
    if (gg <= 7)                 return <span className="badge badge-rosso">Scade in {gg}gg</span>
    if (stato === 'in_scadenza') return <span className="badge badge-ambra">{gg} giorni</span>
    return <span className="badge badge-verde">Valido</span>
  }

  /* ── Form ──────────────────────────────────────────────────────── */

  function setF<K extends keyof FormState>(k: K, v: string) {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'rilascio' && v) {
        const autoScad = addAnno(v)
        if (!prev.scadenza || prev.scadenza === addAnno(prev.rilascio)) {
          next.scadenza = autoScad
        }
      }
      return next
    })
  }

  function apriModal(prefill?: Partial<FormState>) {
    setForm({ ...FORM_INIT, ...prefill })
    setModalOpen(true)
  }

  async function salva() {
    if (!form.giocatoreId || !form.rilascio || !form.scadenza) {
      setToast({ msg: 'Giocatore e date sono obbligatorie', tipo: 'error' }); return
    }
    setSaving(true)
    const { error } = await supabase.from('certificati_medici').insert({
      giocatore_id: form.giocatoreId,
      club_id: clubId,
      tipo: form.tipo,
      data_rilascio: form.rilascio,
      data_scadenza: form.scadenza,
      medico: form.medico || null,
      struttura: form.struttura || null,
      note: form.note || null,
    })
    setSaving(false)
    if (error) { setToast({ msg: error.message, tipo: 'error' }); return }
    setToast({ msg: 'Certificato aggiunto', tipo: 'success' })
    setModalOpen(false)
    await load()
  }

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <PageHeader
        title="Certificati medici"
        subtitle={`${certificati.length} certificati — ${counts.scaduti + counts.in_scadenza} richiedono attenzione`}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => apriModal()}>
            + Aggiungi certificato
          </button>
        }
      />

      {counts.scaduti > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 14 }}>
          <strong>{counts.scaduti} certificati scaduti.</strong> I giocatori interessati non possono essere convocati.
        </div>
      )}
      {counts.in_scadenza > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 14 }}>
          ⚠ {counts.in_scadenza} certificati in scadenza entro 30 giorni — pianifica i rinnovi.
        </div>
      )}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Scaduti</div>
          <div className="stat-value" style={{ color: counts.scaduti > 0 ? 'var(--rosso)' : undefined }}>
            {counts.scaduti}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In scadenza 30gg</div>
          <div className="stat-value" style={{ color: counts.in_scadenza > 0 ? 'var(--ambra)' : undefined }}>
            {counts.in_scadenza}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Validi</div>
          <div className="stat-value" style={{ color: 'var(--verde)' }}>{counts.validi}</div>
        </div>
      </div>

      {/* TabBar */}
      <TabBar
        active={filtro}
        onChange={k => setFiltro(k as Filtro)}
        tabs={[
          { key: 'tutti',       label: 'Tutti',       count: certificati.length },
          { key: 'scaduti',     label: 'Scaduti',     count: counts.scaduti },
          { key: 'in_scadenza', label: 'In scadenza', count: counts.in_scadenza },
          { key: 'validi',      label: 'Validi',      count: counts.validi },
        ]}
      />

      {/* Tabella */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
            Caricamento...
          </div>
        ) : filtrati.length === 0 ? (
          <EmptyState icon="✓" title="Nessun certificato in questa categoria" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Giocatore</th>
                  <th>Tipo</th>
                  <th>Data rilascio</th>
                  <th>Scadenza</th>
                  <th>Medico</th>
                  <th>Struttura</th>
                  <th>Stato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrati.map(c => {
                  const scaduto = classifica(c) === 'scaduti'
                  const g = c.giocatori
                  return (
                    <tr key={c.id} style={{ background: scaduto ? 'rgba(255,68,68,0.05)' : undefined }}>
                      <td style={{
                        fontWeight: 500, fontSize: 13,
                        borderLeft: scaduto ? '2px solid var(--rosso)' : '2px solid transparent',
                      }}>
                        {g?.cognome} {g?.nome}
                      </td>
                      <td>
                        <span className="badge badge-grigio" style={{ fontSize: 10 }}>
                          {c.tipo === 'agonistico' ? 'Agonistico' : 'Non agonistico'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grigio-3)' }}>
                        {c.data_rilascio ? new Date(c.data_rilascio).toLocaleDateString('it-IT') : '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>
                        {new Date(c.data_scadenza).toLocaleDateString('it-IT')}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{c.medico ?? '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--grigio-4)' }}>{c.struttura ?? '—'}</td>
                      <td>{badgeStato(c)}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 11 }}
                          onClick={() => apriModal({
                            giocatoreId: g?.id ?? '',
                            tipo: c.tipo ?? 'agonistico',
                            medico: c.medico ?? '',
                            struttura: c.struttura ?? '',
                          })}
                        >
                          Rinnova
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal aggiungi / rinnova ───────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Aggiungi certificato" width={540}>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Giocatore *</label>
          <select
            className="input"
            style={{ width: '100%' }}
            value={form.giocatoreId}
            onChange={e => setF('giocatoreId', e.target.value)}
          >
            <option value="">— Seleziona giocatore —</option>
            {giocatoriList.map(g => (
              <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Tipo *</label>
          <select
            className="input"
            style={{ width: '100%' }}
            value={form.tipo}
            onChange={e => setF('tipo', e.target.value)}
          >
            <option value="agonistico">Agonistico</option>
            <option value="non_agonistico">Non agonistico</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Data rilascio *</label>
            <input
              className="input"
              type="date"
              style={{ width: '100%' }}
              value={form.rilascio}
              onChange={e => setF('rilascio', e.target.value)}
            />
          </div>
          <div>
            <label style={lbl}>Data scadenza *</label>
            <input
              className="input"
              type="date"
              style={{ width: '100%' }}
              value={form.scadenza}
              onChange={e => setF('scadenza', e.target.value)}
            />
            {form.rilascio && form.scadenza === addAnno(form.rilascio) && (
              <div style={{ fontSize: 10, color: 'var(--grigio-4)', marginTop: 4 }}>
                Auto: rilascio + 1 anno
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Medico</label>
            <input
              className="input"
              style={{ width: '100%' }}
              value={form.medico}
              onChange={e => setF('medico', e.target.value)}
              placeholder="Dr. Rossi"
            />
          </div>
          <div>
            <label style={lbl}>Struttura</label>
            <input
              className="input"
              style={{ width: '100%' }}
              value={form.struttura}
              onChange={e => setF('struttura', e.target.value)}
              placeholder="ASL Bari"
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Note</label>
          <textarea
            className="input"
            rows={2}
            style={{ width: '100%', resize: 'vertical' as const }}
            value={form.note}
            onChange={e => setF('note', e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)}>
            Annulla
          </button>
          <button
            className="btn btn-primary"
            onClick={salva}
            disabled={saving || !form.giocatoreId || !form.rilascio || !form.scadenza}
          >
            {saving ? 'Salvo…' : 'Aggiungi certificato'}
          </button>
        </div>
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontFamily: 'var(--font-display)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'var(--grigio-3)', marginBottom: 6, fontWeight: 600,
}
