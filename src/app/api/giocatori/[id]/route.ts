import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { rimuoviBudgetPrevistoGiocatore } from '@/lib/staff-budget'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/giocatori/[id]
 *
 * "Elimina" un giocatore dalla rosa. Non è un DELETE fisico: il giocatore
 * ha FK con ON DELETE CASCADE da certificati_medici, contratti, pagamenti,
 * squalifiche, visite_mediche, ecc. — una cancellazione reale distruggerebbe
 * in modo irreversibile tutto lo storico sanitario/disciplinare/contabile
 * del calciatore, dati che per normativa federale vanno conservati.
 *
 * Invece: marca il giocatore come non attivo e termina (stato='cessato')
 * tutti i suoi tesseramenti del club — /api/giocatori/lista filtra già
 * su tesseramenti.stato='attivo', quindi il giocatore sparisce subito
 * dalla rosa/liste attive, ma la sua intera storia resta intatta e
 * consultabile dalla scheda giocatore.
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { clubId } = ctx
  const admin = createAdminClient()

  // Verifica che il giocatore abbia (avuto) un tesseramento in questo club —
  // stesso criterio di appartenenza usato altrove per i giocatori.
  const { data: tessClub } = await admin
    .from('tesseramenti')
    .select('id')
    .eq('giocatore_id', params.id)
    .eq('club_id', clubId)
    .limit(1)

  if (!tessClub || tessClub.length === 0) {
    return Response.json({ error: 'Giocatore non trovato in questo club' }, { status: 404 })
  }

  const { error: errTess } = await admin
    .from('tesseramenti')
    .update({ stato: 'cessato' })
    .eq('giocatore_id', params.id)
    .eq('club_id', clubId)
    .eq('stato', 'attivo')

  if (errTess) return Response.json({ error: errTess.message }, { status: 500 })

  const { error: errGiocatore } = await admin
    .from('giocatori')
    .update({ attivo: false })
    .eq('id', params.id)
    .eq('club_id', clubId)

  if (errGiocatore) return Response.json({ error: errGiocatore.message }, { status: 500 })

  await rimuoviBudgetPrevistoGiocatore(admin, clubId, params.id)

  return Response.json({ ok: true })
}
