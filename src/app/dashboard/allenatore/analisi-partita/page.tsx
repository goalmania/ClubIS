import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AnalisiPartitaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')

  const { data: partite } = await supabase
    .from('partite')
    .select('id, avversario, data_ora, casa_trasferta, gol_fatti, gol_subiti, note_allenatore, statistiche_partita(tiri_totali, tiri_in_porta, possesso_palla, corner, falli)')
    .eq('club_id', utente.club_id)
    .eq('stato', 'giocata')
    .order('data_ora', { ascending: false })
    .limit(10)

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Analisi partita</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Statistiche tattiche e note post-match
        </p>
      </div>

      {(!partite || partite.length === 0) ? (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Nessuna partita giocata da analizzare
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {partite.map(p => {
            const vinto = (p.gol_fatti ?? 0) > (p.gol_subiti ?? 0)
            const pareggio = (p.gol_fatti ?? 0) === (p.gol_subiti ?? 0)
            const stats: any = Array.isArray(p.statistiche_partita) ? p.statistiche_partita[0] : p.statistiche_partita
            return (
              <div key={p.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {p.casa_trasferta === 'casa' ? 'vs' : '@'} {p.avversario}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {new Date(p.data_ora).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                  </div>
                  <div style={{
                    padding: '8px 18px', borderRadius: 8,
                    background: vinto ? 'var(--accent-green-lt)' : pareggio ? 'var(--accent-orange-lt)' : 'var(--accent-red-lt)',
                    color: vinto ? 'var(--accent-green)' : pareggio ? 'var(--accent-orange)' : 'var(--accent-red)',
                    fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  }}>
                    {p.gol_fatti} - {p.gol_subiti}
                  </div>
                </div>

                {stats ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
                    {[
                      { label: 'Tiri', v: stats.tiri_totali },
                      { label: 'In porta', v: stats.tiri_in_porta },
                      { label: 'Possesso', v: stats.possesso_palla ? `${stats.possesso_palla}%` : null },
                      { label: 'Corner', v: stats.corner },
                      { label: 'Falli', v: stats.falli },
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign: 'center', borderRight: i < 4 ? '1px solid var(--border-light)' : undefined }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{s.v ?? '—'}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0', marginBottom: 10 }}>
                    Statistiche non ancora registrate
                  </div>
                )}

                {p.note_allenatore ? (
                  <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, borderLeft: '3px solid var(--accent-blue)' }}>
                    {p.note_allenatore}
                  </div>
                ) : (
                  <button className="btn btn-secondary btn-sm">+ Aggiungi note tattiche</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/allenatore" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>
    </div>
  )
}
