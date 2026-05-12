import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

const RUOLI_APPROVAZIONE = ['segretario', 'presidente', 'ds', 'team_manager']

// ── PATCH /api/accrediti/[id]/approva ────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!RUOLI_APPROVAZIONE.includes(ctx.ruolo) && !ctx.isSuperAdmin)
    return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 })

  const supabase = createAdminClient()
  const body = await req.json()
  const { stato, motivo_rifiuto, numero_badge, settore } = body

  if (!stato || !['approvato', 'rifiutato', 'in_attesa'].includes(stato))
    return NextResponse.json({ error: 'Stato non valido' }, { status: 400 })

  // Verifica che l'accredito appartenga al club
  const { data: existing } = await supabase
    .from('accrediti')
    .select('id, club_id')
    .eq('id', params.id)
    .single()

  if (!existing || (existing.club_id !== ctx.clubId && !ctx.isSuperAdmin))
    return NextResponse.json({ error: 'Accredito non trovato' }, { status: 404 })

  const updates: Record<string, unknown> = {
    stato,
    updated_at: new Date().toISOString(),
  }

  if (stato === 'approvato') {
    updates.approvato_da   = ctx.userId
    updates.motivo_rifiuto = null
    if (numero_badge) updates.numero_badge = numero_badge
    if (settore)      updates.settore      = settore
  } else if (stato === 'rifiutato') {
    updates.motivo_rifiuto = motivo_rifiuto || null
    updates.approvato_da   = null
  } else {
    updates.motivo_rifiuto = null
    updates.approvato_da   = null
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
