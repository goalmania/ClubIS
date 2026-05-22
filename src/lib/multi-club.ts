import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export const ACTIVE_CLUB_COOKIE = 'cis-active-club'

export type UserClubEntry = {
  club_id: string
  role: string
  nome: string
  categoria: string
  logo_url: string | null
}

/**
 * Restituisce tutti i club con status=accepted per l'utente.
 * Usa il client admin per bypassare RLS (chiamata server-side).
 */
export async function getUserClubs(userId: string): Promise<UserClubEntry[]> {
  const db = createAdminClient()
  const { data } = await db
    .from('user_clubs')
    .select(`
      club_id,
      role,
      clubs ( nome, categoria, logo_url )
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: true })

  if (!data) return []

  return data.map((row: any) => ({
    club_id:   row.club_id,
    role:      row.role,
    nome:      row.clubs?.nome     ?? '',
    categoria: row.clubs?.categoria ?? 'eccellenza',
    logo_url:  row.clubs?.logo_url  ?? null,
  }))
}

/**
 * Legge il cookie cis-active-club server-side.
 * Ritorna null se assente.
 */
export function readActiveClubCookie(): string | null {
  try {
    return cookies().get(ACTIVE_CLUB_COOKIE)?.value ?? null
  } catch {
    return null
  }
}

/**
 * Dato l'utente e la lista dei suoi club, restituisce l'ID del club attivo.
 * Priorità: cookie > primo club della lista > fallback utente.club_id
 */
export function resolveActiveClub(
  userClubs: UserClubEntry[],
  cookieValue: string | null,
  fallbackClubId: string,
): string {
  if (userClubs.length === 0) return fallbackClubId
  if (cookieValue && userClubs.some(c => c.club_id === cookieValue)) {
    return cookieValue
  }
  return userClubs[0].club_id
}
