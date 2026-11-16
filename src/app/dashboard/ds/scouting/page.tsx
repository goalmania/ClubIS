import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { potenzialeColore, esitoColore } from '@/lib/helpers'
import EsitoSelect from './EsitoSelect'
import ServerFeatureGate from '@/components/ServerFeatureGate'

export default async function DSScoutingPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  const { clubId } = ctx

  const admin = createAdminClient()

  // Include reports by osservatori del club (anche se club_richiedente_id è null)
  const { data: osservatoriClub } = await admin
    .from('utenti').select('id').eq('club_id', clubId).eq('ruolo', 'osservatore')
  const obsIds = (osservatoriClub ?? []).map(u => u.id)

  const reportQuery = admin
    .from('report_scouting')
    .select('*, utenti(nome, cognome)')
    .order('data_osservazione', { ascending: false })
  const orFilter = obsIds.length > 0
    ? `club_richiedente_id.eq.${clubId},osservatore_id.in.(${obsIds.join(',')})`
    : `club_richiedente_id.eq.${clubId}`
  const { data: report } = await reportQuery.or(orFilter)

  const inValutazione = report?.filter(r => r.esito === 'in_valutazione') ?? []
  const ingaggiati    = report?.filter(r => r.esito === 'ingaggiato') ?? []

  return (
    <ServerFeatureGate feature="scouting_report" featureLabel="Report Scouting">
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, textTransform: 'none', letterSpacing: '-0.025em', color: 'var(--white)' }}>Report scouting</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
            {report?.length ?? 0} report totali · {inValutazione.length} in valutazione · {ingaggiati.length} ingaggiati
          </p>
        </div>
        <Link data-onboarding="btn-nuovo-report-scouting" href="/dashboard/ds/scouting/nuovo" className="btn btn-primary btn-sm">+ Nuovo report</Link>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="tabella-schede">
            <thead>
              <tr><th>Giocatore</th><th>Club attuale</th><th>Osservatore</th><th>Data</th><th>Voto</th><th>Potenziale</th><th>Esito</th><th></th></tr>
            </thead>
            <tbody>
              {(report ?? []).length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--grigio-4)', fontSize: 13 }}>
                  Nessun report ancora. Gli osservatori invieranno i loro rapporti qui.
                </td></tr>
              ) : (report ?? []).map(r => {
                const oss = r.utenti as any
                return (
                  <tr key={r.id}>
                    <td data-label="Giocatore" style={{ fontWeight: 500, fontSize: 13 }}>{r.nome_giocatore_ext ?? '—'}</td>
                    <td data-label="Club attuale" style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{r.club_attuale_ext ?? '—'}</td>
                    <td data-label="Osservatore" style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{oss?.nome} {oss?.cognome}</td>
                    <td data-label="Data" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{new Date(r.data_osservazione).toLocaleDateString('it-IT')}</td>
                    <td data-label="Voto">
                      <div style={{
                        width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-mono)',
                        background: (r.voto_globale ?? 0) >= 7 ? 'var(--verde-lt)' : (r.voto_globale ?? 0) >= 5 ? 'var(--ambra-lt)' : 'var(--rosso-lt)',
                        color: (r.voto_globale ?? 0) >= 7 ? 'var(--verde)' : (r.voto_globale ?? 0) >= 5 ? 'var(--ambra)' : 'var(--rosso)',
                      }}>{r.voto_globale ?? '—'}</div>
                    </td>
                    <td data-label="Potenziale"><span className={`badge ${potenzialeColore[r.potenziale] ?? 'badge-grigio'}`} style={{ fontSize: 12 }}>{r.potenziale}</span></td>
                    <td data-label="Esito">
                      <EsitoSelect reportId={r.id} esito={r.esito} />
                    </td>
                    <td data-label="">
                      <Link href={`/dashboard/ds/scouting/${r.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>Dettaglio →</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </ServerFeatureGate>
  )
}
