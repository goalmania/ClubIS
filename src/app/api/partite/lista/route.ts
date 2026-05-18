import { getUserContext } from '@/lib/impersonation'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return NextResponse.json({ partite: [], squadre: [], clubId: null })

  const admin = createAdminClient()

  const { data: squadre } = await admin
    .from('squadre')
    .select('id, nome, categoria_eta')
    .eq('club_id', clubId)
    .eq('attiva', true)

  const sqIds = (squadre ?? []).map((s: any) => s.id)

  let partite: any[] = []
  if (sqIds.length > 0) {
    const { data } = await admin
      .from('partite')
      .select('id, avversario, data_ora, tipo, casa_trasferta, campo, gol_fatti, gol_subiti, stato, giornata, competizione, squadra_id')
      .in('squadra_id', sqIds)
      .order('data_ora', { ascending: false })

    const sqMap = Object.fromEntries((squadre ?? []).map((s: any) => [s.id, { nome: s.nome }]))
    partite = (data ?? []).map((p: any) => ({ ...p, squadre: sqMap[p.squadra_id] ?? null }))
  }

  const { data: club } = await admin.from('clubs').select('nome').eq('id', clubId).single()

  return NextResponse.json({ partite, squadre: squadre ?? [], clubId, nomeClub: club?.nome ?? '' })
}
