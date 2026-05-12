/**
 * Restituisce la stagione corrente nel formato "YYYY-YY".
 * La stagione cambia il 1° luglio: prima di luglio si è ancora
 * nella stagione iniziata l'anno precedente.
 */
export function stagioneCorrente(): string {
  const oggi = new Date()
  const anno = oggi.getMonth() >= 6 ? oggi.getFullYear() : oggi.getFullYear() - 1
  const fine = (anno + 1).toString().slice(2)
  return `${anno}-${fine}`
}

export function formatData(d: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', opts ?? { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDataBreve(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

export function formatOra(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function formatEuro(n: number) {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export function calcolaEta(dataNascita: string) {
  const oggi = new Date()
  const d = new Date(dataNascita)
  let eta = oggi.getFullYear() - d.getFullYear()
  if (oggi.getMonth() < d.getMonth() || (oggi.getMonth() === d.getMonth() && oggi.getDate() < d.getDate())) eta--
  return eta
}

export function giorniAlla(data: string) {
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000)
}

export const ruoloShort: Record<string, string> = {
  portiere: 'POR', difensore_centrale: 'DC', terzino: 'TRZ',
  centrocampista_difensivo: 'CDM', centrocampista: 'CEN',
  trequartista: 'TRQ', ala: 'ALA', seconda_punta: '2AP', centravanti: 'ATT',
}

export const ruoloLabel: Record<string, string> = {
  // Ruoli campo (posizioni)
  portiere: 'Portiere', difensore_centrale: 'Difensore centrale', terzino: 'Terzino',
  centrocampista_difensivo: 'Mediano', centrocampista: 'Centrocampista',
  trequartista: 'Trequartista', ala: 'Ala', seconda_punta: 'Seconda punta', centravanti: 'Centravanti',
  // Ruoli utente (per ImpersonationBanner e UI generali)
  presidente:      'Presidente',
  ds:              'Direttore Sportivo',
  segretario:      'Segretario',
  allenatore:      'Allenatore',
  medico:          'Medico',
  osservatore:     'Osservatore',
  team_manager:    'Team Manager',
  famiglia:        'Famiglia',
  giocatore:       'Giocatore',
  ufficio_stampa:  'Ufficio Stampa',
}

export const nazBadge: Record<string, string> = {
  italiano: 'badge-verde', ue: 'badge-blu', extracomunitario: 'badge-ambra',
}

export const statoQuotaColore: Record<string, string> = {
  non_pagato: 'badge-rosso', parziale: 'badge-ambra',
  pagato: 'badge-verde', esonerato: 'badge-grigio', rimborsato: 'badge-blu',
}

export const potenzialeColore: Record<string, string> = {
  basso: 'badge-grigio', medio: 'badge-blu', alto: 'badge-verde', eccezionale: 'badge-viola',
}

export const esitoColore: Record<string, string> = {
  in_valutazione: 'badge-ambra', ingaggiato: 'badge-verde',
  rifiutato: 'badge-rosso', archiviato: 'badge-grigio', lista_attesa: 'badge-blu',
}
