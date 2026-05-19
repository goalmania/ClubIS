import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ImpersonationBanner from '@/components/layout/ImpersonationBanner'
import NotificheDropdown from '@/components/layout/NotificheDropdown'
import { RuoloUtente } from '@/types/database'
import { readImpersonation } from '@/lib/impersonation'
import { dispatchDueNotificationsForUser, getInternalNotificationCountForUser } from '@/lib/notifications/NotificationService'
import { getFamigliaCollegamenti } from '@/lib/famiglia'
import RicercaGlobale from '@/components/ui/RicercaGlobale'
import OnboardingWrapper from '@/components/ui/OnboardingWrapper'
import OnboardingSystem from '@/components/onboarding/OnboardingSystem'
import { ClubPlanProvider } from '@/lib/club-context'
import type { PlanTier } from '@/lib/features'

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

  const impersonation = utente.is_super_admin ? readImpersonation() : null

  const effectiveRuolo = (impersonation?.ruolo ?? utente.ruolo ?? 'segretario') as RuoloUtente
  const effectiveClubId = impersonation?.clubId ?? utente.club_id

  const { data: club } = await supabase
    .from('clubs')
    .select('nome, categoria, logo_url, onboarding_completed, plan_tier, plan_status, trial_ends_at')
    .eq('id', effectiveClubId)
    .maybeSingle()

  let internalNotUnread = 0
  try {
    await dispatchDueNotificationsForUser(supabase as any, user.id)
    internalNotUnread = await getInternalNotificationCountForUser(supabase as any, user.id, effectiveClubId)
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
        <div style={{
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
        />
        <main style={{
          flex: 1,
          padding: '28px 32px',
          overflowY: 'auto',
          maxWidth: '100%',
          background: 'var(--bg-app)',
          minHeight: '100vh',
        }}>
          <div style={{
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
          </div>
          <OnboardingWrapper
            clubId={effectiveClubId}
            ruolo={effectiveRuolo}
            mostra={!(club?.onboarding_completed ?? false)}
          />
          <ClubPlanProvider planTier={effectivePlanTier}>
            {children}
          </ClubPlanProvider>
          <OnboardingSystem role={effectiveRuolo} />
        </main>
      </div>
    </div>
  )
}
