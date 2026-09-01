// src/app/api/settore-giovanile/allenatore-categoria/route.ts
// Cambia la categoria federale assegnata a un allenatore (scuola calcio):
// rimuove i vecchi collegamenti squadre_allenatori del club e ricollega
// alla squadra della nuova categoria (creandola se non esiste ancora).
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { collegaAllenatoreCategoria } from '@/lib/settore-giovanile'
import { NextRequest } from 'next/server'

const RUOLI_WRITE = ['segretario', 'ds', 'presidente', 'admin']

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!RUOLI_WRITE.includes(ctx.ruolo)) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const { allenatoreId, categoriaFederale } = await req.json() as {
    allenatoreId: string; categoriaFederale: string
  }
  if (!allenatoreId || !categoriaFederale) {
    return Response.json({ error: 'allenatoreId e categoriaFederale sono obbligatori' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verifica che l'allenatore appartenga a questo club
  const { data: utente } = await supabase
    .from('utenti')
    .select('id, club_id, ruolo')
    .eq('id', allenatoreId)
    .eq('club_id', ctx.clubId)
    .maybeSingle()

  if (!utente || utente.ruolo !== 'allenatore') {
    return Response.json({ error: 'Allenatore non trovato in questo club' }, { status: 404 })
  }

  // Rimuovi i vecchi collegamenti dell'allenatore alle squadre del club
  const { data: squadreClub } = await supabase
    .from('squadre')
    .select('id')
    .eq('club_id', ctx.clubId)
  const squadreClubIds = (squadreClub ?? []).map(s => s.id)

  if (squadreClubIds.length > 0) {
    await supabase
      .from('squadre_allenatori')
      .delete()
      .eq('allenatore_id', allenatoreId)
      .in('squadra_id', squadreClubIds)
  }

  const { squadraId } = await collegaAllenatoreCategoria(supabase, {
    clubId: ctx.clubId,
    allenatoreId,
    categoriaFederale,
  })

  if (!squadraId) return Response.json({ error: 'Impossibile collegare la squadra' }, { status: 500 })

  return Response.json({ ok: true, squadraId })
}
