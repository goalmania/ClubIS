import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

interface ProvvedimentoDaApplicare {
  tipo:        'squalifica' | 'diffida' | 'ammonizione' | 'ammenda'
  giocatore_id: string
  durata:       string
  giornate:     number | null
  cognome_raw:  string
  nome_raw:     string
}

interface RequestBody {
  comunicato_id:  string
  data_inizio:    string   // ISO date, inizio squalifica/effetto
  provvedimenti:  ProvvedimentoDaApplicare[]
}

export async function POST(req: NextRequest) {
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

  const { comunicato_id, data_inizio, provvedimenti } = body

  if (!comunicato_id || !data_inizio || !provvedimenti?.length) {
    return NextResponse.json({ error: 'Dati incompleti' }, { status: 400 })
  }

  // Verifica ownership comunicato
  const { data: comm } = await supabase
    .from('comunicati_figc').select('id, numero_comunicato, data_comunicato')
    .eq('id', comunicato_id).eq('club_id', clubId).single()
  if (!comm) return NextResponse.json({ error: 'Comunicato non trovato' }, { status: 404 })

  const comunicatoRef = comm.numero_comunicato
    ? `C.U. n°${comm.numero_comunicato}${comm.data_comunicato ? ' del ' + new Date(comm.data_comunicato).toLocaleDateString('it-IT') : ''}`
    : `Comunicato del ${new Date(comm.data_comunicato).toLocaleDateString('it-IT')}`

  // Calcola le prossime N partite (per data_fine squalifiche)
  const { data: squadre } = await supabase
    .from('squadre').select('id').eq('club_id', clubId)
  const squadreIds = (squadre ?? []).map((s: any) => s.id as string)

  async function dataFinePerGiornate(n: number): Promise<string | null> {
    if (!squadreIds.length || n <= 0) return null
    const { data: partite } = await supabase
      .from('partite')
      .select('data_ora')
      .in('squadra_id', squadreIds)
      .gt('data_ora', `${data_inizio}T23:59:59`)
      .order('data_ora')
      .limit(n)
    if (partite && partite.length >= n) {
      return (partite[n - 1].data_ora as string).split('T')[0]
    }
    return null
  }

  const applicati: string[] = []
  const errori:    string[] = []

  for (const p of provvedimenti) {
    try {
      if (p.tipo === 'squalifica') {
        const nGiornate = p.giornate ?? 1
        const dataFine  = await dataFinePerGiornate(nGiornate)

        const { error } = await supabase.from('squalifiche').insert({
          club_id:            clubId,
          giocatore_id:       p.giocatore_id,
          motivo:             `${p.durata} — ${comunicatoRef}`,
          partite_restanti:   nGiornate,
          giornate_squalifica: nGiornate,
          giornate_rimanenti: nGiornate,
          data_inizio,
          data_fine:          dataFine,
          tipo_provvedimento: 'squalifica',
          comunicato_figc:    comunicatoRef,
        })

        if (error) throw new Error(error.message)

        // Aggiorna squalifiche_comunicato se esiste un record corrispondente
        await supabase
          .from('squalifiche_comunicato')
          .update({ confermato: true })
          .eq('comunicato_id', comunicato_id)
          .eq('giocatore_id', p.giocatore_id)
          .eq('tipo_sanzione', 'squalifica')

        applicati.push(`squalifica:${p.giocatore_id}`)

      } else if (p.tipo === 'diffida') {
        // Upsert diffida: incrementa contatore ammonizioni o inserisce nuovo record
        const { data: existing } = await supabase
          .from('diffide')
          .select('id, n_ammonizioni, soglia_diffida')
          .eq('club_id', clubId)
          .eq('giocatore_id', p.giocatore_id)
          .maybeSingle()

        if (existing) {
          await supabase.from('diffide')
            .update({ n_ammonizioni: existing.n_ammonizioni + 1 })
            .eq('id', existing.id)
        } else {
          await supabase.from('diffide').insert({
            club_id:         clubId,
            giocatore_id:    p.giocatore_id,
            n_ammonizioni:   1,
            soglia_diffida:  5,   // default LND
            soglia_squalifica: 6,
          })
        }
        applicati.push(`diffida:${p.giocatore_id}`)

      } else if (p.tipo === 'ammonizione') {
        // Inserisce record ammonizione nel registro
        await supabase.from('ammonizioni').insert({
          club_id:      clubId,
          giocatore_id: p.giocatore_id,
          data:         data_inizio,
          tipo:         'ammonizione',
          comunicato:   comunicatoRef,
        })
        // Incrementa contatore diffida se esiste
        const { data: diff } = await supabase
          .from('diffide')
          .select('id, n_ammonizioni')
          .eq('club_id', clubId)
          .eq('giocatore_id', p.giocatore_id)
          .maybeSingle()
        if (diff) {
          await supabase.from('diffide')
            .update({ n_ammonizioni: diff.n_ammonizioni + 1 })
            .eq('id', diff.id)
        }
        applicati.push(`ammonizione:${p.giocatore_id}`)

      } else if (p.tipo === 'ammenda') {
        // Solo log — nessun impasto sulla disponibilità
        applicati.push(`ammenda:${p.giocatore_id}`)
      }

    } catch (e: any) {
      errori.push(`${p.tipo}:${p.giocatore_id} — ${e?.message ?? 'errore sconosciuto'}`)
    }
  }

  // Marca comunicato come processato
  await supabase
    .from('comunicati_figc')
    .update({ processato: true })
    .eq('id', comunicato_id)

  return NextResponse.json({
    ok:        true,
    applicati: applicati.length,
    errori,
  })
}
