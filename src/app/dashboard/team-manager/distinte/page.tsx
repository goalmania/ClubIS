'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Toast } from '@/components/ui'

type Partita = { id: string; avversario: string; data_ora: string; casa_trasferta: string; stato: string; squadra_id?: string | null }
type Giocatore = { id: string; nome: string; cognome: string; ruolo_principale: string | null; numero_maglia: number | null; categoria_eta?: string | null }
type Staff = { id: string; nome: string; cognome: string; ruolo: string }
type Squadra = { id: string; nome: string; categoria_eta: string | null }

type CategoriaTab = 'tutti' | 'prima_squadra' | 'settore_giovanile' | 'scuola_calcio'
const PRIMA_SQ = ['prima_squadra', 'femminile']
const SETTORE_GIO = ['u14', 'u15', 'u16', 'u17', 'u19', 'juniores', 'primavera']
function getCat(cat: string | null | undefined): CategoriaTab {
  if (!cat) return 'scuola_calcio'
  if (PRIMA_SQ.includes(cat)) return 'prima_squadra'
  if (SETTORE_GIO.includes(cat)) return 'settore_giovanile'
  return 'scuola_calcio'
}
const CAT_LABEL: Record<CategoriaTab, string> = {
  tutti: 'Tutti', prima_squadra: 'Prima Squadra', settore_giovanile: 'Settore Giovanile', scuola_calcio: 'Scuola Calcio',
}

export default function TMDistintePage() {
  const supabase = useMemo(() => createClient(), [])
  const [clubNome, setClubNome] = useState('Club')
  const [partite, setPartite] = useState<Partita[]>([])
  const [giocatori, setGiocatori] = useState<Giocatore[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [segreteriaEmails, setSegreteriaEmails] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' | 'info' } | null>(null)

  const [squadre, setSquadre] = useState<Squadra[]>([])
  const [partitaId, setPartitaId] = useState('')
  const [convocati, setConvocati] = useState<string[]>([])
  const [staffPresenti, setStaffPresenti] = useState<string[]>([])
  const [noteTecnico, setNoteTecnico] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaTab>('tutti')

  useEffect(() => {
    const load = async () => {
      const [ctxData, sqData, giocatoriData, staffData] = await Promise.all([
        fetch('/api/user-context').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/squadre').then(r => r.json()).catch(() => []),
        fetch('/api/giocatori').then(r => r.json()).catch(() => []),
        fetch('/api/staff?ruoli=team_manager,allenatore,medico,segretario').then(r => r.json()).catch(() => []),
      ])

      if (!ctxData?.clubId) {
        window.location.href = '/auth/login'
        return
      }
      const clubId = ctxData.clubId
      const oggi = new Date().toISOString()

      const squadreArr: Squadra[] = Array.isArray(sqData) ? sqData : []
      const sqIds = squadreArr.map(s => s.id)
      const sqFilter = sqIds.length ? sqIds : ['00000000-0000-0000-0000-000000000000']
      setSquadre(squadreArr)

      const [{ data: club }, { data: pp }, { data: seg }] = await Promise.all([
        supabase.from('clubs').select('nome').eq('id', clubId).single(),
        supabase.from('partite').select('id, avversario, data_ora, casa_trasferta, stato, squadra_id').in('squadra_id', sqFilter).gte('data_ora', oggi).order('data_ora').limit(20),
        supabase.from('utenti').select('email').eq('club_id', clubId).eq('ruolo', 'segretario').not('email', 'is', null),
      ])

      // /api/giocatori restituisce oggetti piatti con numero_maglia e categoria_eta
      const giocatoriArr: Giocatore[] = Array.isArray(giocatoriData) ? giocatoriData : []
      const staffArr: Staff[] = Array.isArray(staffData) ? staffData : []

      setClubNome((club as any)?.nome ?? 'Club')
      setPartite((pp ?? []) as Partita[])
      setGiocatori(giocatoriArr)
      setStaff(staffArr)
      setSegreteriaEmails((seg ?? []).map((s: any) => s.email).filter(Boolean))
      setLoading(false)
    }
    load()
  }, [supabase])

  const toggle = (id: string, list: string[], setter: (value: string[]) => void) => {
    setter(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  const generaPdf = async () => {
    if (!partitaId) {
      setToast({ msg: 'Seleziona una partita', tipo: 'error' })
      return
    }
    if (convocati.length === 0) {
      setToast({ msg: 'Seleziona almeno un convocato', tipo: 'error' })
      return
    }

    // Costruisce il payload con gli stessi campi usati dal segretario
    const giocatoriPayload = giocatori
      .filter(g => convocati.includes(g.id))
      .sort((a, b) => (a.numero_maglia ?? 99) - (b.numero_maglia ?? 99))

    const staffSel = staff.filter(s => staffPresenti.includes(s.id))
    const staffPayload: Record<string, string> = {}
    staffSel.forEach(s => {
      const ruolo = s.ruolo === 'allenatore' ? 'allenatore'
        : s.ruolo === 'medico' ? 'medico'
        : s.ruolo === 'segretario' ? 'dirigente'
        : 'vice_allenatore'
      if (!staffPayload[ruolo]) staffPayload[ruolo] = `${s.cognome} ${s.nome}`
    })

    try {
      const res = await fetch('/api/distinte/salva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partita_id: partitaId, giocatori: giocatoriPayload, staff: staffPayload }),
      })
      if (!res.ok) {
        const json = await res.json()
        setToast({ msg: json.error ?? 'Errore salvataggio', tipo: 'error' })
        return
      }
      window.open(`/print/distinta/${partitaId}`, '_blank')
    } catch {
      setToast({ msg: 'Errore di rete', tipo: 'error' })
    }
  }

  const inviaEmail = () => {
    const stampaEmail = 'distinte@stampaservice.it'
    const destinatari = Array.from(new Set([...segreteriaEmails, stampaEmail]))
    if (destinatari.length === 0) {
      setToast({ msg: 'Nessun destinatario email configurato', tipo: 'error' })
      return
    }
    const p = partite.find(x => x.id === partitaId)
    const subject = encodeURIComponent(`Distinta gara - ${clubNome} ${p ? `vs ${p.avversario}` : ''}`)
    const body = encodeURIComponent(`In allegato la distinta gara.\n\nNote tecnico:\n${noteTecnico || '-'}`)
    window.location.href = `mailto:${destinatari.join(',')}?subject=${subject}&body=${body}`
    setToast({ msg: 'Apertura client email con destinatari preimpostati', tipo: 'info' })
  }

  const partitaSel = partite.find(p => p.id === partitaId)

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Distinte gara</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Crea la distinta gara, esporta in PDF e invia alla segreteria
        </p>
      </div>

      <div className="card no-print" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Partita</label>
            <select className="input" value={partitaId} onChange={e => setPartitaId(e.target.value)}>
              <option value="">Seleziona partita...</option>
              {partite.map(p => {
                const sq = squadre.find(s => s.id === p.squadra_id)
                return (
                  <option key={p.id} value={p.id}>
                    {sq ? `[${sq.nome}] ` : ''}{p.casa_trasferta === 'casa' ? 'vs' : '@'} {p.avversario} — {new Date(p.data_ora).toLocaleDateString('it-IT')}
                  </option>
                )
              })}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Note tecnico</label>
            <textarea className="input" rows={2} value={noteTecnico} onChange={e => setNoteTecnico(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
          <div>
            <label style={labelStyle}>Convocati ({convocati.length})</label>
            {/* Filtro categoria giocatori */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
              {(['tutti', 'prima_squadra', 'settore_giovanile', 'scuola_calcio'] as CategoriaTab[]).map(c => (
                <button key={c} onClick={() => setCategoriaFiltro(c)} style={{
                  padding: '2px 8px', borderRadius: 10, fontSize: 10, cursor: 'pointer',
                  border: categoriaFiltro === c ? '1px solid var(--accent)' : '1px solid var(--grigio-5)',
                  background: categoriaFiltro === c ? 'rgba(200,240,0,0.12)' : 'transparent',
                  color: categoriaFiltro === c ? 'var(--accent)' : 'var(--grigio-3)',
                }}>
                  {CAT_LABEL[c]}
                </button>
              ))}
            </div>
            <div className="card" style={{ maxHeight: 220, overflow: 'auto', padding: 10 }}>
              {giocatori
                .filter(g => categoriaFiltro === 'tutti' || getCat(g.categoria_eta) === categoriaFiltro)
                .map(g => (
                <label key={g.id} style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={convocati.includes(g.id)} onChange={() => toggle(g.id, convocati, setConvocati)} />
                  #{g.numero_maglia ?? '-'} {g.cognome} {g.nome} ({g.ruolo_principale ?? 'n/d'})
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Staff presenti ({staffPresenti.length})</label>
            <div className="card" style={{ maxHeight: 220, overflow: 'auto', padding: 10 }}>
              {staff.map(s => (
                <label key={s.id} style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={staffPresenti.includes(s.id)} onChange={() => toggle(s.id, staffPresenti, setStaffPresenti)} />
                  {s.cognome} {s.nome} ({s.ruolo})
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="btn btn-primary btn-sm" onClick={generaPdf}>📄 Genera PDF</button>
          <button className="btn btn-secondary btn-sm" onClick={inviaEmail}>Invia via email</button>
        </div>
      </div>

      <div id="distinta-print" className="card" style={{ padding: 22, background: 'white' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Caricamento...</div>
        ) : !partitaSel ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Seleziona una partita per visualizzare la distinta</div>
        ) : (
          <>
            {(() => {
              const sqPartita = squadre.find(s => s.id === partitaSel?.squadra_id)
              const catPartita = sqPartita ? CAT_LABEL[getCat(sqPartita.categoria_eta)] : null
              return (
                <div style={{ textAlign: 'center', borderBottom: '2px solid var(--border)', paddingBottom: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Distinta gara ufficiale</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{clubNome}</div>
                  {sqPartita && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {sqPartita.nome} · <span style={{ color: 'var(--text-muted)' }}>{catPartita}</span>
                    </div>
                  )}
                </div>
              )
            })()}
            <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
              Gara: {clubNome} {partitaSel.casa_trasferta === 'casa' ? 'vs' : '@'} {partitaSel.avversario} <br />
              Data: {new Date(partitaSel.data_ora).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={sectionTitle}>Convocati</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={th}>#</th>
                    <th style={th}>Giocatore</th>
                    <th style={th}>Ruolo</th>
                  </tr>
                </thead>
                <tbody>
                  {giocatori.filter(g => convocati.includes(g.id)).map(g => (
                    <tr key={g.id}>
                      <td style={td}>{g.numero_maglia ?? '-'}</td>
                      <td style={td}>{g.cognome} {g.nome}</td>
                      <td style={td}>{g.ruolo_principale ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={sectionTitle}>Staff presenti</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {staff.filter(s => staffPresenti.includes(s.id)).map(s => `${s.cognome} ${s.nome} (${s.ruolo})`).join(', ') || 'Nessuno'}
              </div>
            </div>
            <div>
              <div style={sectionTitle}>Note tecnico</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{noteTecnico || '—'}</div>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/team-manager" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }
const th: React.CSSProperties = { borderBottom: '1px solid var(--border)', textAlign: 'left', padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)' }
const td: React.CSSProperties = { borderBottom: '1px solid var(--border-light)', textAlign: 'left', padding: '6px 8px', fontSize: 12, color: 'var(--text-secondary)' }
