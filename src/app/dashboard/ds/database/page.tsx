import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { calcolaEta, ruoloShort, potenzialeColore } from '@/lib/helpers'
import ServerFeatureGate from '@/components/ServerFeatureGate'

async function DSDatabaseContent() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  const { clubId } = ctx

  const admin = createAdminClient()

  const { data: osservatoriClub } = await admin
    .from('utenti').select('id').eq('club_id', clubId).eq('ruolo', 'osservatore')
  const obsIds = (osservatoriClub ?? []).map(u => u.id)
  const orFilter = obsIds.length > 0
    ? `club_richiedente_id.eq.${clubId},osservatore_id.in.(${obsIds.join(',')})`
    : `club_richiedente_id.eq.${clubId}`

  const { data: reports } = await admin
    .from('report_scouting')
    .select('*, utenti(nome, cognome)')
    .or(orFilter)
    .order('voto_globale', { ascending: false })
  const unici: Record<string, any> = {}
  reports?.forEach(r => {
    const key = r.nome_giocatore_ext?.toLowerCase().trim() ?? r.id
    if (!unici[key] || (r.voto_globale ?? 0) > (unici[key].voto_globale ?? 0)) unici[key] = r
  })
  const lista = Object.values(unici)
  const perPotenziale: Record<string, number> = {}
  lista.forEach(r => { perPotenziale[r.potenziale] = (perPotenziale[r.potenziale] ?? 0) + 1 })
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Database giocatori</h1>
          <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
            {lista.length} profili unici da {reports?.length ?? 0} osservazioni totali
          </p>
        </div>
        <Link data-onboarding="btn-nuova-osservazione-db" href="/dashboard/ds/scouting/nuovo" className="btn btn-primary btn-sm">+ Nuova osservazione</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { l: 'Totale profili', v: lista.length },
          { l: 'Potenziale alto', v: (perPotenziale['alto'] ?? 0) + (perPotenziale['eccezionale'] ?? 0), c: 'var(--verde)' },
          { l: 'In valutazione', v: lista.filter(r => r.esito === 'in_valutazione').length, c: 'var(--ambra)' },
          { l: 'Ingaggiati', v: lista.filter(r => r.esito === 'ingaggiato').length, c: 'var(--verde)' },
        ].map(s => (
          <div key={s.l} className="stat-card" style={{ padding: '12px 16px' }}>
            <div className="stat-label">{s.l}</div>
            <div className="stat-value" style={{ fontSize: 22, color: (s as any).c }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Giocatore</th><th>Club</th><th>Voto</th><th>Potenziale</th><th>Osservazioni</th><th>Ultimo report</th><th>Esito</th></tr></thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: 'var(--grigio-4)', fontSize: 13 }}>
                  Database vuoto. Inizia ad aggiungere osservazioni.
                </td></tr>
              ) : lista.map((r, i) => {
                const nObs = reports?.filter(rep => rep.nome_giocatore_ext?.toLowerCase().trim() === r.nome_giocatore_ext?.toLowerCase().trim()).length ?? 1
                const esitoC: Record<string, string> = { in_valutazione: 'badge-ambra', ingaggiato: 'badge-verde', rifiutato: 'badge-rosso', archiviato: 'badge-grigio', lista_attesa: 'badge-blu' }
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{r.nome_giocatore_ext}</td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{r.club_attuale_ext ?? '—'}</td>
                    <td>
                      {r.voto_globale !== null ? (
                        <span style={{
                          display: 'inline-flex', width: 28, height: 28, borderRadius: 6,
                          alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-mono)',
                          background: (r.voto_globale ?? 0) >= 7 ? 'var(--verde-lt)' : (r.voto_globale ?? 0) >= 5 ? 'var(--ambra-lt)' : 'var(--rosso-lt)',
                          color: (r.voto_globale ?? 0) >= 7 ? 'var(--verde)' : (r.voto_globale ?? 0) >= 5 ? 'var(--ambra)' : 'var(--rosso)',
                        }}>{r.voto_globale}</span>
                      ) : '—'}
                    </td>
                    <td><span className={`badge ${potenzialeColore[r.potenziale] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>{r.potenziale}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--grigio-3)' }}>{nObs} {nObs === 1 ? 'report' : 'report'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{new Date(r.data_osservazione).toLocaleDateString('it-IT')}</td>
                    <td><span className={`badge ${esitoC[r.esito] ?? 'badge-grigio'}`} style={{ fontSize: 10 }}>{r.esito?.replace('_', ' ')}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default async function DSDatabasePage() {
  return (
    <ServerFeatureGate feature="scouting_report" featureLabel="Database Giocatori">
      <DSDatabaseContent />
    </ServerFeatureGate>
  )
}
