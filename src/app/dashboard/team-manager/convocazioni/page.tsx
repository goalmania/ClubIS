import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TMConvocazioniPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')

  const oggi = new Date().toISOString()

  const { data: partite } = await supabase
    .from('partite')
    .select('id, avversario, data_ora, casa_trasferta, stato, convocazioni(giocatore_id, stato, giocatori(nome, cognome, ruolo_principale))')
    .eq('club_id', utente.club_id)
    .gte('data_ora', oggi)
    .order('data_ora')
    .limit(10)

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Convocazioni</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Gestione liste convocati per ogni partita</p>
      </div>

      {(!partite || partite.length === 0) ? (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Nessuna partita in programma
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {partite.map(p => {
            const conv = (p.convocazioni as any[]) ?? []
            const confermati = conv.filter(c => c.stato === 'confermato').length
            return (
              <div key={p.id} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {p.casa_trasferta === 'casa' ? 'vs' : '@'} {p.avversario}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {new Date(p.data_ora).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-blue)' }}>{conv.length}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      convocati · {confermati} conf.
                    </div>
                  </div>
                </div>

                {conv.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {conv.map((c: any) => (
                      <span key={c.giocatore_id} className={`badge ${c.stato === 'confermato' ? 'badge-verde' : c.stato === 'rifiutato' ? 'badge-rosso' : 'badge-grigio'}`}>
                        {c.giocatori?.cognome ?? '—'}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm">Modifica convocati</button>
                  <button className="btn btn-secondary btn-sm">Invia notifica</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/team-manager" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>
    </div>
  )
}
