import type { SupabaseClient } from '@supabase/supabase-js'

// Stagione sportiva italiana: luglio → giugno
export function stagioneCorrente(): string {
  const oggi = new Date()
  const anno = oggi.getMonth() >= 6 ? oggi.getFullYear() : oggi.getFullYear() - 1
  return `${anno}/${String((anno + 1) % 100).padStart(2, '0')}`
}

interface CollaboratoreSync {
  id: string
  compenso_mensile: number | null
  attivo: boolean | null
  utenti?: { nome: string; cognome: string } | null
  nome_esterno?: string | null
  cognome_esterno?: string | null
}

/**
 * Tiene allineata la voce di budget previsto ("uscite_previste", categoria
 * stipendi) con il compenso annuale del collaboratore. Usa il campo `note`
 * come chiave di collegamento (collaboratori_staff non ha una FK dedicata)
 * per poter fare upsert idempotente ad ogni salvataggio dell'anagrafica.
 */
export async function sincronizzaBudgetPrevisto(admin: SupabaseClient, clubId: string, collaboratore: CollaboratoreSync) {
  const stagione = stagioneCorrente()
  const marker = `collaboratore_staff_id:${collaboratore.id}`

  const { data: esistente } = await admin
    .from('uscite_previste')
    .select('id')
    .eq('club_id', clubId)
    .eq('stagione_riferimento', stagione)
    .eq('note', marker)
    .maybeSingle()

  const annuale = Number(collaboratore.compenso_mensile ?? 0) * 12
  const attivo = collaboratore.attivo !== false

  if (!attivo || annuale <= 0) {
    if (esistente) await admin.from('uscite_previste').delete().eq('id', esistente.id)
    return
  }

  const nomeCompleto = collaboratore.utenti
    ? `${collaboratore.utenti.cognome} ${collaboratore.utenti.nome}`
    : collaboratore.cognome_esterno
      ? `${collaboratore.cognome_esterno} ${collaboratore.nome_esterno ?? ''}`.trim()
      : 'Collaboratore staff'
  const payload = {
    club_id: clubId,
    stagione_riferimento: stagione,
    descrizione: `Compenso staff — ${nomeCompleto}`,
    importo_previsto: annuale,
    categoria: 'stipendi' as const,
    note: marker,
  }

  if (esistente) {
    await admin.from('uscite_previste').update(payload).eq('id', esistente.id)
  } else {
    await admin.from('uscite_previste').insert(payload)
  }
}

interface GiocatoreCompensoSync {
  id: string
  importo_annuo: number | null
  nome: string
  cognome: string
}

/**
 * Equivalente di sincronizzaBudgetPrevisto ma per l'ingaggio di un giocatore
 * (tabella contratti). Stessa chiave di collegamento via `note`
 * (`giocatore_id:<id>`) per upsert idempotente ad ogni salvataggio del contratto.
 */
export async function sincronizzaBudgetPrevistoGiocatore(client: SupabaseClient, clubId: string, giocatore: GiocatoreCompensoSync) {
  const stagione = stagioneCorrente()
  const marker = `giocatore_id:${giocatore.id}`

  const { data: esistente } = await client
    .from('uscite_previste')
    .select('id')
    .eq('club_id', clubId)
    .eq('stagione_riferimento', stagione)
    .eq('note', marker)
    .maybeSingle()

  const annuale = Number(giocatore.importo_annuo ?? 0)

  if (annuale <= 0) {
    if (esistente) await client.from('uscite_previste').delete().eq('id', esistente.id)
    return
  }

  const payload = {
    club_id: clubId,
    stagione_riferimento: stagione,
    descrizione: `Ingaggio — ${giocatore.cognome} ${giocatore.nome}`,
    importo_previsto: annuale,
    categoria: 'stipendi' as const,
    note: marker,
  }

  if (esistente) {
    await client.from('uscite_previste').update(payload).eq('id', esistente.id)
  } else {
    await client.from('uscite_previste').insert(payload)
  }
}

/** Rimuove la voce di budget previsto legata a un giocatore (es. quando viene tolto dalla rosa). */
export async function rimuoviBudgetPrevistoGiocatore(client: SupabaseClient, clubId: string, giocatoreId: string) {
  const stagione = stagioneCorrente()
  await client
    .from('uscite_previste')
    .delete()
    .eq('club_id', clubId)
    .eq('stagione_riferimento', stagione)
    .eq('note', `giocatore_id:${giocatoreId}`)
}
