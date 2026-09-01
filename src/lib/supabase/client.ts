import { createBrowserClient } from '@supabase/ssr'

// Letto ad ogni richiesta (non in cache) così riflette subito il device
// corrente dopo uno switch di club. Il cookie non è httpOnly: non è un
// segreto, serve solo a far risolvere my_club_id() lato RLS per-dispositivo
// invece che sulla colonna condivisa utenti.club_id (vedi migration fix093).
function readDeviceIdCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(/(?:^|; )cis-device-id=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

// Cookie di sessione validi 400 giorni (il massimo consentito dai browser,
// vedi https://developer.chrome.com/blog/cookie-max-age-expires) — così un
// account famiglia che ha già effettuato l'accesso su un dispositivo non
// deve rifarlo ogni volta. Esplicito qui per non dipendere dal default della
// libreria, che potrebbe cambiare in futuro.
const COOKIE_MAX_AGE_SECONDI = 60 * 60 * 24 * 400

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { maxAge: COOKIE_MAX_AGE_SECONDI },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const deviceId = readDeviceIdCookie()
          if (!deviceId) return fetch(input, init)
          const headers = new Headers(init?.headers)
          headers.set('x-device-id', deviceId)
          return fetch(input, { ...init, headers })
        },
      },
    }
  )
}
