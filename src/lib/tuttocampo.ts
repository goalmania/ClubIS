/**
 * Tuttocampo.it — scraping risultati campionato FIGC dilettanti.
 * Non esiste API ufficiale pubblica. Usiamo fetch del sito pubblico.
 *
 * NOTA: Questo è un best-effort. Se Tuttocampo cambia il markup,
 * la funzione restituisce [] senza crashare.
 */

export interface RisultatoTuttocampo {
  data: string            // DD/MM/YYYY
  squadraCasa: string
  squadraOspite: string
  golCasa: number | null
  golOspite: number | null
  competizione: string
  giornata: string | null
  tuttocampoId?: string   // chiave dedup: YYYYMMDD_slug_casa_vs_slug_ospite
}

/**
 * Cerca i risultati di una squadra su Tuttocampo.
 * URL base: https://www.tuttocampo.it/Calcio/[regione]/[categoria]/Squadra/[id]/Risultati.html
 *
 * Poiché non possiamo fare fetch server-side a siti esterni da Vercel edge functions
 * senza proxy, implementiamo via API route.
 */
export async function cercaSquadraTuttocampo(nomeClub: string, citta: string): Promise<string> {
  const query = encodeURIComponent(`${nomeClub} ${citta}`)
  return `https://www.tuttocampo.it/Calcio/Ricerca.html?q=${query}`
}
