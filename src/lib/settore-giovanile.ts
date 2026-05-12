// src/lib/settore-giovanile.ts
// Costanti e helpers per il Modulo 6 — Settore Giovanile

// ── Categorie squadre ─────────────────────────────────────────────────────

export const CATEGORIE_SQUADRA = {
  prima_squadra: { label: 'Prima Squadra', colore: '#c8f000', ordine: 0 },
  juniores:      { label: 'Juniores',      colore: '#388bfd', ordine: 1 },
  primavera:     { label: 'Primavera',     colore: '#00c8a0', ordine: 2 },
  u19:           { label: 'Under 19',      colore: '#a78bfa', ordine: 3 },
  u17:           { label: 'Under 17',      colore: '#ff9900', ordine: 4 },
  u16:           { label: 'Under 16',      colore: '#f97316', ordine: 5 },
  u15:           { label: 'Under 15',      colore: '#facc15', ordine: 6 },
  u14:           { label: 'Under 14',      colore: '#34d399', ordine: 7 },
  u13:           { label: 'Under 13',      colore: '#22d3ee', ordine: 8 },
  u12:           { label: 'Under 12',      colore: '#a3e635', ordine: 9 },
  u10:           { label: 'Under 10',      colore: '#fb923c', ordine: 10 },
  u8:            { label: 'Under 8',       colore: '#f472b6', ordine: 11 },
  u6:            { label: 'Under 6',       colore: '#c084fc', ordine: 12 },
  femminile:     { label: 'Femminile',     colore: '#fb7185', ordine: 13 },
} as const

export type CategoriaSquadra = keyof typeof CATEGORIE_SQUADRA

export const CATEGORIE_SQUADRA_OPTIONS = Object.entries(CATEGORIE_SQUADRA)
  .sort((a, b) => a[1].ordine - b[1].ordine)
  .map(([value, meta]) => ({ value, label: meta.label }))

// ── Stato quote mensili ───────────────────────────────────────────────────

export const STATI_QUOTA_GIOVANILE = {
  da_pagare: { label: 'Da pagare',  colore: '#ff9900', icona: '⏳' },
  pagata:    { label: 'Pagata',     colore: '#c8f000', icona: '✓' },
  in_ritardo:{ label: 'In ritardo', colore: '#ff4444', icona: '⚠️' },
  esonerata: { label: 'Esonerata',  colore: '#888888', icona: '—' },
} as const

export type StatoQuotaGiovanile = keyof typeof STATI_QUOTA_GIOVANILE

// ── Metodi di pagamento ───────────────────────────────────────────────────

export const METODI_PAGAMENTO = [
  { value: 'contanti',  label: '💵 Contanti' },
  { value: 'bonifico',  label: '🏦 Bonifico' },
  { value: 'stripe',    label: '💳 Carta (Stripe)' },
  { value: 'paypal',    label: '💙 PayPal' },
  { value: 'altro',     label: '📝 Altro' },
]

// ── Mesi competenza ───────────────────────────────────────────────────────

/**
 * Genera l'elenco dei mesi della stagione sportiva (sett-giugno)
 * a partire dall'anno di inizio stagione (es. 2026 per 2026-27)
 */
export function mesiStagione(annoInizio = 2026): { value: string; label: string }[] {
  const mesi = [
    { mese: 9,  anno: annoInizio,     label: 'Settembre' },
    { mese: 10, anno: annoInizio,     label: 'Ottobre' },
    { mese: 11, anno: annoInizio,     label: 'Novembre' },
    { mese: 12, anno: annoInizio,     label: 'Dicembre' },
    { mese: 1,  anno: annoInizio + 1, label: 'Gennaio' },
    { mese: 2,  anno: annoInizio + 1, label: 'Febbraio' },
    { mese: 3,  anno: annoInizio + 1, label: 'Marzo' },
    { mese: 4,  anno: annoInizio + 1, label: 'Aprile' },
    { mese: 5,  anno: annoInizio + 1, label: 'Maggio' },
    { mese: 6,  anno: annoInizio + 1, label: 'Giugno' },
  ]
  return mesi.map(m => ({
    value: `${m.anno}-${String(m.mese).padStart(2, '0')}-01`,
    label: `${m.label} ${m.anno}`,
  }))
}

/**
 * Formatta una data ISO come mese/anno in italiano
 */
export function formatMese(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

/**
 * Calcola se una quota è in ritardo:
 * considera in ritardo se mese_competenza è passato e non è pagata
 */
export function isQuotaInRitardo(mese_competenza: string, stato: string): boolean {
  if (stato === 'pagata' || stato === 'esonerata') return false
  const scadenza = new Date(mese_competenza)
  scadenza.setDate(10) // entro il 10 del mese
  return Date.now() > scadenza.getTime()
}

/**
 * Colore badge per la quota in base allo stato
 */
export function coloreQuota(stato: string): string {
  return STATI_QUOTA_GIOVANILE[stato as StatoQuotaGiovanile]?.colore ?? '#888'
}
