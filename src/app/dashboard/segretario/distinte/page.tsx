import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DistintePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente) redirect('/auth/errore')
  const clubId = utente.club_id

  const { data: squadre } = await supabase.from('squadre').select('id').eq('club_id', clubId)
  const squadreIds = (squadre ?? []).map((s: any) => s.id)

  const { data: partite } = squadreIds.length > 0
    ? await supabase
        .from('partite')
        .select('id, avversario, data_ora, competizione, giornata, casa_trasferta, stato')
        .in('squadra_id', squadreIds)
        .order('data_ora', { ascending: false })
    : { data: [] as any[] }

  const partiteIds = (partite ?? []).map((p: any) => p.id)
  const { data: distinte } = partiteIds.length > 0
    ? await supabase
        .from('distinte_gara')
        .select('partita_id, versione, generata_at')
        .in('partita_id', partiteIds)
    : { data: [] as any[] }

  const distinteMap = new Map((distinte ?? []).map((d: any) => [d.partita_id, d]))

  const totale = partite?.length ?? 0
  const generate = distinteMap.size
  const daGenerare = totale - generate

  const fmtData = (d: string) =>
    new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtOra = (d: string) =>
    new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Distinte Gara</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Archivio distinte stagione corrente
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Partite stagione</div>
          <div className="stat-value">{totale}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Distinte generate</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{generate}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Da generare</div>
          <div className="stat-value" style={{ color: daGenerare > 0 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
            {daGenerare}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {(!partite || partite.length === 0) ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nessuna partita in calendario
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)' }}>
                <th style={th}>Data</th>
                <th style={th}>Avversario</th>
                <th style={th}>Competizione</th>
                <th style={th}>Giornata</th>
                <th style={th}>Distinta</th>
                <th style={{ ...th, textAlign: 'right' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {partite.map((p: any) => {
                const distinta = distinteMap.get(p.id)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={td}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{fmtData(p.data_ora)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtOra(p.data_ora)}</div>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {p.casa_trasferta === 'trasferta' ? '✈ ' : '🏠 '}
                        {p.avversario}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {p.competizione ?? '—'}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {p.giornata ? `G${p.giornata}` : '—'}
                      </span>
                    </td>
                    <td style={td}>
                      {distinta
                        ? <span className="badge badge-verde">Generata ✓</span>
                        : <span className="badge badge-ambra">Da generare</span>
                      }
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {distinta ? (
                        <Link
                          href={`/dashboard/segretario/distinte/${p.id}/stampa`}
                          className="btn btn-ghost btn-sm"
                        >
                          Vedi
                        </Link>
                      ) : (
                        <Link
                          href={`/dashboard/segretario/distinte/${p.id}`}
                          className="btn btn-primary btn-sm"
                        >
                          Genera distinta
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border)',
}

const td: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 13,
  verticalAlign: 'middle',
}
