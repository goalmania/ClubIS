import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AbbonamentoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente } = await supabase
    .from('utenti')
    .select('club_id, ruolo')
    .eq('id', user.id)
    .maybeSingle()
  if (!utente) redirect('/auth/errore')

  const { data: club } = await supabase
    .from('clubs')
    .select('nome, plan_status, plan_tier, trial_ends_at, current_period_end, dmscout_abbonamento_attivo, dmscout_abbonamento_scadenza')
    .eq('id', utente.club_id)
    .maybeSingle()

  const now = new Date()

  // ── ClubIS ────────────────────────────────────────────────────────
  const planStatus: string = (club as any)?.plan_status ?? 'inactive'
  const planTier: string = (club as any)?.plan_tier ?? 'starter'
  const trialEndsAt: string | null = (club as any)?.trial_ends_at ?? null
  const currentPeriodEnd: string | null = (club as any)?.current_period_end ?? null

  const isTrial = planStatus === 'trial'
  const isActive = planStatus === 'active'
  const isExpired = planStatus === 'expired' || planStatus === 'inactive'

  const giorniTrialRimanenti = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / 86_400_000)
    : null

  // ── DMScout ───────────────────────────────────────────────────────
  const dmAttivo: boolean = (club as any)?.dmscout_abbonamento_attivo ?? false
  const dmScadenza: string | null = (club as any)?.dmscout_abbonamento_scadenza ?? null
  const dmScadenzaDate = dmScadenza ? new Date(dmScadenza) : null
  const dmScaduto = dmScadenzaDate ? dmScadenzaDate < now : false
  const dmGiorniRimanenti = dmScadenzaDate && !dmScaduto
    ? Math.ceil((dmScadenzaDate.getTime() - now.getTime()) / 86_400_000)
    : null

  const TIER_LABEL: Record<string, string> = { starter: 'Starter', pro: 'Pro', elite: 'Elite' }
  const TIER_COLOR: Record<string, string> = {
    starter: 'var(--gray)',
    pro: 'var(--accent2)',
    elite: 'var(--accent)',
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)',
        }}>
          Abbonamenti
        </h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Stato dei tuoi abbonamenti ClubIS e DM Scout
        </p>
      </div>

      {/* ── ClubIS ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <img src="/clubis-logo.png" alt="ClubIS" style={{ height: 28 }} />
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              textTransform: 'uppercase', fontSize: 13, color: 'var(--white)',
            }}>ClubIS</div>
            <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
              Piattaforma gestione club
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {isTrial && (
              <span className="badge badge-ambra">Prova gratuita</span>
            )}
            {isActive && (
              <span className="badge badge-verde">Attivo</span>
            )}
            {isExpired && (
              <span className="badge badge-rosso">Scaduto</span>
            )}
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>PIANO</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 900,
                fontSize: 18, color: TIER_COLOR[planTier] ?? 'var(--white)',
                textTransform: 'uppercase',
              }}>
                {isTrial ? 'Elite (trial)' : (TIER_LABEL[planTier] ?? planTier)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>STATO</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>
                {isTrial && giorniTrialRimanenti !== null && (
                  giorniTrialRimanenti > 0
                    ? `${giorniTrialRimanenti} ${giorniTrialRimanenti === 1 ? 'giorno rimasto' : 'giorni rimasti'}`
                    : 'Scade oggi'
                )}
                {isActive && 'Abbonamento attivo'}
                {isExpired && 'Non attivo'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>SCADENZA</div>
              <div style={{ fontSize: 14, color: 'var(--white)' }}>
                {isTrial && trialEndsAt
                  ? new Date(trialEndsAt).toLocaleDateString('it-IT')
                  : currentPeriodEnd
                    ? new Date(currentPeriodEnd).toLocaleDateString('it-IT')
                    : '—'
                }
              </div>
            </div>
          </div>

          {/* Trial countdown bar */}
          {isTrial && giorniTrialRimanenti !== null && giorniTrialRimanenti > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
                  Periodo di prova — {giorniTrialRimanenti}/7 giorni rimasti
                </span>
              </div>
              <div style={{
                height: 6, background: 'var(--grigio-6)', borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (giorniTrialRimanenti / 7) * 100)}%`,
                  background: giorniTrialRimanenti <= 2 ? 'var(--ambra)' : 'var(--accent)',
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(isTrial || isExpired) && (
              <a
                href="https://dmfootballservices.it/#prezzi"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                {isExpired ? 'Rinnova ClubIS →' : 'Abbonati ora →'}
              </a>
            )}
            {isActive && (
              <a
                href="https://dmfootballservices.it/#prezzi"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                Gestisci abbonamento →
              </a>
            )}
            <a
              href="https://wa.me/393334218596"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Supporto WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* ── DM Scout ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>🔭</span>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              textTransform: 'uppercase', fontSize: 13, color: 'var(--white)',
            }}>DM Scout</div>
            <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
              Scouting & database giocatori
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {dmAttivo && !dmScaduto ? (
              <span className="badge badge-verde">Attivo</span>
            ) : dmScaduto ? (
              <span className="badge badge-rosso">Scaduto</span>
            ) : (
              <span className="badge badge-grigio">Non attivo</span>
            )}
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>STATO</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>
                {dmAttivo && !dmScaduto ? 'Attivo' : dmScaduto ? 'Scaduto' : 'Non attivo'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>SCADENZA</div>
              <div style={{ fontSize: 14, color: 'var(--white)' }}>
                {dmScadenza ? new Date(dmScadenza).toLocaleDateString('it-IT') : '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>GIORNI RIMASTI</div>
              <div style={{ fontSize: 14, color: dmGiorniRimanenti !== null && dmGiorniRimanenti <= 7 ? 'var(--ambra)' : 'var(--white)' }}>
                {dmGiorniRimanenti !== null ? `${dmGiorniRimanenti} giorni` : '—'}
              </div>
            </div>
          </div>

          {dmAttivo && !dmScaduto && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(200,240,0,0.04)',
              border: '1px solid rgba(200,240,0,0.15)',
              borderRadius: 8,
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, color: 'var(--grigio-3)', lineHeight: 1.6 }}>
                · Database giocatori con profili completi e statistiche
                <br />· Analisi comparativa per ogni ruolo
                <br />· Report automatici e shortlist giocatori
              </div>
            </div>
          )}

          {dmGiorniRimanenti !== null && dmGiorniRimanenti <= 7 && dmAttivo && !dmScaduto && (
            <div className="alert alert-warning" style={{ marginBottom: 16 }}>
              Abbonamento DM Scout in scadenza tra {dmGiorniRimanenti} giorni. Rinnova per non perdere l&apos;accesso.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(!dmAttivo || dmScaduto) && (
              <a
                href="https://dmscout.it"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                {dmScaduto ? 'Rinnova DMScout →' : 'Attiva DMScout →'}
              </a>
            )}
            {dmAttivo && !dmScaduto && (
              <a
                href="https://dmscout.it"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                Apri DM Scout →
              </a>
            )}
            <a
              href="https://wa.me/393334218596"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Supporto WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
