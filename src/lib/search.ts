/**
 * Utilità di ricerca testuale normalizzata — condivisa in tutto ClubIS.
 *
 * Caratteristiche:
 * - Rimuove accenti: "pera" trova "Perà", "nome" trova "Nómé"
 * - Case-insensitive
 * - Multi-parola: ogni token deve matchare da qualche parte (AND)
 * - Ignora apostrofi e trattini
 *
 * Uso:
 *   import { matchSearch } from '@/lib/search'
 *   lista.filter(item => matchSearch(query, item.nome, item.cognome))
 */

/** Normalizza una stringa: minuscolo, senza accenti, senza apostrofi */
export function normalizza(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // rimuove diacritici (è→e, à→a, ì→i, ò→o, ù→u)
    .replace(/[''`]/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Verifica se la query matcha almeno uno dei campi forniti.
 * Ogni parola della query deve apparire in almeno uno dei campi (AND tra parole, OR tra campi).
 *
 * @param query   - Stringa cercata dall'utente
 * @param campi   - Valori dei campi da cercare (nome, cognome, email, ecc.)
 */
export function matchSearch(query: string, ...campi: (string | null | undefined)[]): boolean {
  const tokens = normalizza(query).split(' ').filter(Boolean)
  if (!tokens.length) return true

  const testoUnificato = campi.map(normalizza).join(' ')
  return tokens.every(t => testoUnificato.includes(t))
}
