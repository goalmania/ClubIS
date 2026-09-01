import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ImpersonationBanner from '@/components/layout/ImpersonationBanner'
import DemoRoleSwitcher from '@/components/layout/DemoRoleSwitcher'
import NotificheDropdown from '@/components/layout/NotificheDropdown'
import { RuoloUtente } from '@/types/database'
import { readVerifiedImpersonation } from '@/lib/impersonation'
import { dispatchDueNotificationsForUser, getInternalNotificationCountForUser } from '@/lib/notifications/NotificationService'
import { controllaScadenzeClubSeNecessario } from '@/lib/scadenze-check'
import { getFamigliaCollegamenti } from '@/lib/famiglia'
import RicercaGlobale from '@/components/ui/RicercaGlobale'
import OnboardingWrapper from '@/components/ui/OnboardingWrapper'
import OnboardingSystem from '@/components/onboarding/OnboardingSystem'
import { ClubPlanProvider } from '@/lib/club-context'
import type { PlanTier, TipoProdotto } from '@/lib/features'
import { getUserClubs, readActiveClubCookie, resolveActiveClub, resolveDeviceClub } from '@/lib/multi-club'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const authResult = await supabase.auth.getUser()
  const user = authResult.data.user
  if (!user) redirect('/auth/login')

  const { data: utenteData } = await supabase
    .from('utenti')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  // ── Famiglia fallback ───────────────────────────────────────────
  // Gli account famiglia vivono nella tabella `famiglie`, non `utenti`.
  // Se non trovati in `utenti`, proviamo il collegamento famiglia e
  // auto-registriamo il record così le visite successive sono veloci.
  let utente = utenteData

  if (!utente) {
    const collegamenti = await getFamigliaCollegamenti(supabase as any, user)

    if (collegamenti.length > 0) {
      const primo = collegamenti[0]
      const { data: tess } = await supabase
        .from('tesseramenti')
        .select('club_id')
        .eq('giocatore_id', primo.giocatore_id)
        .eq('stato', 'attivo')
        .maybeSingle()

      if (tess?.club_id) {
        // Auto-registra in utenti — le visite successive trovano subito il record
        await supabase.from('utenti').upsert({
          id:            user.id,
          club_id:       tess.club_id,
          nome:          primo.nome,
          cognome:       primo.cognome,
          email:         user.email ?? '',
          ruolo:         'famiglia',
          attivo:        true,
          is_super_admin: false,
        }, { onConflict: 'id' })

        const { data: fresh } = await supabase
          .from('utenti').select('*').eq('id', user.id).maybeSingle()
        utente = fresh
      }
    }

    if (!utente) redirect('/auth/errore')
  }
  // ───────────────────────────────────────────────────────────────

  const isDemoAccount = !!utente.is_demo_account
  const impersonation = await readVerifiedImpersonation(user.id, !!utente.is_super_admin, isDemoAccount)

  const effectiveRuolo = (impersonation?.ruolo ?? utente.ruolo ?? 'segretario') as RuoloUtente

  // Risolve il club attivo per questo dispositivo specifico.
  // Se l'utente ha un cookie device_id e ha fatto switch su questo device,
  // usa quel club. Altrimenti fallback su utente.club_id dal DB.
  const effectiveClubId = impersonation?.clubId
    ?? await resolveDeviceClub(user.id, utente.club_id)

  // Carica tutti i club dell'utente (solo per mostrare il selettore nella sidebar)
  const userClubs = !impersonation ? await getUserClubs(user.id) : []

  const { data: club } = await supabase
    .from('clubs')
    .select('nome, categoria, genere, logo_url, onboarding_completed, plan_tier, plan_status, trial_ends_at, tipo_prodotto')
    .eq('id', effectiveClubId)
    .maybeSingle()

  console.log('[DashboardLayout] club_id:', effectiveClubId, 'onboarding_completed:', club?.onboarding_completed ?? null, 'club null?', club === null)

  let internalNotUnread = 0
  try {
    await dispatchDueNotificationsForUser(supabase as any, user.id)
    internalNotUnread = await getInternalNotificationCountForUser(supabase as any, user.id, effectiveClubId)
  } catch (err) {
    void err
  }

  // Al primo accesso della giornata per questo club, lancia il controllo
  // scadenze certificati medici e quote scuola calcio — complementare al cron
  // giornaliero delle 9:00, utile se qualcuno apre il gestionale prima di
  // quell'orario. Le esecuzioni successive nello stesso giorno ritornano
  // subito (vedi il check su club_controllo_scadenze), quindi non rallentano
  // le pagine successive. Awaited (non fire-and-forget): in ambiente
  // serverless una promise non attesa rischia di essere interrotta appena la
  // risposta HTTP viene inviata.
  try {
    await controllaScadenzeClubSeNecessario(effectiveClubId)
  } catch (err) {
    void err
  }

  // Durante il trial diamo accesso elite completo
  const isTrial = (club as any)?.plan_status === 'trial'
  const trialEndsAt: string | null = (club as any)?.trial_ends_at ?? null
  const giorniRimanenti = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000)
    : null

  const rawPlanTier = ((club as any)?.plan_tier ?? 'starter') as string
  const effectivePlanTier = (
    utente.is_super_admin ? 'super_admin'
    : isTrial            ? 'elite'
    : (rawPlanTier.trim().toLowerCase() || 'starter')
  ) as PlanTier

  const tipoProdotto = (((club as any)?.tipo_prodotto ?? 'club_agonistico') as string).trim().toLowerCase() as TipoProdotto

  return (
    <div style={{ minHeight: '100vh' }}>
      {impersonation && (
        <ImpersonationBanner
          ruolo={effectiveRuolo}
          clubNome={impersonation.clubNome ?? club?.nome}
        />
      )}
      {/* Banner prova gratuita */}
      {isTrial && giorniRimanenti !== null && (
        <div className="dashboard-trial-banner" style={{
          background: 'rgba(200,240,0,0.08)',
          borderBottom: '1px solid rgba(200,240,0,0.2)',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: 'var(--font-display)',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          <span style={{ color: 'var(--accent)' }}>⚡ Prova gratuita</span>
          <span style={{ color: 'var(--gray)' }}>
            {giorniRimanenti > 0
              ? `— ${giorniRimanenti} ${giorniRimanenti === 1 ? 'giorno rimasto' : 'giorni rimasti'}`
              : '— scaduta oggi'}
          </span>
          <a
            href="https://dmfootballservices.it/#prezzi"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: 'auto',
              color: 'var(--accent)',
              textDecoration: 'none',
              fontFamily: 'var(--font-display)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            Abbonati ora →
          </a>
        </div>
      )}
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar
          ruolo={effectiveRuolo}
          utente={{
            nome: utente.nome ?? '',
            cognome: utente.cognome ?? '',
          }}
          club={{ nome: club?.nome ?? 'Club', categoria: club?.categoria ?? 'eccellenza', logoUrl: (club as any)?.logo_url ?? null }}
          notifiche={internalNotUnread ?? 0}
          isSuperAdmin={utente.is_super_admin ?? false}
          planTier={effectivePlanTier}
          tipoProdotto={tipoProdotto}
          userClubs={userClubs.map(c => ({
            club_id:   c.club_id,
            nome:      c.nome,
            categoria: c.categoria,
            logo_url:  c.logo_url,
          }))}
          activeClubId={effectiveClubId}
        />
        <main className="dashboard-main" style={{
          flex: 1,
          overflowY: 'auto',
          maxWidth: '100%',
          background: 'var(--bg-app)',
          minHeight: '100vh',
        }}>
          <div className="dashboard-topbar" style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            marginBottom: 18,
            padding: '10px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: 'var(--black)',
          }}>
            <RicercaGlobale />
            <NotificheDropdown
              userId={user.id}
              clubId={effectiveClubId}
              initialCount={internalNotUnread ?? 0}
            />
            {isDemoAccount && !impersonation && (
              <div style={{ marginLeft: 'auto' }}>
                <DemoRoleSwitcher clubId={effectiveClubId} clubNome={club?.nome} />
              </div>
            )}
          </div>
          <OnboardingWrapper
            clubId={effectiveClubId}
            ruolo={effectiveRuolo}
            mostra={!(club?.onboarding_completed ?? false)}
          />
          <ClubPlanProvider planTier={effectivePlanTier} categoria={club?.categoria ?? 'eccellenza'} genere={(club as any)?.genere ?? 'maschile'} clubId={effectiveClubId} tipoProdotto={tipoProdotto}>
            {children}
          </ClubPlanProvider>
          <OnboardingSystem role={effectiveRuolo} />
        </main>
      </div>
    </div>
  )
}
