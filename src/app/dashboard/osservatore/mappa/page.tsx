import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MappaItaliaScout from '@/components/ui/MappaItaliaScout'

export default async function OsservatoreMappaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente, error: utenteError } = await supabase
    .from('utenti')
    .select('club_id')
    .eq('id', user.id)
    .single()
  if (utenteError || !utente) redirect('/auth/errore')

  // Query base — sempre disponibile
  const { data: reportBase } = await supabase
    .from('report_scouting')
    .select('id, nome_giocatore_ext, club_attuale_ext, voto_globale, potenziale, esito, data_osservazione')
    .eq('osservatore_id', user.id)
    .order('data_osservazione', { ascending: false })

  // Query con colonne geografiche — disponibile solo dopo migration fix049
  const { data: reportGeo, error: geoError } = await supabase
    .from('report_scouting')
    .select('id, regione_provenienza, nazione_provenienza')
    .eq('osservatore_id', user.id)

  // Merge: usa i dati base + aggiungi geo se disponibili
  const geoMap: Record<string, { regione_provenienza: string | null; nazione_provenienza: string | null }> = {}
  if (!geoError && reportGeo) {
    reportGeo.forEach(r => {
      geoMap[r.id] = {
        regione_provenienza: r.regione_provenienza ?? null,
        nazione_provenienza: r.nazione_provenienza ?? null,
      }
    })
  }

  const giocatori = (reportBase ?? []).map(r => ({
    ...r,
    regione_provenienza: geoMap[r.id]?.regione_provenienza ?? null,
    nazione_provenienza: geoMap[r.id]?.nazione_provenienza ?? null,
  }))

  // Statistiche
  const totaleConRegione = giocatori.filter(r => r.regione_provenienza).length
  const regioniUniche    = new Set(giocatori.map(r => r.regione_provenienza).filter(Boolean)).size
  const nazioniEstere    = new Set(
    giocatori
      .filter(r => r.nazione_provenienza && r.nazione_provenienza !== 'Italia')
      .map(r => r.nazione_provenienza)
  ).size
  const topTalenti = giocatori.filter(r => (r.voto_globale ?? 0) >= 8).length

  const votoColore = (v: number | null) =>
    (v ?? 0) >= 8 ? 'var(--verde)' : (v ?? 0) >= 7 ? 'var(--blu)' : (v ?? 0) >= 5 ? 'var(--ambra)' : 'var(--rosso)'

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Mappa scouting
        </h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Distribuzione geografica dei giocatori osservati
        </p>
      </div>

      {/* Stat rapide */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Osservazioni totali</div>
          <div className="stat-value">{giocatori.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Regioni coperte</div>
          <div className="stat-value">{regioniUniche}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Paesi esteri</div>
          <div className="stat-value">{nazioniEstere}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Top talenti (≥8)</div>
          <div className="stat-value" style={{ color: 'var(--verde)' }}>{topTalenti}</div>
        </div>
      </div>

      {giocatori.length === 0 ? (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
          Nessun report ancora.{' '}
          <Link href="/dashboard/osservatore/nuovo-report" style={{ color: 'var(--verde)' }}>
            Crea il primo report →
          </Link>
        </div>
      ) : totaleConRegione === 0 ? (
        /* Report presenti ma nessuno ha la regione: mostra lista + istruzioni */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '14px 18px', background: 'var(--ambra-lt)', border: '1px solid var(--ambra-bd)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ambra)', marginBottom: 4 }}>
              📍 Aggiungi la regione di provenienza ai nuovi report
            </div>
            <div style={{ fontSize: 12, color: 'var(--ambra)', opacity: 0.85 }}>
              Hai {giocatori.length} osservazion{giocatori.length === 1 ? 'e' : 'i'} ma nessuna ha la regione specificata.
              I nuovi report avranno il campo regione. I giocatori appariranno sulla mappa appena inserita.
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--grigio-5)', fontSize: 13, fontWeight: 600 }}>
              I tuoi {giocatori.length} giocatori osservati
            </div>
            {giocatori.map(r => (
              <div key={r.id} style={{
                padding: '10px 18px',
                borderBottom: '1px solid var(--grigio-6)',
                display: 'flex', gap: 12, alignItems: 'center',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: votoColore(r.voto_globale),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13, color: 'white',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {r.voto_globale ?? '—'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--white)' }}>
                    {r.nome_giocatore_ext ?? '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--grigio-3)' }}>
                    {r.club_attuale_ext ?? 'Club n.d.'} · {new Date(r.data_osservazione).toLocaleDateString('it-IT')}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 4,
                  background: 'var(--grigio-6)', color: 'var(--grigio-3)',
                }}>
                  senza regione
                </span>
              </div>
            ))}
          </div>

          <Link href="/dashboard/osservatore/nuovo-report" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            + Nuovo report con regione
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 20 }}>
          <MappaItaliaScout giocatori={giocatori} />
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/osservatore" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>
    </div>
  )
}
