import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

export async function POST(req: Request) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  const { squadre } = await req.json()
  if (!Array.isArray(squadre) || squadre.length === 0)
    return Response.json({ error: 'Nessuna squadra da creare' }, { status: 400 })

  const supabase = createAdminClient()
  const { clubId } = ctx

  const stagione = (() => {
    const ora = new Date()
    const mese = ora.getMonth() + 1
    const anno = ora.getFullYear()
    const inizio = mese >= 7 ? anno : anno - 1
    return `${inizio}-${String(inizio + 1).slice(-2)}`
  })()

  const rows = squadre.map((s: { nome: string; categoria_eta: string }) => ({
    club_id:      clubId,
    nome:         s.nome,
    categoria_eta: s.categoria_eta,
    stagione,
    attiva:       true,
  }))

  const { error } = await supabase
    .from('squadre')
    .upsert(rows, { onConflict: 'club_id,categoria_eta,stagione' })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true, count: rows.length })
}
