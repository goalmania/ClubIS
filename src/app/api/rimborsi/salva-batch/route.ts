import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getClubFromSession } from '@/lib/server-helpers'
import { canAccess } from '@/lib/features'

interface BonificoPayload {
  id:                 string
  soggetto:           'giocatore' | 'staff'
  giocatore_id:       string | null
  staff_id:           string | null
  tipo_collaboratore: string
  nome_beneficiario:  string
  iban_beneficiario:  string
  importo:            number
  causale:            string
}

interface RequestBody {
  mese:        number
  anno:        number
  descrizione: string
  xml_sepa:    string
  bonifici:    BonificoPayload[]
  data_esecuzione: string
}

export async function POST(req: NextRequest) {
  const session = await getClubFromSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!canAccess('rimborso_sepa', session.plan)) {
    return NextResponse.json({ error: 'Piano insufficiente. Aggiorna il tuo abbonamento.' }, { status: 403 })
  }

  const sessionClient = createClient()
  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase
    .from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente?.club_id) return NextResponse.json({ error: 'Club non trovato' }, { status: 403 })

  const clubId = utente.club_id as string

  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 })
  }

  const { mese, anno, descrizione, xml_sepa, bonifici, data_esecuzione } = body

  if (!bonifici?.length) {
    return NextResponse.json({ error: 'Nessun bonifico da salvare' }, { status: 400 })
  }

  const importoTotale = bonifici.reduce((s, b) => s + b.importo, 0)

  // 1. Crea il batch
  const { data: batch, error: batchErr } = await supabase
    .from('bonifici_batch')
    .insert({
      club_id:          clubId,
      descrizione,
      mese,
      anno,
      n_bonifici:       bonifici.length,
      importo_totale:   importoTotale,
      stato:            'generato',
      sepa_xml:         xml_sepa,
      data_generazione: new Date().toISOString(),
      data_esecuzione:  data_esecuzione || null,
    })
    .select('id')
    .single()

  if (batchErr || !batch) {
    return NextResponse.json({ error: batchErr?.message ?? 'Errore creazione batch' }, { status: 500 })
  }

  // 2. Crea le registrazioni RAS (una per bonifico)
  const rasRows = bonifici.map(b => ({
    club_id:            clubId,
    giocatore_id:       b.soggetto === 'giocatore' ? b.giocatore_id : null,
    staff_id:           b.soggetto === 'staff'     ? b.staff_id     : null,
    tipo_collaboratore: b.tipo_collaboratore || 'giocatore',
    mese,
    anno,
    importo:            b.importo,
    descrizione:        b.causale,
    metodo:             'bonifico',
    bonifico_batch_id:  batch.id,
    ras_inserito:       false,
    quietanza_firmata:  false,
  }))

  const { error: rasErr } = await supabase
    .from('ras_registrazioni')
    .insert(rasRows)

  if (rasErr) {
    // Non è fatale — il batch è già creato
    console.error('Errore inserimento RAS:', rasErr.message)
  }

  // 3. Aggiorna gli IBAN se modificati (tabella dipende dal tipo soggetto)
  const ibanUpdates = bonifici.filter(b => b.iban_beneficiario)
  await Promise.all(
    ibanUpdates.map(b => {
      const patch = { iban: b.iban_beneficiario, intestatario_iban: b.nome_beneficiario }
      if (b.soggetto === 'staff' && b.staff_id) {
        return supabase.from('utenti').update(patch).eq('id', b.staff_id)
      }
      if (b.giocatore_id) {
        return supabase.from('giocatori').update(patch).eq('id', b.giocatore_id)
      }
    }),
  )

  return NextResponse.json({
    ok:        true,
    batch_id:  batch.id,
    n_ras:     rasRows.length,
  })
}

export async function PATCH(req: NextRequest) {
  // Segna batch come eseguito
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { batch_id, data_esecuzione } = await req.json() as { batch_id: string; data_esecuzione: string }

  const { error } = await supabase
    .from('bonifici_batch')
    .update({ stato: 'eseguito', data_esecuzione })
    .eq('id', batch_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggiorna data_pagamento nelle RAS collegate
  await supabase
    .from('ras_registrazioni')
    .update({ data_pagamento: data_esecuzione })
    .eq('bonifico_batch_id', batch_id)

  return NextResponse.json({ ok: true })
}
