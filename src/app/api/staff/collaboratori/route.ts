import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { sincronizzaBudgetPrevisto } from '@/lib/staff-budget'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const TIPI_CONTRATTO = ['cococo', 'autonomo', 'dipendente', 'volontario']

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!ctx.clubId) return Response.json([], { status: 200 })

  const admin = createAdminClient()

  const { data: collaboratori, error } = await admin
    .from('collaboratori_staff')
    .select('*, utenti(id, nome, cognome, ruolo, email)')
    .eq('club_id', ctx.clubId)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const annoCorrente = new Date().getFullYear()
  const { data: compensiAnno } = await admin
    .from('compensi')
    .select('collaboratore_id, cf_esterno, importo_lordo')
    .eq('club_id', ctx.clubId)
    .eq('anno', annoCorrente)

  // Gli erogati vengono aggregati sia per utente collegato (collaboratore_id)
  // sia per codice fiscale (collaboratori esterni senza account, registrati
  // in "compensi" tramite cf_esterno).
  const erogatoPerUtente: Record<string, number> = {}
  const erogatoPerCf: Record<string, number> = {}
  for (const c of compensiAnno ?? []) {
    if (c.collaboratore_id) {
      erogatoPerUtente[c.collaboratore_id] = (erogatoPerUtente[c.collaboratore_id] ?? 0) + Number(c.importo_lordo)
    } else if (c.cf_esterno) {
      erogatoPerCf[c.cf_esterno] = (erogatoPerCf[c.cf_esterno] ?? 0) + Number(c.importo_lordo)
    }
  }

  const risultato = (collaboratori ?? []).map(c => ({
    ...c,
    compenso_annuale: Number(c.compenso_mensile ?? 0) * 12,
    erogato_anno_corrente: c.utente_id ? (erogatoPerUtente[c.utente_id] ?? 0) : (erogatoPerCf[c.codice_fiscale] ?? 0),
  }))

  return Response.json(risultato)
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!ctx.clubId) return Response.json({ error: 'Club non trovato' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { utente_id, nome_esterno, cognome_esterno, ruolo_esterno, tipo_contratto, codice_fiscale, iban, compenso_mensile, data_inizio, data_fine, attivo } = body

  const isEsterno = !utente_id
  if (isEsterno && (!String(nome_esterno ?? '').trim() || !String(cognome_esterno ?? '').trim())) {
    return Response.json({ error: 'Seleziona un utente del club oppure inserisci nome e cognome manualmente' }, { status: 400 })
  }
  if (!codice_fiscale || !data_inizio) {
    return Response.json({ error: 'Codice fiscale e data inizio sono obbligatori' }, { status: 400 })
  }
  if (tipo_contratto && !TIPI_CONTRATTO.includes(tipo_contratto)) {
    return Response.json({ error: 'Tipo contratto non valido' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (!isEsterno) {
    // Il membro deve appartenere allo stesso club
    const { data: utente } = await admin.from('utenti').select('id, club_id').eq('id', utente_id).maybeSingle()
    if (!utente || utente.club_id !== ctx.clubId) {
      return Response.json({ error: 'Utente non trovato in questo club' }, { status: 404 })
    }
  }

  const payload = {
    utente_id: isEsterno ? null : utente_id,
    nome_esterno: isEsterno ? String(nome_esterno).trim() : null,
    cognome_esterno: isEsterno ? String(cognome_esterno).trim() : null,
    ruolo_esterno: isEsterno ? (String(ruolo_esterno ?? '').trim() || null) : null,
    club_id: ctx.clubId,
    tipo_contratto: tipo_contratto || 'cococo',
    codice_fiscale: String(codice_fiscale).toUpperCase(),
    iban: iban ? String(iban).toUpperCase() : null,
    compenso_mensile: compenso_mensile !== '' && compenso_mensile != null ? Number(compenso_mensile) : null,
    data_inizio,
    data_fine: data_fine || null,
    attivo: attivo !== false,
  }

  const { data, error } = await admin
    .from('collaboratori_staff')
    .insert(payload)
    .select('*, utenti(id, nome, cognome, ruolo, email)')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await sincronizzaBudgetPrevisto(admin, ctx.clubId, data)

  return Response.json({ ...data, compenso_annuale: Number(data.compenso_mensile ?? 0) * 12, erogato_anno_corrente: 0 }, { status: 201 })
}
