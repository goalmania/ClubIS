export const TIPI_SCADENZA_FIGC = {
  iscrizione:     { label: 'Iscrizione campionato', icona: '📋', colore: '#388bfd' },
  tassa_federale: { label: 'Tassa federale',        icona: '💰', colore: '#ff9900' },
  tesseramento:   { label: 'Tesseramento',           icona: '🪪', colore: '#c8f000' },
  visita_medica:  { label: 'Visita medica',          icona: '🏥', colore: '#00c8a0' },
  altro:          { label: 'Altro',                  icona: '📅', colore: '#888888' },
} as const

export type TipoScadenzaFIGC = keyof typeof TIPI_SCADENZA_FIGC

export const STATO_SCADENZA = {
  da_fare:    { label: 'Da fare',    colore: '#888888' },
  in_corso:   { label: 'In corso',   colore: '#ff9900' },
  completata: { label: 'Completata', colore: '#c8f000' },
  scaduta:    { label: 'Scaduta',    colore: '#ff4444' },
} as const

/** Stagione corrente di riferimento per seed e UI */
export const STAGIONE_CORRENTE = '2026/27'

/**
 * Scadenze FIGC standard per la stagione 2026-27
 * Eccellenza e Serie D — date indicative
 */
export const SCADENZE_DEFAULT_2026_27 = [
  {
    titolo: 'Iscrizione campionato Eccellenza 2026/27',
    data_scadenza: '2026-06-30',
    tipo: 'iscrizione',
    importo_previsto: 800,
    note: 'Scadenza iscrizione campionato regionale. Verificare sul portale FIGC regionale.',
    alert_giorni_prima: 45,
  },
  {
    titolo: 'Tassa affiliazione FIGC stagione 2026/27',
    data_scadenza: '2026-07-31',
    tipo: 'tassa_federale',
    importo_previsto: 300,
    note: 'Quota di affiliazione annuale. Pagamento su portale FIGC.',
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Apertura campagna tesseramenti',
    data_scadenza: '2026-08-01',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Dal 1 agosto apertura ufficiale finestra estiva tesseramenti.',
    alert_giorni_prima: 14,
  },
  {
    titolo: 'Chiusura prima finestra tesseramenti',
    data_scadenza: '2026-09-01',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Chiusura prima finestra. Verificare tutti i tesseramenti pendenti.',
    alert_giorni_prima: 21,
  },
  {
    titolo: 'Visite mediche rosa — scadenza rinnovi',
    data_scadenza: '2026-09-15',
    tipo: 'visita_medica',
    importo_previsto: null,
    note: "Tutti i giocatori devono avere certificato medico valido prima dell'inizio campionato.",
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Apertura finestra invernale tesseramenti',
    data_scadenza: '2027-01-02',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Apertura mercato invernale. Verificare svincoli e trasferimenti.',
    alert_giorni_prima: 14,
  },
  {
    titolo: 'Chiusura finestra invernale tesseramenti',
    data_scadenza: '2027-02-02',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Chiusura finestra invernale.',
    alert_giorni_prima: 14,
  },
  {
    titolo: 'Pagamento quote iscrizione campionato (rata 2)',
    data_scadenza: '2027-02-28',
    tipo: 'tassa_federale',
    importo_previsto: 400,
    note: 'Seconda rata quota iscrizione campionato.',
    alert_giorni_prima: 30,
  },
]

/** Alias generico — punta sempre alla stagione corrente */
export const SCADENZE_DEFAULT = SCADENZE_DEFAULT_2026_27

/** @deprecated usa SCADENZE_DEFAULT_2026_27 */
export const SCADENZE_DEFAULT_2025_26 = SCADENZE_DEFAULT_2026_27

/**
 * Calcola il colore del countdown in base ai giorni rimanenti
 */
export function coloreCountdown(giorni: number): string {
  if (giorni < 0) return '#ff4444'
  if (giorni <= 10) return '#ff4444'
  if (giorni <= 30) return '#ff9900'
  return '#c8f000'
}

/**
 * Formatta il label del countdown
 */
export function labelCountdown(giorni: number): string {
  if (giorni < 0) return `Scaduta ${Math.abs(giorni)} ${Math.abs(giorni) === 1 ? 'giorno' : 'giorni'} fa`
  if (giorni === 0) return 'Scade OGGI'
  if (giorni === 1) return 'Scade domani'
  return `${giorni} giorni`
}
