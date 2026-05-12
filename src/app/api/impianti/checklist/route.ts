import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: templates } = await supabase
    .from('checklist_template')
    .select('*')
    .eq('club_id', ctx.clubId)
    .eq('attivo', true)
    .order('area')

  const templateIds = templates?.map(t => t.id) ?? []
  let ultimeEsec: any[] = []

  if (templateIds.length > 0) {
    const { data: esec } = await supabase
      .from('checklist_eseguita')
      .select('*, eseguita_da_utente:utenti!eseguita_da(nome, cognome)')
      .eq('club_id', ctx.clubId)
      .in('template_id', templateIds)
      .order('data_esecuzione', { ascending: false })
      .limit(templateIds.length * 3)

    ultimeEsec = esec ?? []
  }

  return Response.json({ templates, ultimeEsec })
}

export async function POST(req: Request) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const { template_id, voci_completate, partita_id, note_generali } = body

  const totVoci = voci_completate.length
  const vocCompletate = voci_completate.filter((v: any) => v.completata).length
  const completata_al = totVoci > 0 ? Math.round((vocCompletate / totVoci) * 100) : 0
  const flag_incompleta = completata_al < 100

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('checklist_eseguita')
    .insert({
      club_id: ctx.clubId,
      template_id,
      eseguita_da: ctx.userId,
      data_esecuzione: new Date().toISOString(),
      partita_id: partita_id ?? null,
      voci_completate,
      completata_al,
      flag_incompleta,
      note_generali: note_generali ?? null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (flag_incompleta) {
    const { data: template } = await supabase
      .from('checklist_template')
      .select('nome, frequenza')
      .eq('id', template_id)
      .single()

    if (template?.frequenza === 'pre_gara') {
      const { data: destinatari } = await supabase
        .from('utenti')
        .select('id, ruolo')
        .eq('club_id', ctx.clubId)
        .in('ruolo', ['segretario', 'team_manager'])
        .eq('attivo', true)

      if (destinatari && destinatari.length > 0) {
        await supabase.from('notifiche_sistema').insert(
          destinatari.map((u: { id: string; ruolo: string }) => ({
            club_id:            ctx.clubId,
            destinatario_id:    u.id,
            ruolo_destinatario: u.ruolo,
            tipo:               'alert_sistema',
            titolo:             '⚠️ Checklist pre-gara incompleta',
            messaggio:          `${template.nome}: completata al ${completata_al}%. Verificare prima del fischio.`,
            azione_url:         '/dashboard/custode/impianti',
            letta:              false,
          }))
        )
      }
    }
  }

  return Response.json({ esecuzione: data }, { status: 201 })
}
