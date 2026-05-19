'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { potenzialeColore, esitoColore } from '@/lib/helpers'

type Report = {
  id: string
  nome_giocatore_ext: string | null
  club_attuale_ext: string | null
  partita_osservata: string | null
  data_osservazione: string
  tecnica: number | null
  tattica: number | null
  fisico: number | null
  mentale: number | null
  voto_globale: number | null
  potenziale: string
  esito: string
  regione_provenienza?: string | null
}

export default function OsservatoreReportPage() {
  const router = useRouter()
  const supabase = createClient()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase
        .from('report_scouting')
        .select('id, nome_giocatore_ext, club_attuale_ext, partita_osservata, data_osservazione, tecnica, tattica, fisico, mentale, voto_globale, potenziale, esito, regione_provenienza')
        .eq('osservatore_id', user.id)
        .order('data_osservazione', { ascending: false })
      setReports(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const mediaVoto = reports.length > 0
    ? (reports.filter(r => r.voto_globale !== null).reduce((s, r) => s + (r.voto_globale ?? 0), 0) / (reports.filter(r => r.voto_globale !== null).length || 1)).toFixed(1)
    : null

  const votoColore = (v: number | null) =>
    (v ?? 0) >= 7 ? 'var(--verde)' : (v ?? 0) >= 5 ? 'var(--ambra)' : 'var(--rosso)'

  if (loading) return <div style={{ padding: 40, color: 'var(--grigio-4)', fontSize: 13 }}>Caricamento...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
            I miei report
          </h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
            {reports.length} osservazioni totali{mediaVoto ? ` · Voto medio: ${mediaVoto}` : ''}
          </p>
        </div>
        <Link href="/dashboard/osservatore/nuovo-report" className="btn btn-primary btn-sm" data-onboarding="btn-export-pdf">+ Nuovo report</Link>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Giocatore</th>
                <th>Club</th>
                <th>Regione</th>
                <th>Partita osservata</th>
                <th>Data</th>
                <th>T</th>
                <th>Ta</th>
                <th>F</th>
                <th>M</th>
                <th>Voto</th>
                <th>Potenziale</th>
                <th>Esito</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', padding: '60px', color: 'var(--grigio-4)', fontSize: 13 }}>
                    Nessun report ancora.{' '}
                    <Link href="/dashboard/osservatore/nuovo-report" style={{ color: 'var(--verde)' }}>
                      Inizia la tua prima osservazione →
                    </Link>
                  </td>
                </tr>
              ) : reports.map(r => (
                <tr
                  key={r.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/dashboard/osservatore/giocatori/${r.id}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--grigio-6)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ fontWeight: 500, fontSize: 13 }}>{r.nome_giocatore_ext ?? '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{r.club_attuale_ext ?? '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>
                    {r.regione_provenienza
                      ? <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--grigio-5)', color: 'var(--grigio-2)' }}>📍 {r.regione_provenienza}</span>
                      : <span style={{ fontSize: 11, color: 'var(--grigio-5)' }}>—</span>
                    }
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--grigio-3)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.partita_osservata ?? '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {new Date(r.data_osservazione).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                  </td>
                  {[r.tecnica, r.tattica, r.fisico, r.mentale].map((v, i) => (
                    <td key={i} style={{
                      fontFamily: 'var(--font-mono)', fontSize: 13,
                      fontWeight: v !== null ? 600 : 400,
                      color: v !== null ? votoColore(v) : 'var(--grigio-5)',
                    }}>
                      {v ?? '—'}
                    </td>
                  ))}
                  <td>
                    {r.voto_globale !== null ? (
                      <span style={{
                        display: 'inline-flex', width: 28, height: 28, borderRadius: 6,
                        alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-mono)',
                        background: votoColore(r.voto_globale), color: 'white',
                      }}>
                        {r.voto_globale}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${potenzialeColore[r.potenziale] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>
                      {r.potenziale}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${esitoColore[r.esito] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>
                      {r.esito?.replace('_', ' ')}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <Link
                      href={`/dashboard/osservatore/giocatori/${r.id}`}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11 }}
                    >
                      Dettaglio →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
