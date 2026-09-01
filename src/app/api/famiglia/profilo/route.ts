// src/app/api/famiglia/profilo/route.ts
//
// API dedicata alla famiglia per leggere e aggiornare i propri dati di
// contatto (telefono, consensi) e vedere l'anagrafica dei figli collegati.
// Usa createAdminClient() per bypassare RLS, coerente con le altre route
// /api/famiglia/*.
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

// ── GET /api/famiglia/profilo ──────────────────────────────────────────────
export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (ctx.ruolo !== 'famiglia') return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const admin = createAdminClient()

  if (ctx.isImpersonating) {
    if (!ctx.giocatoreId) return Response.json({ anteprima: true, figli: [] })
    const { data: g } = await admin
      .from('giocatori')
      .select('id, nome, cognome, data_nascita, codice_fiscale, ruolo_principale, consenso_gdpr, consenso_immagini')
      .eq('id', ctx.giocatoreId)
      .maybeSingle()
    return Response.json({
      anteprima: true,
      figli: g ? [{ giocatore: g, famiglia: null }] : [],
    })
  }

  const { data: famiglie } = await admin
    .from('famiglie')
    .select('id, nome, cognome, relazione, email, telefono, telefono_emergenza, consenso_dati, consenso_immagini, giocatore_id, giocatori(id, nome, cognome, data_nascita, codice_fiscale, ruolo_principale, consenso_gdpr, consenso_immagini)')
    .eq('auth_user_id', ctx.userId)
    .order('created_at', { ascending: true })

  const figli = (famiglie ?? []).map((f: any) => ({
    famiglia: {
      id: f.id, nome: f.nome, cognome: f.cognome, relazione: f.relazione,
      email: f.email, telefono: f.telefono, telefono_emergenza: f.telefono_emergenza,
      consenso_dati: f.consenso_dati, consenso_immagini: f.consenso_immagini,
    },
    giocatore: f.giocatori ?? null,
  }))

  return Response.json({ anteprima: false, figli })
}

// ── PATCH /api/famiglia/profilo ────────────────────────────────────────────
// Aggiorna i propri dati di contatto (telefono, telefono_emergenza, consenso
// immagini) su una riga famiglie di cui l'utente è owner (auth_user_id).
export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (ctx.ruolo !== 'famiglia') return Response.json({ error: 'Non autorizzato' }, { status: 403 })
  if (ctx.isImpersonating) return Response.json({ error: 'Non disponibile in anteprima' }, { status: 403 })

  const body = await req.json()
  const { famiglia_id, telefono, telefono_emergenza, consenso_immagini } = body as {
    famiglia_id: string; telefono?: string; telefono_emergenza?: string; consenso_immagini?: boolean
  }
  if (!famiglia_id) return Response.json({ error: 'famiglia_id mancante' }, { status: 400 })

  const admin = createAdminClient()

  const { data: fam } = await admin
    .from('famiglie')
    .select('id')
    .eq('id', famiglia_id)
    .eq('auth_user_id', ctx.userId)
    .maybeSingle()

  if (!fam) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const { data, error } = await admin
    .from('famiglie')
    .update({
      telefono: telefono?.trim() || null,
      telefono_emergenza: telefono_emergenza?.trim() || null,
      ...(consenso_immagini !== undefined ? { consenso_immagini } : {}),
    })
    .eq('id', famiglia_id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ famiglia: data })
}
