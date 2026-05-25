import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextRequest } from 'next/server'
import { generaSEPAXML, validaIBAN, type BonificoSEPA, type ConfigSEPA } from '@/lib/sepa/sepa-generator'

export const dynamic = 'force-dynamic'

function sanitizeSepa(s: string): string {
  return s.replace(/[^A-Za-z0-9 /\-?:().,'+]/g, '').slice(0, 140)
}

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const { clubId } = ctx
  if (!clubId) return Response.json({ error: 'Club non trovato' }, { status: 400 })

  const admin = createAdminClient()
  const body  = await req.json()
  const { rimborsi_ids, data_esecuzione, causale_batch, nuovi_iban = [] } = body

  if (!Array.isArray(rimborsi_ids) || rimborsi_ids.length === 0)
    return Response.json({ error: 'Nessun rimborso selezionato' }, { status: 400 })

  // Dati club
  const { data: club } = await admin.from('clubs')
    .select('id, nome, ragione_sociale, iban, intestatario_iban, bic')
    .eq('id', clubId).single()

  if (!club?.iban) return Response.json({ error: 'IBAN club non configurato. Vai in Impostazioni per aggiungerlo.' }, { status: 422 })
  if (!validaIBAN(club.iban)) return Response.json({ error: 'IBAN club non valido' }, { status: 422 })

  // Rimborsi
  const { data: rimborsi } = await admin.from('rimborsi_ras')
    .select('*').in('id', rimborsi_ids).eq('club_id', clubId)
  if (!rimborsi?.length) return Response.json({ error: 'Rimborsi non trovati' }, { status: 404 })

  // Salva nuovi IBAN forniti dall'utente
  for (const d of nuovi_iban) {
    await admin.from('dati_bancari_collaboratori').upsert({
      club_id:        clubId,
      codice_fiscale: d.codice_fiscale.trim().toUpperCase(),
      iban:           d.iban.replace(/\s/g, '').toUpperCase(),
      intestatario:   d.intestatario.trim(),
      bic:            d.bic?.trim() || null,
    }, { onConflict: 'club_id,codice_fiscale' })
  }

  // Leggi IBAN per tutti i CF
  const cfs = [...new Set(rimborsi.map((r: any) => r.codice_fiscale.toUpperCase()))]
  const { data: dati } = await admin.from('dati_bancari_collaboratori')
    .select('codice_fiscale, iban, intestatario').eq('club_id', clubId).in('codice_fiscale', cfs)

  const ibanByCf: Record<string, { iban: string; intestatario: string }> = {}
  for (const d of dati ?? []) ibanByCf[d.codice_fiscale.toUpperCase()] = { iban: d.iban, intestatario: d.intestatario }

  const mancanti = rimborsi.filter((r: any) => !ibanByCf[r.codice_fiscale.toUpperCase()])
  if (mancanti.length > 0)
    return Response.json({
      error: 'IBAN mancanti',
      mancanti: mancanti.map((r: any) => ({ cf: r.codice_fiscale, nome: `${r.soggetto_cognome} ${r.soggetto_nome}` })),
    }, { status: 422 })

  // Costruisci bonifici
  const now  = new Date()
  const ts   = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
  const slug = (club.nome || 'club').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  const msgId = `CLUBIS-${slug}-${ts}`.slice(0, 35)

  const bonifici: BonificoSEPA[] = rimborsi.map((r: any) => {
    const cf    = r.codice_fiscale.toUpperCase()
    const dato  = ibanByCf[cf]
    const causale = sanitizeSepa(r.causale || causale_batch || `Rimborso ${r.soggetto_cognome} ${r.ruolo}`)
    return {
      id:               `RIMB-${r.id.slice(0, 8)}`,
      nome_beneficiario: dato.intestatario.slice(0, 70),
      iban_beneficiario: dato.iban.replace(/\s/g, '').toUpperCase(),
      importo:           Number(r.importo),
      causale,
    }
  })

  const ibanInvalidi = bonifici.filter(b => !validaIBAN(b.iban_beneficiario))
  if (ibanInvalidi.length > 0)
    return Response.json({ error: `IBAN non validi: ${ibanInvalidi.map(b => b.nome_beneficiario).join(', ')}` }, { status: 422 })

  const config: ConfigSEPA = {
    nome_ordinante:  club.ragione_sociale || club.intestatario_iban || club.nome,
    iban_ordinante:  club.iban.replace(/\s/g, ''),
    bic_ordinante:   club.bic || undefined,
    data_esecuzione,
    id_messaggio:    msgId,
  }

  const xml    = generaSEPAXML(config, bonifici)
  const totale = bonifici.reduce((s, b) => s + b.importo, 0)

  const { data: distinta } = await admin.from('distinte_sepa').insert({
    club_id:            clubId,
    message_id:         msgId,
    data_esecuzione,
    numero_transazioni: bonifici.length,
    importo_totale:     totale,
    stato:              'generata',
    rimborsi_ids,
    xml_content:        xml,
  }).select('id').single()

  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = ts.slice(8, 14)
  const nomeSlug = (club.nome || 'club').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)
  const filename = `SEPA_${nomeSlug}_${dateStr}_${timeStr}.xml`

  return Response.json({ xml, filename, distinta_id: distinta?.id })
}
