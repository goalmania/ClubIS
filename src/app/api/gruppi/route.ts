// src/app/api/gruppi/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase  = createAdminClient()
  const { clubId } = ctx

  const [{ data: gruppi }, { data: tesseramenti }, { data: staff }] = await Promise.all([
    supabase.from('gruppi').select('*').eq('club_id', clubId).order('nome'),
    supabase.from('tesseramenti')
      .select('numero_maglia, giocatori(id,nome,cognome,ruolo_principale,data_nascita)')
      .eq('club_id', clubId).eq('stato', 'attivo'),
    supabase.from('utenti')
      .select('id,nome,cognome,ruolo,email')
      .eq('club_id', clubId)
      .eq('attivo', true)
      .or('is_super_admin.is.null,is_super_admin.eq.false')
      .order('cognome'),
  ])

  const seen = new Set<string>()
  const giocatori: any[] = []
  for (const t of (tesseramenti ?? []) as any[]) {
    const g = (t as any).giocatori
    if (!g || seen.has(g.id)) continue
    seen.add(g.id)
    giocatori.push({ ...g, numero_maglia: (t as any).numero_maglia ?? null })
  }
  giocatori.sort((a, b) => (a.cognome ?? '').localeCompare(b.cognome ?? ''))

  return Response.json({ gruppi: gruppi ?? [], giocatori, staff: staff ?? [] })
}

export async function POST(req: Request) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { nome, descrizione, colore, tipo, stagione } = await req.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('gruppi')
    .insert({
      club_id: ctx.clubId,
      nome,
      descrizione: descrizione || null,
      colore: colore || '#c8f000',
      tipo: tipo || 'squadra',
      stagione: stagione || '2024-25',
      attivo: true,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
