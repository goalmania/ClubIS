import { createAdminClient } from '@/lib/supabase/admin'
import { getClubFromSession } from '@/lib/server-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { isPro } from '@/lib/categorie-club'

async function getCtx(id: string) {
  const session = await getClubFromSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data: club } = await supabase.from('clubs').select('categoria').eq('id', session.clubId).single()
  if (!club || !isPro(club.categoria)) return null
  const { data: row } = await supabase
    .from('liste_professionistiche')
    .select('id')
    .eq('id', id)
    .eq('club_id', session.clubId)
    .maybeSingle()
  if (!row) return null
  return { ...session, supabase }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getCtx(params.id)
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  // Soft delete: marca come rimosso
  const { error } = await ctx.supabase
    .from('liste_professionistiche')
    .update({ stato: 'rimosso' })
    .eq('id', params.id)
    .eq('club_id', ctx.clubId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
