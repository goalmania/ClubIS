/**
 * Sorgente unica per la classificazione delle categorie di club FIGC/LND/Lega Pro.
 * Sostituisce le ridefinizioni locali di `CATEGORIE_PRO` sparse in più file.
 */

/** Campionati professionistici (Lega Pro / Lega B / Lega A) — Licenza Nazionale, COVISOC. */
export const CATEGORIE_PRO = ['serie_c', 'serie_b', 'serie_a'] as const

/** Serie D — LND a livello nazionale (Divisione Calcio a 11). */
export const CATEGORIE_LND_NAZIONALE = ['serie_d'] as const

/** Eccellenza/Promozione — LND a livello di Comitato Regionale. */
export const CATEGORIE_LND_REGIONALE = ['eccellenza', 'promozione'] as const

export type CategoriaPro = typeof CATEGORIE_PRO[number]

export function isPro(categoria: string | null | undefined): boolean {
  return !!categoria && (CATEGORIE_PRO as readonly string[]).includes(categoria)
}

export function isSerieD(categoria: string | null | undefined): boolean {
  return !!categoria && (CATEGORIE_LND_NAZIONALE as readonly string[]).includes(categoria)
}

export function isLndRegionale(categoria: string | null | undefined): boolean {
  return !!categoria && (CATEGORIE_LND_REGIONALE as readonly string[]).includes(categoria)
}

/** Genere del club/squadra — ortogonale a categoria (livello) e categoria_eta (età). */
export function isFemminile(genere: string | null | undefined): boolean {
  return genere === 'femminile'
}
