'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toast } from '@/components/ui'
import type { GiocatoreElegibile, GiocatoreNonElegibile } from '@/lib/distinta'
import Link from 'next/link'

interface StaffForm {
  allenatore: string
  vice_allenatore: string
  medico: string
  dirigente: string
}

interface Props {
  partita: {
    id: string
    avversario: string
    data_ora: string
    competizione: string | null
    giornata: number | null
    casa_trasferta: string | null
    campo: string | null
  }
  eleggibili: GiocatoreElegibile[]
  nonEleggibili: GiocatoreNonElegibile[]
  staffDefault: StaffForm
  preselectedIds: string[] | null
  squalificheManuale?: number
}

const RUOLO_SHORT: Record<string, string> = {
  portiere: 'POR', difensore_centrale: 'DC', terzino: 'TRZ',
  centrocampista_difensivo: 'CDM', centrocampista: 'CEN', trequartista: 'TRQ',
  ala: 'ALA', seconda_punta: '2AP', centravanti: 'ATT',
}

const MAX_SELEZIONATI = 18

export default function DistintaEditor({ partita, eleggibili, nonEleggibili, staffDefault, preselectedIds, squalificheManuale = 0 }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(
    new Set(preselectedIds ?? [])
  )
  const [staff, setStaff] = useState<StaffForm>(staffDefault)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_SELEZIONATI) {
        next.add(id)
      }
      return next
    })
  }

  const salva = async (): Promise<boolean> => {
    setSaving(true)
    try {
      const res = await fetch('/api/distinte/salva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partita_id: partita.id,
          giocatori: eleggibili.filter(g => selected.has(g.id)),
          staff,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Errore salvataggio')
      return true
    } catch (err: any) {
      setToast({ msg: err.message, tipo: 'error' })
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSalva = async () => {
    const ok = await salva()
    if (ok) setToast({ msg: 'Distinta salvata con successo', tipo: 'success' })
  }

  const handleGeneraPDF = async () => {
    if (selected.size === 0) {
      setToast({ msg: 'Seleziona almeno un giocatore', tipo: 'error' })
      return
    }
    const ok = await salva()
    if (ok) window.open(`/print/distinta/${partita.id}`, '_blank')
  }

  const fmtData = (d: string) =>
    new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtOra = (d: string) =>
    new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 860 }}>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {/* Banner squalifiche senza riferimento comunicato FIGC */}
      {squalificheManuale > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span>
            ⚠️ {squalificheManuale} squalifica{squalificheManuale > 1 ? 'i' : ''} non collegata{squalificheManuale > 1 ? 'i' : ''} a un comunicato FIGC.
            Potrebbe trattarsi di inserimento manuale — verifica tramite i comunicati ufficiali.
          </span>
          <a
            href="/dashboard/segretario/figc/comunicati"
            style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ambra)', textDecoration: 'underline' }}
          >
            Apri comunicati →
          </a>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Link href="/dashboard/segretario/distinte" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← Distinte Gara
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', marginTop: 6 }}>
            vs {partita.avversario}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {fmtData(partita.data_ora)} · {fmtOra(partita.data_ora)}
            {partita.campo && ` · ${partita.campo}`}
            {partita.competizione && ` · ${partita.competizione}`}
            {partita.giornata && ` · G${partita.giornata}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginTop: 4 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleSalva} disabled={saving}>
            {saving ? 'Salvataggio…' : '💾 Salva distinta'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleGeneraPDF} disabled={saving}>
            {saving ? 'Preparazione…' : '🖨 Genera PDF'}
          </button>
        </div>
      </div>

      {/* Alert eleggibili insufficienti */}
      {eleggibili.length < 14 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          ⚠️ Solo <strong>{eleggibili.length}</strong> giocatori eleggibili — verifica tesseramenti e certificati medici
        </div>
      )}

      {/* Giocatori eleggibili */}
      <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Giocatori eleggibili ({eleggibili.length})
          </div>
          <div style={{ fontSize: 12, color: selected.size >= MAX_SELEZIONATI ? 'var(--accent-orange)' : 'var(--text-muted)' }}>
            {selected.size}/{MAX_SELEZIONATI} selezionati
          </div>
        </div>
        {eleggibili.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nessun giocatore eleggibile
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)' }}>
                <th style={thS}></th>
                <th style={thS}>N°</th>
                <th style={thS}>Giocatore</th>
                <th style={thS}>Ruolo</th>
                <th style={thS}>Tessera FIGC</th>
              </tr>
            </thead>
            <tbody>
              {eleggibili.map(g => {
                const isChecked = selected.has(g.id)
                const isDisabled = !isChecked && selected.size >= MAX_SELEZIONATI
                return (
                  <tr
                    key={g.id}
                    onClick={() => !isDisabled && toggle(g.id)}
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      background: isChecked ? 'var(--accent-blue-lt)' : undefined,
                      opacity: isDisabled ? 0.45 : 1,
                    }}
                  >
                    <td style={{ ...tdS, width: 44 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={() => {}}
                        style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                      />
                    </td>
                    <td style={{ ...tdS, width: 48, fontWeight: 700, color: 'var(--text-muted)' }}>
                      {g.numero_maglia ?? '—'}
                    </td>
                    <td style={tdS}>
                      <span style={{ fontWeight: 600 }}>{g.cognome}</span> {g.nome}
                    </td>
                    <td style={tdS}>
                      {g.ruolo_principale ? (
                        <span className="badge badge-blu" style={{ fontSize: 10 }}>
                          {RUOLO_SHORT[g.ruolo_principale] ?? g.ruolo_principale}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ ...tdS, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                      {g.codice_tessera_figc ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Non eleggibili */}
      {nonEleggibili.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-red)' }}>
              Non eleggibili ({nonEleggibili.length})
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {nonEleggibili.map(({ giocatore: g, motivi }) => (
                <tr key={g.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ ...tdS, width: 48, fontWeight: 700, color: 'var(--text-muted)' }}>
                    {g.numero_maglia ?? '—'}
                  </td>
                  <td style={tdS}>
                    <span style={{ fontWeight: 600 }}>{g.cognome}</span> {g.nome}
                  </td>
                  <td style={tdS}>
                    {motivi.map((m, i) => (
                      <span key={i} className="badge badge-rosso" style={{ fontSize: 10, marginRight: 4 }}>
                        {m}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Staff */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
          Staff tecnico
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {([
            ['allenatore', 'Allenatore'],
            ['vice_allenatore', 'Vice Allenatore'],
            ['medico', 'Medico'],
            ['dirigente', 'Dirigente Accompagnatore'],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input
                className="input"
                style={{ width: '100%', marginTop: 4 }}
                value={staff[key]}
                onChange={e => setStaff(s => ({ ...s, [key]: e.target.value }))}
                placeholder={label}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const thS: React.CSSProperties = {
  padding: '8px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border)',
}

const tdS: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 13,
  verticalAlign: 'middle',
}
