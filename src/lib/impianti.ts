export const AREE_IMPIANTO = {
  spogliatoi:    { label: 'Spogliatoi',       icona: '🚿', colore: '#388bfd' },
  sede_sociale:  { label: 'Sede Sociale',     icona: '🏢', colore: '#aa88ff' },
  centro_medico: { label: 'Centro Medico',    icona: '🏥', colore: '#00c8a0' },
  alloggi:       { label: 'Alloggi / Ritiro', icona: '🛏',  colore: '#ff9900' },
  campo:         { label: 'Campo di Gioco',   icona: '⚽',  colore: '#c8f000' },
  magazzino:     { label: 'Magazzino',        icona: '📦',  colore: '#888888' },
} as const

export type AreaImpianto = keyof typeof AREE_IMPIANTO

export const URGENZA_TICKET = {
  bassa:     { label: 'Bassa',      colore: '#00c8a0', priorita: 1 },
  media:     { label: 'Media',      colore: '#ff9900', priorita: 2 },
  alta:      { label: 'Alta',       colore: '#ff4444', priorita: 3 },
  bloccante: { label: 'Bloccante!', colore: '#ff0000', priorita: 4 },
} as const

export type UrgenzaTicket = keyof typeof URGENZA_TICKET

export const STATO_TICKET = {
  aperto:         { label: 'Aperto',         colore: '#ff4444' },
  in_lavorazione: { label: 'In lavorazione', colore: '#ff9900' },
  risolto:        { label: 'Risolto',        colore: '#00c8a0' },
  chiuso:         { label: 'Chiuso',         colore: '#888888' },
} as const

export const FREQUENZA_CHECKLIST = {
  giornaliera: { label: 'Giornaliera' },
  settimanale: { label: 'Settimanale' },
  pre_gara:    { label: 'Pre-gara' },
  mensile:     { label: 'Mensile' },
} as const

export const CHECKLIST_DEFAULT: Array<{
  nome: string
  frequenza: string
  area: AreaImpianto
  voci: Array<{ id: string; descrizione: string; obbligatoria: boolean }>
}> = [
  {
    nome: 'Pulizia Spogliatoi Pre-Gara',
    frequenza: 'pre_gara',
    area: 'spogliatoi',
    voci: [
      { id: 'sp1', descrizione: 'Pavimento pulito e asciutto', obbligatoria: true },
      { id: 'sp2', descrizione: 'Docce funzionanti e pulite', obbligatoria: true },
      { id: 'sp3', descrizione: 'Sapone e asciugamani presenti', obbligatoria: true },
      { id: 'sp4', descrizione: 'WC puliti e con carta igienica', obbligatoria: true },
      { id: 'sp5', descrizione: 'Riscaldamento/raffrescamento funzionante', obbligatoria: true },
      { id: 'sp6', descrizione: 'Panchine e appendiabiti puliti', obbligatoria: false },
      { id: 'sp7', descrizione: 'Cestini vuotati', obbligatoria: false },
    ],
  },
  {
    nome: 'Pulizia Spogliatoi Ospiti Pre-Gara',
    frequenza: 'pre_gara',
    area: 'spogliatoi',
    voci: [
      { id: 'so1', descrizione: 'Pavimento pulito e asciutto', obbligatoria: true },
      { id: 'so2', descrizione: 'Docce funzionanti e pulite', obbligatoria: true },
      { id: 'so3', descrizione: 'Sapone e asciugamani presenti', obbligatoria: true },
      { id: 'so4', descrizione: 'WC puliti e con carta igienica', obbligatoria: true },
    ],
  },
  {
    nome: 'Controllo Campo Pre-Gara',
    frequenza: 'pre_gara',
    area: 'campo',
    voci: [
      { id: 'ca1', descrizione: 'Linee campo tracciate', obbligatoria: true },
      { id: 'ca2', descrizione: 'Reti porte integre e fissate', obbligatoria: true },
      { id: 'ca3', descrizione: 'Palloni gara pronti (min 5)', obbligatoria: true },
      { id: 'ca4', descrizione: 'Bandierine angolo posizionate', obbligatoria: true },
      { id: 'ca5', descrizione: 'Terreno in condizioni idonee', obbligatoria: true },
      { id: 'ca6', descrizione: 'Illuminazione funzionante (se serale)', obbligatoria: false },
      { id: 'ca7', descrizione: 'Tabellone segnapunti funzionante', obbligatoria: false },
    ],
  },
  {
    nome: 'Pulizia Sede Sociale Settimanale',
    frequenza: 'settimanale',
    area: 'sede_sociale',
    voci: [
      { id: 'ss1', descrizione: 'Ufficio segreteria pulito', obbligatoria: true },
      { id: 'ss2', descrizione: 'Sala riunioni pulita', obbligatoria: true },
      { id: 'ss3', descrizione: 'WC puliti', obbligatoria: true },
      { id: 'ss4', descrizione: 'Vetri e finestre puliti', obbligatoria: false },
    ],
  },
  {
    nome: 'Controllo Centro Medico',
    frequenza: 'settimanale',
    area: 'centro_medico',
    voci: [
      { id: 'cm1', descrizione: 'Lettino visita pulito e funzionante', obbligatoria: true },
      { id: 'cm2', descrizione: 'Kit primo soccorso completo', obbligatoria: true },
      { id: 'cm3', descrizione: 'Ghiaccio spray / borse del ghiaccio disponibili', obbligatoria: true },
      { id: 'cm4', descrizione: 'Pavimento pulito e disinfettato', obbligatoria: true },
      { id: 'cm5', descrizione: 'Defibrillatore verificato', obbligatoria: false },
    ],
  },
  {
    nome: 'Controllo Magazzino Mensile',
    frequenza: 'mensile',
    area: 'magazzino',
    voci: [
      { id: 'mg1', descrizione: 'Palloni inventariati', obbligatoria: true },
      { id: 'mg2', descrizione: 'Pettorine in ordine', obbligatoria: false },
      { id: 'mg3', descrizione: 'Coni e paletti contati', obbligatoria: false },
      { id: 'mg4', descrizione: 'Kit medico di campo completo', obbligatoria: true },
      { id: 'mg5', descrizione: 'Materiale pulito e riposto', obbligatoria: false },
    ],
  },
]

export function calcolaStatoArea(
  ultimaChecklist: { completata_al: number; data_esecuzione: string } | null,
  ticketAperti: Array<{ urgenza: string; stato: string }>
): 'verde' | 'giallo' | 'rosso' {
  const haTicketCritico = ticketAperti.some(
    t => t.stato !== 'risolto' && t.stato !== 'chiuso' &&
         (t.urgenza === 'bloccante' || t.urgenza === 'alta')
  )
  if (haTicketCritico) return 'rosso'

  if (!ultimaChecklist) return 'giallo'
  const orePassate =
    (Date.now() - new Date(ultimaChecklist.data_esecuzione).getTime()) / (1000 * 60 * 60)
  if (ultimaChecklist.completata_al < 80 || orePassate > 48) return 'giallo'

  const haTicketMedia = ticketAperti.some(
    t => t.stato !== 'risolto' && t.stato !== 'chiuso' && t.urgenza === 'media'
  )
  if (haTicketMedia) return 'giallo'

  return 'verde'
}
