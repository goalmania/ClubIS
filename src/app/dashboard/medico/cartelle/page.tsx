'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import CreaCartella from '@/components/forms/CreaCartella'
import FeatureGate from '@/components/FeatureGate'

export default function MedicoCartellePage() {
  const supabase = createClient()

  const [giocatori, setGiocatori] = useState<any[]>([])
  const [clubId, setClubId]       = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)

  const oggi = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return
    setClubId(utente.club_id)

    const { data: tesserati } = await supabase
      .from('tesseramenti')
      .select('giocatori(id, nome, cognome, ruolo_principale, data_nascita, gruppo_sanguigno, allergie, terapie_in_corso, certificati_medici(data_scadenza), infortuni(data_infortunio, data_rientro_effettiva))')
      .eq('club_id', utente.club_id)
      .eq('stato', 'attivo')

    // deduplica per giocatore_id (un giocatore può avere più tesseramenti attivi)
    const seen = new Set<string>()
    const unici: any[] = []
    for (const t of tesserati ?? []) {
      const g = t.giocatori as any
      if (g && !seen.has(g.id)) { seen.add(g.id); unici.push(g) }
    }
    unici.sort((a, b) => (a.cognome ?? '').localeCompare(b.cognome ?? '', 'it'))

    setGiocatori(unici)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <FeatureGate feature="cartelle_cliniche" featureLabel="Cartelle Cliniche">
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
            Cartelle cliniche
          </h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
            Anagrafica sanitaria di tutti i giocatori
          </p>
        </div>
        {clubId && <CreaCartella clubId={clubId} onSuccess={load} />}
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
          Caricamento...
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--grigio-6)' }}>
                <th style={th}>Giocatore</th>
                <th style={th}>Nascita</th>
                <th style={th}>Gruppo</th>
                <th style={th}>Allergie</th>
                <th style={th}>Certificato</th>
                <th style={th}>Infortuni</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {giocatori.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
                    Nessun giocatore
                  </td>
                </tr>
              ) : giocatori.map(g => {
                const certs = (g.certificati_medici as any[]) ?? []
                const ultimoCert = certs.sort((a, b) =>
                  (b.data_scadenza ?? '').localeCompare(a.data_scadenza ?? '')
                )[0]
                const certValido = ultimoCert?.data_scadenza && ultimoCert.data_scadenza >= oggi
                const infortuni  = (g.infortuni as any[]) ?? []
                const attivi     = infortuni.filter(i => !i.data_rientro_effettiva).length

                return (
                  <tr key={g.id} style={{ borderTop: '1px solid var(--grigio-5)' }}>
                    <td style={td}>
                      <Link href={`/dashboard/medico/cartelle/${g.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{g.cognome} {g.nome}</span>
                        <div style={{ fontSize: 11, color: 'var(--grigio-4)', textTransform: 'capitalize', marginTop: 2 }}>
                          {g.ruolo_principale?.replace(/_/g, ' ') ?? '—'}
                        </div>
                      </Link>
                    </td>
                    <td style={td}>
                      {g.data_nascita ? new Date(g.data_nascita).toLocaleDateString('it-IT') : '—'}
                    </td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {g.gruppo_sanguigno ?? '—'}
                    </td>
                    <td style={{ ...td, fontSize: 12 }}>
                      {g.allergie
                        ? <span style={{ color: 'var(--ambra)' }}>{g.allergie}</span>
                        : <span style={{ color: 'var(--grigio-4)' }}>Nessuna</span>
                      }
                    </td>
                    <td style={td}>
                      {ultimoCert?.data_scadenza ? (
                        <span className={`badge ${certValido ? 'badge-verde' : 'badge-rosso'}`}>
                          {new Date(ultimoCert.data_scadenza).toLocaleDateString('it-IT')}
                        </span>
                      ) : (
                        <span className="badge badge-grigio">Assente</span>
                      )}
                    </td>
                    <td style={td}>
                      {attivi > 0 ? (
                        <span className="badge badge-rosso">{attivi} attiv{attivi === 1 ? 'o' : 'i'}</span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--grigio-4)' }}>{infortuni.length} tot.</span>
                      )}
                    </td>
                    <td style={td}>
                      <Link
                        href={`/dashboard/medico/cartelle/${g.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11 }}
                      >
                        Apri cartella
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </FeatureGate>
  )
}

const th: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', fontSize: 10,
  fontFamily: 'var(--font-mono)', fontWeight: 600,
  color: 'var(--grigio-3)', textTransform: 'uppercase', letterSpacing: '0.08em',
}
const td: React.CSSProperties = {
  padding: '12px 14px', fontSize: 13, color: 'var(--grigio-2)', verticalAlign: 'middle',
}
