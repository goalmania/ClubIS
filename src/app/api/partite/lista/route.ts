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

  // Active squads for UI (stat cards, form selectors)
  const { data: squadre } = await admin
    .from('squadre')
    .select('id, nome, categoria_eta')
    .eq('club_id', clubId)
    .eq('attiva', true)

  // All squads (active + inactive) for squad name mapping on matches
  const { data: tutteSquadre } = await admin
    .from('squadre')
    .select('id, nome')
    .eq('club_id', clubId)

  const sqMap = Object.fromEntries((tutteSquadre ?? []).map((s: any) => [s.id, { nome: s.nome }]))

  // Query by club_id on partite (direct, bypasses squad-active filter edge cases).
  // Fallback to squadra_id IN if club_id column is null on older rows.
  const sqIds = (tutteSquadre ?? []).map((s: any) => s.id)
  const { data: byClub } = await admin
    .from('partite')
    .select('id, avversario, data_ora, tipo, casa_trasferta, campo, gol_fatti, gol_subiti, stato, giornata, competizione, squadra_id, club_id')
    .eq('club_id', clubId)
    .order('data_ora', { ascending: false })

  // Also fetch any partite linked via squadra_id but missing club_id (legacy rows)
  let bySquad: any[] = []
  if (sqIds.length > 0) {
    const { data } = await admin
      .from('partite')
      .select('id, avversario, data_ora, tipo, casa_trasferta, campo, gol_fatti, gol_subiti, stato, giornata, competizione, squadra_id, club_id')
      .in('squadra_id', sqIds)
      .is('club_id', null)
      .order('data_ora', { ascending: false })
    bySquad = data ?? []
  }

  const seen = new Set<string>()
  const partite = [...(byClub ?? []), ...bySquad]
    .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
    .map((p: any) => ({ ...p, squadre: sqMap[p.squadra_id] ?? null }))

  const { data: club } = await admin.from('clubs').select('nome').eq('id', clubId).single()

  return NextResponse.json({ partite, squadre: squadre ?? [], clubId, nomeClub: club?.nome ?? '' })
}
