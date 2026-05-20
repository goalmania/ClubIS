import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient()

  // Verifica autenticazione
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  // Verifica che l'utente sia presidente
  const { data: utente } = await supabase
    .from('utenti')
    .select('club_id, ruolo')
    .eq('id', user.id)
    .maybeSingle()

  if (!utente?.club_id || utente.ruolo !== 'presidente') {
    console.error('[API /onboarding/completa] Accesso negato:', { userId: user.id, ruolo: utente?.ruolo })
    return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  // Usa l'admin client (service_role) per bypassare RLS su onboarding_completed
  const admin = createAdminClient()

  const { error: clubError } = await admin
    .from('clubs')
    .update({ onboarding_completed: true, onboarding_step: 4 })
    .eq('id', utente.club_id)

  if (clubError) {
    console.error('[API /onboarding/completa] Errore aggiornamento clubs:', clubError)
    return NextResponse.json({ error: clubError.message }, { status: 500 })
  }

  // Marca anche onboarding_progress come completato per il presidente,
  // così il pannello tutorial interattivo non si riattiva ad ogni accesso
  const { error: progressError } = await admin
    .from('onboarding_progress')
    .upsert(
      {
        user_id: user.id,
        role: 'presidente',
        onboarding_completed: true,
        completed_steps: [],
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,role' },
    )

  if (progressError) {
    // Non bloccante: il tooltip si può ancora skippaee manualmente
    console.error('[API /onboarding/completa] Errore aggiornamento onboarding_progress:', progressError)
  }

  console.log('[API /onboarding/completa] Onboarding completato per club:', utente.club_id, 'user:', user.id)
  return NextResponse.json({ ok: true })
}
