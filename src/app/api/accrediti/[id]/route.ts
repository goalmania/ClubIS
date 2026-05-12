import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

const RUOLI_DELETE = ['segretario', 'presidente', 'ds', 'ufficio_stampa']

// ── DELETE /api/accrediti/[id] ────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!RUOLI_DELETE.includes(ctx.ruolo) && !ctx.isSuperAdmin)
    return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()

  // Verifica appartenenza al club
  const { data: existing } = await supabase
    .from('accrediti')
    .select('id, club_id')
    .eq('id', params.id)
    .single()

  if (!existing || (existing.club_id !== ctx.clubId && !ctx.isSuperAdmin))
    return NextResponse.json({ error: 'Accredito non trovato' }, { status: 404 })

  const { error } = await supabase
    .from('accrediti')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// ── PATCH /api/accrediti/[id] — aggiorna campi base ──────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const supabase = createAdminClient()
  const body = await req.json()

  const { data: existing } = await supabase
    .from('accrediti')
    .select('id, club_id')
    .eq('id', params.id)
    .single()

  if (!existing || (existing.club_id !== ctx.clubId && !ctx.isSuperAdmin))
    return NextResponse.json({ error: 'Accredito non trovato' }, { status: 404 })

  const allowed = ['nome', 'cognome', 'tipo', 'organizzazione', 'email', 'telefono', 'note', 'settore', 'numero_badge']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of allowed) {
    if (k in body) updates[k] = body[k]
  }

  const { data, error } = await supabase
    .from('accrediti')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
