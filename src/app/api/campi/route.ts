import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

const RUOLI_WRITE = ['segretario', 'presidente', 'admin']

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('campi')
    .select('id, nome, indirizzo, note, attivo, costo_orario, orari_disponibili')
    .eq('club_id', ctx.clubId)
    .order('nome')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const campi = data ?? []
  const campoIds = campi.map(c => c.id)

  // Prossime prenotazioni (eventi già collegati a questo campo) — per far
  // vedere al segretario quando la società l'ha già prenotato.
  const prenotazioniPerCampo: Record<string, any[]> = {}
  if (campoIds.length > 0) {
    const { data: eventi } = await supabase
      .from('eventi_calendario')
      .select('id, campo_id, tipologia, data_ora_inizio, data_ora_fine')
      .in('campo_id', campoIds)
      .gte('data_ora_inizio', new Date().toISOString())
      .order('data_ora_inizio')

    for (const ev of eventi ?? []) {
      const cid = (ev as any).campo_id
      if (!cid) continue
      if (!prenotazioniPerCampo[cid]) prenotazioniPerCampo[cid] = []
      if (prenotazioniPerCampo[cid].length < 5) prenotazioniPerCampo[cid].push(ev)
    }
  }

  return Response.json({
    campi: campi.map(c => ({ ...c, prenotazioni: prenotazioniPerCampo[c.id] ?? [] })),
  })
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  if (!body?.nome?.trim()) return Response.json({ error: 'Nome campo richiesto' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('campi')
    .insert({
      club_id: ctx.clubId,
      nome: body.nome.trim(),
      indirizzo: body.indirizzo?.trim() || null,
      note: body.note?.trim() || null,
      costo_orario: body.costo_orario ? parseFloat(body.costo_orario) : null,
      orari_disponibili: body.orari_disponibili?.trim() || null,
    })
    .select('id, nome, indirizzo, note, attivo, costo_orario, orari_disponibili')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ campo: data })
}
