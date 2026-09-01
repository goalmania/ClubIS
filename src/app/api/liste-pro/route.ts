import { createAdminClient } from '@/lib/supabase/admin'
import { getClubFromSession } from '@/lib/server-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { isPro } from '@/lib/categorie-club'

async function getCtxPro() {
  const session = await getClubFromSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data: club } = await supabase.from('clubs').select('categoria').eq('id', session.clubId).single()
  if (!club || !isPro(club.categoria)) return null
  return { ...session, supabase }
}

export async function GET(req: NextRequest) {
  const ctx = await getCtxPro()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const stagione = new URL(req.url).searchParams.get('stagione') ?? '2026/27'

  const { data, error } = await ctx.supabase
    .from('liste_professionistiche')
    .select('*')
    .eq('club_id', ctx.clubId)
    .eq('stagione', stagione)
    .eq('stato', 'attivo')
    .order('tipo_lista')
    .order('posizione_lista')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const ctx = await getCtxPro()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  if (!body.nome_tesserato || !body.cognome_tesserato || !body.tipo_lista || !body.stagione) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  // Calcola posizione prossima disponibile
  const { data: esistenti } = await ctx.supabase
    .from('liste_professionistiche')
    .select('posizione_lista')
    .eq('club_id', ctx.clubId)
    .eq('stagione', body.stagione)
    .eq('tipo_lista', body.tipo_lista)
    .eq('stato', 'attivo')
    .order('posizione_lista', { ascending: false })
    .limit(1)

  const nextPos = ((esistenti?.[0]?.posizione_lista) ?? 0) + 1

  const { data, error } = await ctx.supabase
    .from('liste_professionistiche')
    .insert({
      club_id:           ctx.clubId,
      stagione:          body.stagione,
      tipo_lista:        body.tipo_lista,
      tesserato_id:      body.tesserato_id || null,
      nome_tesserato:    body.nome_tesserato,
      cognome_tesserato: body.cognome_tesserato,
      data_nascita:      body.data_nascita || null,
      posizione_lista:   nextPos,
      stato:             'attivo',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
