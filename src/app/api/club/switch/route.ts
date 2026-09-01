import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ACTIVE_CLUB_COOKIE, DEVICE_ID_COOKIE, readDeviceId } from '@/lib/multi-club'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { club_id } = await req.json() as { club_id: string }
  if (!club_id) return NextResponse.json({ error: 'club_id mancante' }, { status: 400 })

  // Verifica che l'utente abbia accesso al club richiesto
  const db = createAdminClient()
  const { data } = await db
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', user.id)
    .eq('club_id', club_id)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ error: 'Accesso al club non autorizzato' }, { status: 403 })
  }

  // Aggiorna utenti.club_id (fallback per route legacy che leggono direttamente dal DB)
  await db
    .from('utenti')
    .update({ club_id })
    .eq('id', user.id)

  // Determina device_id: usa quello esistente nel cookie o ne genera uno nuovo
  const deviceId = readDeviceId() ?? randomUUID()

  // Salva il club attivo per questo specifico dispositivo
  await db
    .from('user_device_clubs')
    .upsert({ user_id: user.id, device_id: deviceId, club_id, updated_at: new Date().toISOString() },
             { onConflict: 'user_id,device_id' })

  const cookieOpts = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 365 }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ACTIVE_CLUB_COOKIE, club_id, cookieOpts)
  // Non httpOnly: deve essere leggibile dal client Supabase browser per essere
  // inviato come header x-device-id (vedi src/lib/supabase/client.ts e migration
  // fix093). Non è un segreto: my_club_id() valida comunque contro auth.uid().
  res.cookies.set(DEVICE_ID_COOKIE, deviceId, { ...cookieOpts, httpOnly: false })
  return res
}
