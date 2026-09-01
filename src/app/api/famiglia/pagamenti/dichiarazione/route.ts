// POST /api/famiglia/pagamenti/dichiarazione
//
// Fallback manuale per la quota di iscrizione (quote_iscrizione) quando il
// club non ha ancora attivato ClubIS Pay. A differenza di quote_giovanili e
// rate_pagamento, la tabella `pagamenti` non ha uno stato "in attesa di
// conferma" — scriverci direttamente conterebbe SUBITO come pagato tramite
// il trigger sync_pagamenti, senza controllo della segreteria. Per restare
// sicuri: qui NON scriviamo in `pagamenti`, creiamo solo una notifica per
// segretario/presidente, che registrerà il pagamento a mano come fa oggi.
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (ctx.ruolo !== 'famiglia') return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  const quotaId = body.quotaId as string
  const metodo = (body.metodo as string) ?? 'bonifico'
  const note = (body.note as string) ?? ''
  if (!quotaId) return Response.json({ error: 'quotaId mancante' }, { status: 400 })

  const admin = createAdminClient()

  const { data: quota } = await admin
    .from('quote_iscrizione')
    .select('id, club_id, giocatore_id, importo_totale, importo_pagato, stato, mese, stagione, giocatore:giocatori!giocatore_id(nome, cognome)')
    .eq('id', quotaId)
    .maybeSingle()

  if (!quota) return Response.json({ error: 'Quota non trovata' }, { status: 404 })

  const mioGiocatore = ctx.giocatoreId === quota.giocatore_id || !!(await admin
    .from('famiglie')
    .select('id')
    .eq('auth_user_id', ctx.userId)
    .eq('giocatore_id', quota.giocatore_id)
    .maybeSingle()).data
  if (!mioGiocatore) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

  if (quota.stato === 'pagato' || quota.stato === 'esonerato') {
    return Response.json({ error: 'Quota già saldata' }, { status: 400 })
  }

  const { data: staff } = await admin
    .from('utenti')
    .select('id')
    .eq('club_id', quota.club_id)
    .in('ruolo', ['segretario', 'presidente'])

  if (staff && staff.length > 0) {
    const g = quota.giocatore as any
    const residuo = (Number(quota.importo_totale) - Number(quota.importo_pagato)).toFixed(2)
    const periodo = quota.mese
      ? new Date(2000, quota.mese - 1, 1).toLocaleDateString('it-IT', { month: 'long' })
      : `stagione ${quota.stagione}`
    await admin.from('notifiche_sistema').insert(staff.map(s => ({
      club_id: quota.club_id,
      destinatario_id: s.id,
      tipo: 'alert_sistema',
      riferimento_id: quota.id,
      titolo: `Pagamento dichiarato — ${g ? `${g.nome} ${g.cognome}` : 'famiglia'}`,
      messaggio: `La famiglia dichiara di aver pagato la quota (${periodo}) tramite ${metodo} — €${residuo}.${note ? ` Nota: ${note}` : ''} Verifica e registra il pagamento.`,
      azione_url: '/dashboard/segretario/pagamenti',
    })))
  }

  return Response.json({ ok: true })
}
