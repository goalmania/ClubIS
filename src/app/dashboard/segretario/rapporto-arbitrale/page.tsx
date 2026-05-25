'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal, Toast } from '@/components/ui'

/* ─── Tipi ───────────────────────────────────────────────────────── */

interface Partita {
  id: string
  avversario: string
  data_ora: string
  competizione: string | null
}

interface RapportoArbitrale {
  id: string
  partita_id: string | null
  data_partita: string | null
  avversario: string | null
  competizione: string | null
  arbitro_nome: string | null
  arbitro_cognome: string | null
  assistente1: string | null
  assistente2: string | null
  quarto_ufficiale: string | null
  voto_arbitro: number | null
  comportamento: 'corretto' | 'discutibile' | 'scorretto' | null
  ammoniti_nostri: string | null
  espulsi_nostri: string | null
  ammoniti_avversari: string | null
  espulsi_avversari: string | null
  episodi_contestati: string | null
  episodi_favorevoli: string | null
  note_generali: string | null
  stato: 'bozza' | 'completato'
  created_at: string
}

const COMPORTAMENTO_LABEL: Record<string, string> = {
  corretto: 'Corretto',
  discutibile: 'Discutibile',
  scorretto: 'Scorretto',
}

const emptyForm = () => ({
  partita_id: '',
  data_partita: '',
  avversario: '',
  competizione: '',
  arbitro_nome: '',
  arbitro_cognome: '',
  assistente1: '',
  assistente2: '',
  quarto_ufficiale: '',
  voto_arbitro: '',
  comportamento: '' as '' | 'corretto' | 'discutibile' | 'scorretto',
  ammoniti_nostri: '',
  espulsi_nostri: '',
  ammoniti_avversari: '',
  espulsi_avversari: '',
  episodi_contestati: '',
  episodi_favorevoli: '',
  note_generali: '',
  stato: 'bozza' as 'bozza' | 'completato',
})

/* ─── Componente principale ──────────────────────────────────────── */

export default function RapportoArbitralePage() {
  const supabase = createClient()

  const [clubId, setClubId]         = useState<string | null>(null)
  const [rapporti, setRapporti]     = useState<RapportoArbitrale[]>([])
  const [partite, setPartite]       = useState<Partita[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [form, setForm]             = useState(emptyForm())
  const [filtro, setFiltro]         = useState<'tutti' | 'bozza' | 'completato'>('tutti')
  const [toast, setToast]           = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  /* ── Caricamento ─────────────────────────────────────────────── */

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: utente } = await supabase
      .from('utenti')
      .select('club_id')
      .eq('id', user.id)
      .single()
    if (!utente) return

    setClubId(utente.club_id)

    const [{ data: rapp }, { data: pt }] = await Promise.all([
      supabase
        .from('rapporti_arbitrali')
        .select('*')
        .eq('club_id', utente.club_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('partite')
        .select('id, avversario, data_ora, competizione')
        .order('data_ora', { ascending: false })
        .limit(200),
    ])

    setRapporti((rapp ?? []) as RapportoArbitrale[])
    setPartite((pt ?? []) as Partita[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  /* ── Helpers form ────────────────────────────────────────────── */

  function apriNuovo() {
    setEditId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function apriModifica(r: RapportoArbitrale) {
    setEditId(r.id)
    setForm({
      partita_id:        r.partita_id ?? '',
      data_partita:      r.data_partita ?? '',
      avversario:        r.avversario ?? '',
      competizione:      r.competizione ?? '',
      arbitro_nome:      r.arbitro_nome ?? '',
      arbitro_cognome:   r.arbitro_cognome ?? '',
      assistente1:       r.assistente1 ?? '',
      assistente2:       r.assistente2 ?? '',
      quarto_ufficiale:  r.quarto_ufficiale ?? '',
      voto_arbitro:      r.voto_arbitro !== null ? String(r.voto_arbitro) : '',
      comportamento:     r.comportamento ?? '',
      ammoniti_nostri:   r.ammoniti_nostri ?? '',
      espulsi_nostri:    r.espulsi_nostri ?? '',
      ammoniti_avversari: r.ammoniti_avversari ?? '',
      espulsi_avversari:  r.espulsi_avversari ?? '',
      episodi_contestati: r.episodi_contestati ?? '',
      episodi_favorevoli: r.episodi_favorevoli ?? '',
      note_generali:     r.note_generali ?? '',
      stato:             r.stato,
    })
    setModalOpen(true)
  }

  /* Quando si sceglie una partita, pre-popola avversario e competizione */
  function onPartitaChange(pid: string) {
    const p = partite.find(x => x.id === pid)
    setForm(f => ({
      ...f,
      partita_id:   pid,
      avversario:   p ? p.avversario : f.avversario,
      competizione: p ? (p.competizione ?? '') : f.competizione,
      data_partita: p ? p.data_ora.split('T')[0] : f.data_partita,
    }))
  }

  /* ── Salvataggio ─────────────────────────────────────────────── */

  async function handleSubmit() {
    if (!clubId) return
    setSaving(true)

    const payload = {
      club_id:            clubId,
      partita_id:         form.partita_id || null,
      data_partita:       form.data_partita || null,
      avversario:         form.avversario || null,
      competizione:       form.competizione || null,
      arbitro_nome:       form.arbitro_nome || null,
      arbitro_cognome:    form.arbitro_cognome || null,
      assistente1:        form.assistente1 || null,
      assistente2:        form.assistente2 || null,
      quarto_ufficiale:   form.quarto_ufficiale || null,
      voto_arbitro:       form.voto_arbitro ? parseInt(form.voto_arbitro, 10) : null,
      comportamento:      form.comportamento || null,
      ammoniti_nostri:    form.ammoniti_nostri || null,
      espulsi_nostri:     form.espulsi_nostri || null,
      ammoniti_avversari: form.ammoniti_avversari || null,
      espulsi_avversari:  form.espulsi_avversari || null,
      episodi_contestati: form.episodi_contestati || null,
      episodi_favorevoli: form.episodi_favorevoli || null,
      note_generali:      form.note_generali || null,
      stato:              form.stato,
      updated_at:         new Date().toISOString(),
    }

    let error: any
    if (editId) {
      ({ error } = await supabase
        .from('rapporti_arbitrali')
        .update(payload)
        .eq('id', editId))
    } else {
      ({ error } = await supabase
        .from('rapporti_arbitrali')
        .insert(payload))
    }

    setSaving(false)
    if (error) {
      setToast({ msg: error.message, tipo: 'error' })
    } else {
      setToast({ msg: editId ? 'Rapporto aggiornato' : 'Rapporto creato', tipo: 'success' })
      setModalOpen(false)
      load()
    }
  }

  /* ── Eliminazione ────────────────────────────────────────────── */

  async function handleDelete() {
    if (!deleteId) return
    const { error } = await supabase
      .from('rapporti_arbitrali')
      .delete()
      .eq('id', deleteId)
    setDeleteId(null)
    if (error) {
      setToast({ msg: error.message, tipo: 'error' })
    } else {
      setToast({ msg: 'Rapporto eliminato', tipo: 'success' })
      setRapporti(prev => prev.filter(r => r.id !== deleteId))
    }
  }

  /* ── Filtro ──────────────────────────────────────────────────── */

  const lista = filtro === 'tutti' ? rapporti : rapporti.filter(r => r.stato === filtro)

  const statsTot      = rapporti.length
  const statsCompleti = rapporti.filter(r => r.stato === 'completato').length
  const votoPct       = rapporti.filter(r => r.voto_arbitro !== null)
  const mediaVoto     = votoPct.length
    ? (votoPct.reduce((s, r) => s + (r.voto_arbitro ?? 0), 0) / votoPct.length).toFixed(1)
    : '—'

  /* ── Loading ─────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        Caricamento…
      </div>
    )
  }

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)',
          }}>
            Rapporti Arbitrali
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Valutazione degli arbitri e registro degli episodi di gara
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={apriNuovo}>
          + Nuovo rapporto
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Totale rapporti</div>
          <div className="stat-value">{statsTot}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completati</div>
          <div className="stat-value" style={{ color: 'var(--verde)' }}>{statsCompleti}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Voto medio arbitri</div>
          <div className="stat-value">{mediaVoto}</div>
        </div>
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {([['tutti', 'Tutti'], ['bozza', 'Bozze'], ['completato', 'Completati']] as const).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFiltro(v)}
            className={`btn btn-sm ${filtro === v ? 'btn-primary' : 'btn-ghost'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Tabella */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {lista.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nessun rapporto arbitrale. Clicca "+ Nuovo rapporto" per iniziare.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Avversario</th>
                  <th>Competizione</th>
                  <th>Arbitro</th>
                  <th style={{ textAlign: 'center' }}>Voto</th>
                  <th>Comportamento</th>
                  <th style={{ textAlign: 'center' }}>Amm./Esp.</th>
                  <th>Stato</th>
                  <th style={{ width: 120 }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {r.data_partita
                        ? new Date(r.data_partita).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
                        : '—'}
                    </td>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{r.avversario ?? '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-4)' }}>{r.competizione ?? '—'}</td>
                    <td style={{ fontSize: 13 }}>
                      {r.arbitro_cognome || r.arbitro_nome
                        ? `${r.arbitro_cognome ?? ''} ${r.arbitro_nome ?? ''}`.trim()
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.voto_arbitro !== null ? (
                        <span style={{
                          display: 'inline-flex', width: 28, height: 28, borderRadius: 6,
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
                          background: r.voto_arbitro >= 7 ? 'var(--verde-lt)' : r.voto_arbitro >= 5 ? 'var(--ambra-lt)' : 'var(--rosso-lt)',
                          color: r.voto_arbitro >= 7 ? 'var(--verde)' : r.voto_arbitro >= 5 ? 'var(--ambra)' : 'var(--rosso)',
                        }}>
                          {r.voto_arbitro}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {r.comportamento ? (
                        <span className={`badge ${r.comportamento === 'corretto' ? 'badge-verde' : r.comportamento === 'scorretto' ? 'badge-rosso' : 'badge-ambra'}`} style={{ fontSize: 10 }}>
                          {COMPORTAMENTO_LABEL[r.comportamento]}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--ambra)' }}>
                        {r.ammoniti_nostri ? r.ammoniti_nostri.split(',').filter(Boolean).length : 0}
                      </span>
                      <span style={{ color: 'var(--grigio-4)', margin: '0 2px' }}>/</span>
                      <span style={{ color: 'var(--rosso)' }}>
                        {r.espulsi_nostri ? r.espulsi_nostri.split(',').filter(Boolean).length : 0}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${r.stato === 'completato' ? 'badge-verde' : 'badge-grigio'}`} style={{ fontSize: 10 }}>
                        {r.stato}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11 }}
                          onClick={() => apriModifica(r)}
                        >
                          Modifica
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, color: 'var(--rosso)' }}
                          onClick={() => setDeleteId(r.id)}
                        >
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal form */}
      <Modal
        open={modalOpen}
        title={editId ? 'Modifica rapporto arbitrale' : 'Nuovo rapporto arbitrale'}
        onClose={() => setModalOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Sezione partita */}
          <fieldset style={{ border: '1px solid var(--grigio-5)', borderRadius: 6, padding: '12px 14px' }}>
            <legend style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grigio-3)', padding: '0 6px' }}>
              Partita
            </legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              <div>
                <label className="label">Collega a partita in calendario</label>
                <select
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.partita_id}
                  onChange={e => onPartitaChange(e.target.value)}
                >
                  <option value="">— Nessuna (inserisci manualmente) —</option>
                  {partite.map(p => (
                    <option key={p.id} value={p.id}>
                      {new Date(p.data_ora).toLocaleDateString('it-IT')} · {p.avversario}
                      {p.competizione ? ` (${p.competizione})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label className="label">Data partita</label>
                  <input
                    className="input"
                    type="date"
                    style={{ width: '100%', marginTop: 4 }}
                    value={form.data_partita}
                    onChange={e => setForm(f => ({ ...f, data_partita: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Avversario</label>
                  <input
                    className="input"
                    style={{ width: '100%', marginTop: 4 }}
                    value={form.avversario}
                    onChange={e => setForm(f => ({ ...f, avversario: e.target.value }))}
                    placeholder="es. ASD Bari"
                  />
                </div>
                <div>
                  <label className="label">Competizione</label>
                  <input
                    className="input"
                    style={{ width: '100%', marginTop: 4 }}
                    value={form.competizione}
                    onChange={e => setForm(f => ({ ...f, competizione: e.target.value }))}
                    placeholder="es. Serie D"
                  />
                </div>
              </div>
            </div>
          </fieldset>

          {/* Sezione terna arbitrale */}
          <fieldset style={{ border: '1px solid var(--grigio-5)', borderRadius: 6, padding: '12px 14px' }}>
            <legend style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grigio-3)', padding: '0 6px' }}>
              Terna arbitrale
            </legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="label">Cognome arbitro</label>
                <input
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.arbitro_cognome}
                  onChange={e => setForm(f => ({ ...f, arbitro_cognome: e.target.value }))}
                  placeholder="Rossi"
                />
              </div>
              <div>
                <label className="label">Nome arbitro</label>
                <input
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.arbitro_nome}
                  onChange={e => setForm(f => ({ ...f, arbitro_nome: e.target.value }))}
                  placeholder="Mario"
                />
              </div>
              <div>
                <label className="label">Assistente 1</label>
                <input
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.assistente1}
                  onChange={e => setForm(f => ({ ...f, assistente1: e.target.value }))}
                  placeholder="Cognome Nome"
                />
              </div>
              <div>
                <label className="label">Assistente 2</label>
                <input
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.assistente2}
                  onChange={e => setForm(f => ({ ...f, assistente2: e.target.value }))}
                  placeholder="Cognome Nome"
                />
              </div>
              <div>
                <label className="label">Quarto ufficiale</label>
                <input
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.quarto_ufficiale}
                  onChange={e => setForm(f => ({ ...f, quarto_ufficiale: e.target.value }))}
                  placeholder="Cognome Nome"
                />
              </div>
            </div>
          </fieldset>

          {/* Sezione valutazione */}
          <fieldset style={{ border: '1px solid var(--grigio-5)', borderRadius: 6, padding: '12px 14px' }}>
            <legend style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grigio-3)', padding: '0 6px' }}>
              Valutazione
            </legend>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
              <div>
                <label className="label">Voto (1–10)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={10}
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.voto_arbitro}
                  onChange={e => setForm(f => ({ ...f, voto_arbitro: e.target.value }))}
                  placeholder="6"
                />
              </div>
              <div>
                <label className="label">Comportamento</label>
                <select
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.comportamento}
                  onChange={e => setForm(f => ({ ...f, comportamento: e.target.value as any }))}
                >
                  <option value="">— Seleziona —</option>
                  <option value="corretto">Corretto</option>
                  <option value="discutibile">Discutibile</option>
                  <option value="scorretto">Scorretto</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Sezione provvedimenti */}
          <fieldset style={{ border: '1px solid var(--grigio-5)', borderRadius: 6, padding: '12px 14px' }}>
            <legend style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grigio-3)', padding: '0 6px' }}>
              Provvedimenti
            </legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="label">Ammoniti nostri</label>
                <input
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.ammoniti_nostri}
                  onChange={e => setForm(f => ({ ...f, ammoniti_nostri: e.target.value }))}
                  placeholder="Rossi, Bianchi, …"
                />
              </div>
              <div>
                <label className="label">Espulsi nostri</label>
                <input
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.espulsi_nostri}
                  onChange={e => setForm(f => ({ ...f, espulsi_nostri: e.target.value }))}
                  placeholder="Verdi, …"
                />
              </div>
              <div>
                <label className="label">Ammoniti avversari</label>
                <input
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.ammoniti_avversari}
                  onChange={e => setForm(f => ({ ...f, ammoniti_avversari: e.target.value }))}
                  placeholder="…"
                />
              </div>
              <div>
                <label className="label">Espulsi avversari</label>
                <input
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.espulsi_avversari}
                  onChange={e => setForm(f => ({ ...f, espulsi_avversari: e.target.value }))}
                  placeholder="…"
                />
              </div>
            </div>
          </fieldset>

          {/* Sezione episodi */}
          <fieldset style={{ border: '1px solid var(--grigio-5)', borderRadius: 6, padding: '12px 14px' }}>
            <legend style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grigio-3)', padding: '0 6px' }}>
              Episodi
            </legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label className="label">Episodi contestati</label>
                <textarea
                  className="input"
                  style={{ width: '100%', marginTop: 4, minHeight: 64, resize: 'vertical' }}
                  value={form.episodi_contestati}
                  onChange={e => setForm(f => ({ ...f, episodi_contestati: e.target.value }))}
                  placeholder="Descrivi i principali episodi contestati…"
                />
              </div>
              <div>
                <label className="label">Episodi favorevoli</label>
                <textarea
                  className="input"
                  style={{ width: '100%', marginTop: 4, minHeight: 64, resize: 'vertical' }}
                  value={form.episodi_favorevoli}
                  onChange={e => setForm(f => ({ ...f, episodi_favorevoli: e.target.value }))}
                  placeholder="Episodi favorevoli alla nostra squadra…"
                />
              </div>
              <div>
                <label className="label">Note generali</label>
                <textarea
                  className="input"
                  style={{ width: '100%', marginTop: 4, minHeight: 64, resize: 'vertical' }}
                  value={form.note_generali}
                  onChange={e => setForm(f => ({ ...f, note_generali: e.target.value }))}
                  placeholder="Osservazioni generali sulla direzione di gara…"
                />
              </div>
            </div>
          </fieldset>

          {/* Stato */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <label className="label" style={{ marginBottom: 0 }}>Stato</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['bozza', 'completato'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, stato: s }))}
                  className={`btn btn-sm ${form.stato === s ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>
              Annulla
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvataggio…' : editId ? 'Aggiorna rapporto' : 'Crea rapporto'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal conferma eliminazione */}
      <Modal open={!!deleteId} title="Elimina rapporto" onClose={() => setDeleteId(null)}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Sei sicuro di voler eliminare questo rapporto arbitrale? L&apos;operazione non è reversibile.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setDeleteId(null)}>Annulla</button>
          <button className="btn btn-sm" style={{ background: 'var(--rosso)', color: 'var(--white)', border: 'none', cursor: 'pointer', padding: '6px 14px', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} onClick={handleDelete}>
            Elimina
          </button>
        </div>
      </Modal>
    </div>
  )
}
