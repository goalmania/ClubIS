'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatData } from '@/lib/helpers'

type Report = {
  id: string
  nome_giocatore_ext?: string
  club_attuale_ext?: string
  ruolo?: string
  tecnica?: number
  tattica?: number
  fisico?: number
  mentale?: number
  stato_pipeline: string
  data_osservazione: string
}

type Colonna = {
  id: string
  label: string
  headerBg: string
  headerColor: string
}

const COLONNE: Colonna[] = [
  { id: 'in_osservazione', label: 'In Osservazione', headerBg: '#1f3a5f', headerColor: '#388bfd' },
  { id: 'interessante',    label: 'Interessante',    headerBg: '#1b3a2b', headerColor: '#3fb950' },
  { id: 'da_contattare',   label: 'Da Contattare',   headerBg: '#3a2d0f', headerColor: '#d29922' },
  { id: 'archiviato',      label: 'Archiviato',      headerBg: '#1f2428', headerColor: '#8b949e' },
]

function ratingMedio(r: Report) {
  const vals = [r.tecnica, r.tattica, r.fisico, r.mentale].filter(v => v != null) as number[]
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10
}

function Avatar({ name }: { name?: string }) {
  const parts = (name ?? '?').trim().split(' ')
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (name ?? '?').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-blue, #388bfd)',
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

export default function PipelinePage() {
  const router = useRouter()
  const supabase = createClient()

  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', (await supabase.auth.getUser()).data.user?.id ?? '').single()
    if (!utente) { setLoading(false); return }
    const { data } = await supabase
      .from('report_scouting')
      .select('id, nome_giocatore_ext, club_attuale_ext, ruolo, tecnica, tattica, fisico, mentale, stato_pipeline, data_osservazione')
      .eq('club_richiedente_id', utente.club_id)
      .order('data_osservazione', { ascending: false })
    setReports(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleDrop(nuovoStato: string) {
    if (!dragging || dragging === nuovoStato) return
    const id = dragging
    setReports(prev => prev.map(r => r.id === id ? { ...r, stato_pipeline: nuovoStato } : r))
    setDragging(null)
    setDragOver(null)
    await fetch(`/api/scouting/${id}/pipeline`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato_pipeline: nuovoStato }),
    })
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Caricamento...</div>

  const byColonna = (colId: string) => reports.filter(r => (r.stato_pipeline ?? 'in_osservazione') === colId)

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Pipeline scouting</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Trascina le card per aggiornare lo stato
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, alignItems: 'start' }}>
        {COLONNE.map(col => {
          const cards = byColonna(col.id)
          const isOver = dragOver === col.id
          return (
            <div
              key={col.id}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(col.id)}
              style={{
                borderRadius: 10,
                border: isOver ? `2px dashed ${col.headerColor}` : '2px solid transparent',
                transition: 'border 0.15s',
                minHeight: 200,
              }}
            >
              {/* Header colonna */}
              <div style={{
                background: col.headerBg, borderRadius: '8px 8px 0 0',
                padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: col.headerColor }}>{col.label}</span>
                <span style={{
                  background: col.headerColor, color: 'white',
                  borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                }}>{cards.length}</span>
              </div>

              {/* Cards */}
              <div style={{
                background: 'var(--bg-card)', borderRadius: '0 0 8px 8px',
                padding: 10, display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {cards.map(r => {
                  const rating = ratingMedio(r)
                  return (
                    <div
                      key={r.id}
                      draggable
                      onDragStart={() => setDragging(r.id)}
                      onDragEnd={() => { setDragging(null); setDragOver(null) }}
                      onClick={() => router.push(`/dashboard/osservatore/giocatori/${r.id}`)}
                      style={{
                        background: dragging === r.id ? 'var(--bg-input)' : 'var(--bg-app)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 8, padding: '10px 12px',
                        cursor: 'grab', opacity: dragging === r.id ? 0.5 : 1,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      {/* Avatar + nome */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                        <Avatar name={r.nome_giocatore_ext} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.nome_giocatore_ext ?? '—'}
                          </div>
                          {r.ruolo && (
                            <span className="badge badge-grigio" style={{ fontSize: 10, marginTop: 2 }}>
                              {r.ruolo.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        {rating !== null && (
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12,
                            background: rating >= 7 ? 'var(--accent-green)' : rating >= 5 ? 'var(--accent-orange)' : 'var(--accent-red)',
                            color: 'white',
                          }}>{rating}</div>
                        )}
                      </div>
                      {/* Footer */}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Ultima oss: {formatData(r.data_osservazione)}
                      </div>
                    </div>
                  )
                })}
                {cards.length === 0 && (
                  <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                    Nessun giocatore
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
