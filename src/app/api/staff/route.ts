import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const ALL_STAFF_ROLES = ['presidente', 'ds', 'allenatore', 'segretario', 'team_manager', 'ufficio_stampa', 'medico', 'osservatore', 'giocatore']

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json([], { status: 200 })

  const url = new URL(req.url)
  const ruoliParam = url.searchParams.get('ruoli')
  const ruoli = ruoliParam ? ruoliParam.split(',').filter(r => ALL_STAFF_ROLES.includes(r)) : ALL_STAFF_ROLES

  const admin = createAdminClient()

  // Query principale: utenti con club_id corretto (attivo=true o NULL trattato come attivo)
  const { data: byClub } = await admin
    .from('utenti')
    .select('id, nome, cognome, ruolo')
    .eq('club_id', clubId)
    .in('ruolo', ruoli)
    .or('attivo.eq.true,attivo.is.null')
    .order('cognome')

  // Fallback: utenti che hanno accettato un invito per questo club
  // (copertura per utenti con club_id NULL creati prima di fix065)
  const { data: byInvite } = await admin
    .from('inviti_club')
    .select('usato_da, ruolo')
    .eq('club_id', clubId)
    .eq('usato', true)
    .not('usato_da', 'is', null)
    .in('ruolo', ruoli)

  const idsDaInvito = (byInvite ?? []).map(i => i.usato_da as string).filter(Boolean)
  const idsGiaPresenti = new Set((byClub ?? []).map(u => u.id))

  const mancanti = idsDaInvito.filter(id => !idsGiaPresenti.has(id))

  let byInviteUsers: { id: string; nome: string; cognome: string; ruolo: string }[] = []
  if (mancanti.length > 0) {
    const { data } = await admin
      .from('utenti')
      .select('id, nome, cognome, ruolo')
      .in('id', mancanti)
      .in('ruolo', ruoli)
      .or('attivo.eq.true,attivo.is.null')
    byInviteUsers = data ?? []
  }

  const tutti = [...(byClub ?? []), ...byInviteUsers]
  tutti.sort((a, b) => a.cognome.localeCompare(b.cognome, 'it'))

  // Debug temporaneo: info nell'header X-Debug
  const { count: totUtenti } = await admin.from('utenti').select('id', { count: 'exact', head: true }).eq('club_id', clubId)
  const { data: sampleUtenti } = await admin.from('utenti').select('ruolo,attivo').eq('club_id', clubId).limit(5)
  const sampleStr = (sampleUtenti ?? []).map((u: any) => `${u.ruolo}/${u.attivo}`).join(',')

  const debugHeader = `cid=${clubId} byClub=${(byClub??[]).length} inv=${idsDaInvito.length} tot=${tutti.length} anyUtenti=${totUtenti} sample=${sampleStr}`

  return new Response(JSON.stringify(tutti), {
    headers: {
      'Content-Type': 'application/json',
      'X-Staff-Debug': debugHeader,
    },
  })
}
