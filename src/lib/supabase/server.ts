import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Vedi lib/supabase/client.ts: stessa durata massima esplicita per i cookie
// di sessione, così l'accesso resta valido finché non si cancellano i dati
// del sito o si effettua un logout esplicito.
const COOKIE_MAX_AGE_SECONDI = 60 * 60 * 24 * 400

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { maxAge: COOKIE_MAX_AGE_SECONDI },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
