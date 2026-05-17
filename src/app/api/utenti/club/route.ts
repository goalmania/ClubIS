// src/app/api/utenti/club/route.ts
// Restituisce gli utenti del club escludendo account platform-admin.
// Usa createAdminClient() → bypassa RLS, applica la fix is_super_admin in autonomia.

import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

// Email degli account platform-admin che non appartengono a nessun club
const PLATFORM_ADMIN_EMAILS = [
  'dimuropaolo7@gmail.com',
  'dimuroasia45@gmail.com',
  'dimuroasia7@gmail.com',
  'dimuropaolo@gmail.com',
  'dimuropaolo77@gmail.com',
]

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase  = createAdminClient()
  const { clubId } = ctx

  // Auto-fix: segna come super_admin gli account piattaforma se non già fatto
  await supabase
    .from('utenti')
    .update({ is_super_admin: true })
    .in('email', PLATFORM_ADMIN_EMAILS)
    .is('is_super_admin', null)

  // Ritorna solo gli utenti reali del club (esclude is_super_admin = true)
  const { data, error } = await supabase
    .from('utenti')
    .select('id, nome, cognome, email, ruolo, telefono, attivo, created_at, ultimo_accesso')
    .eq('club_id', clubId)
    .neq('is_super_admin', true)
    .order('ruolo')
    .order('cognome')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}
