import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Controlla se l'utente esiste già in tabella utenti
      const { data: utente } = await supabase
        .from('utenti')
        .select('id, club_id, ruolo')
        .eq('id', user.id)
        .maybeSingle()

      if (!utente) {
        // Nuovo utente OAuth — redirect a completamento profilo
        return NextResponse.redirect(`${origin}/auth/completa-profilo`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/errore`)
}
