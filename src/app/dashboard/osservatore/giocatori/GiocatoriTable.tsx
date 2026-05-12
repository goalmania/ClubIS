'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatData } from '@/lib/helpers'

type Report = {
  id: string
  nome_giocatore_ext?: string
  club_attuale_ext?: string
  ruolo?: string
  data_nascita?: string
  tecnica?: number
  tattica?: number
  fisico?: number
  mentale?: number
  voto_globale?: number
  potenziale: string
  esito: string
  stato_pipeline?: string
  data_osservazione: string
}

type SortKey = 'nome' | 'ruolo' | 'eta' | 'club' | 'rating' | 'potenziale' | 'stato_pipeline' | 'data_osservazione'

const PIPELINE_LABEL: Record<string, string> = {
  in_osservazione: 'In Osservazione',
  interessante: 'Interessante',
  da_contattare: 'Da Contattare',
  archiviato: 'Archiviato',
}
const PIPELINE_COLORE: Record<string, string> = {
  in_osservazione: 'badge-blu',
  interessante: 'badge-verde',
  da_contattare: 'badge-ambra',
  archiviato: 'badge-grigio',
}

function ratingMedio(r: Report) {
  const vals = [r.tecnica, r.tattica, r.fisico, r.mentale].filter(v => v != null) as number[]
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10
}

function eta(r: Report) {
  if (!r.data_nascita) return null
  return new Date().getFullYear() - new Date(r.data_nascita).getFullYear()
}

export default function GiocatoriTable({
  reports,
  potenzialeColore,
  esitoColore,
}: {
  reports: Report[]
  potenzialeColore: Record<string, string>
  esitoColore: Record<string, string>
}) {
  const router = useRouter()
  const [sort, setSort] = useState<SortKey>('data_osservazione')
  const [asc, setAsc] = useState(false)

  function toggleSort(key: SortKey) {
    if (sort === key) setAsc(p => !p)
    else { setSort(key); setAsc(true) }
  }

  const sorted = [...reports].sort((a, b) => {
    let va: any, vb: any
    switch (sort) {
      case 'nome': va = a.nome_giocatore_ext ?? ''; vb = b.nome_giocatore_ext ?? ''; break
      case 'ruolo': va = a.ruolo ?? ''; vb = b.ruolo ?? ''; break
      case 'eta': va = eta(a) ?? 0; vb = eta(b) ?? 0; break
      case 'club': va = a.club_attuale_ext ?? ''; vb = b.club_attuale_ext ?? ''; break
      case 'rating': va = ratingMedio(a) ?? 0; vb = ratingMedio(b) ?? 0; break
      case 'potenziale': {
        const ord = { basso: 1, medio: 2, alto: 3, eccezionale: 4 }
        va = ord[a.potenziale as keyof typeof ord] ?? 0
        vb = ord[b.potenziale as keyof typeof ord] ?? 0
        break
      }
      case 'stato_pipeline': va = a.stato_pipeline ?? ''; vb = b.stato_pipeline ?? ''; break
      case 'data_osservazione': va = a.data_osservazione ?? ''; vb = b.data_osservazione ?? ''; break
    }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0
    return asc ? cmp : -cmp
  })

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: sort === key ? 'var(--text-primary)' : 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  })

  const arrow = (key: SortKey) => sort === key ? (asc ? ' ↑' : ' ↓') : ''

  if (sorted.length === 0) {
    return (
      <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Nessun giocatore trovato con i filtri selezionati
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-input)' }}>
              <th style={thStyle('nome')} onClick={() => toggleSort('nome')}>Nome{arrow('nome')}</th>
              <th style={thStyle('ruolo')} onClick={() => toggleSort('ruolo')}>Ruolo{arrow('ruolo')}</th>
              <th style={thStyle('eta')} onClick={() => toggleSort('eta')}>Età{arrow('eta')}</th>
              <th style={thStyle('club')} onClick={() => toggleSort('club')}>Club{arrow('club')}</th>
              <th style={{ ...thStyle('rating'), textAlign: 'center' }} onClick={() => toggleSort('rating')}>Rating{arrow('rating')}</th>
              <th style={thStyle('potenziale')} onClick={() => toggleSort('potenziale')}>Potenziale{arrow('potenziale')}</th>
              <th style={thStyle('stato_pipeline')} onClick={() => toggleSort('stato_pipeline')}>Pipeline{arrow('stato_pipeline')}</th>
              <th style={thStyle('data_osservazione')} onClick={() => toggleSort('data_osservazione')}>Ultima oss.{arrow('data_osservazione')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => {
              const rating = ratingMedio(r)
              const e = eta(r)
              return (
                <tr
                  key={r.id}
                  style={{ borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
                  onClick={() => router.push(`/dashboard/osservatore/giocatori/${r.id}`)}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-input)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                    {r.nome_giocatore_ext ?? '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {r.ruolo ? r.ruolo.replace('_', ' ') : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {e ?? '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {r.club_attuale_ext ?? '—'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    {rating !== null ? (
                      <span style={{
                        display: 'inline-block', width: 32, height: 32, borderRadius: '50%', lineHeight: '32px',
                        textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
                        background: rating >= 7 ? 'var(--accent-green)' : rating >= 5 ? 'var(--accent-orange)' : 'var(--accent-red)',
                        color: 'white',
                      }}>{rating}</span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className={`badge ${potenzialeColore[r.potenziale] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>
                      {r.potenziale}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className={`badge ${PIPELINE_COLORE[r.stato_pipeline ?? 'in_osservazione'] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>
                      {PIPELINE_LABEL[r.stato_pipeline ?? 'in_osservazione'] ?? r.stato_pipeline}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatData(r.data_osservazione)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
