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
 * Scadenze Eccellenza — stagione 2026/27.
 * Regime LND a livello di Comitato Regionale: importi e date di iscrizione
 * variano da regione a regione (qui riportati valori indicativi — verificare
 * sempre il comunicato ufficiale del proprio Comitato Regionale). L'obbligo
 * squadra Juniores U19 e la relativa ammenda (€4.000, aumentabile dal
 * Comitato) sono invece fissati a livello nazionale dal Comunicato Ufficiale
 * LND N.1 stagione 2026/2027, punto A/2 lett. h) — dato verificato su fonte
 * primaria, non regionale. Date di avvio campionato in CR Puglia confermate:
 * Eccellenza 30 agosto 2026 (Comitato Regionale Puglia, ammissioni ratificate
 * stagione 2026/27).
 */
export const SCADENZE_ECCELLENZA_2026_27 = [
  {
    titolo: 'Iscrizione campionato 2026/27 (termine ordinatorio)',
    data_scadenza: '2026-07-17',
    tipo: 'iscrizione',
    importo_previsto: null,
    note: 'Formalizzazione telematica dell\'iscrizione. Termine ordinatorio: verificare il comunicato ufficiale del proprio Comitato Regionale (le date variano da regione a regione). In CR Puglia le domande di ammissione al campionato superiore seguono il Comunicato Ufficiale n. 5 del 3 luglio 2026.',
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Iscrizione campionato 2026/27 (termine perentorio)',
    data_scadenza: '2026-07-27',
    tipo: 'iscrizione',
    importo_previsto: 3125,
    note: 'Termine perentorio: saldo di tutte le pendenze della stagione 2025/2026, tassa associativa LND (300€, saldata al 100%) e diritti di iscrizione al Campionato di Eccellenza (fascia nazionale ufficiale da €2.750 a €3.500, il Comitato Regionale fissa il valore esatto entro questa forbice — Comunicato Ufficiale LND N.1 S.S. 2026/2027, Titolo I punto 1 lett. b) — saldati al 100%. Assicurazione tesserati e acconto spese attività/organizzazione: in CR Puglia versare almeno il 30% del dovuto entro questo termine è sufficiente per l\'iscrizione, il resto è rateizzabile (vedi le due voci successive) — Comunicato Ufficiale CR Puglia n. 18 del 4 agosto 2026. Il mancato versamento di almeno il 30% comporta la mancata iscrizione al campionato. Il valore indicato come importo è il punto medio della forbice iscrizione — verificare il comunicato del proprio CR per il numero esatto e per le regole di rateizzazione (possono differire da regione a regione).',
    alert_giorni_prima: 20,
  },
  {
    titolo: 'Seconda rata assicurazione tesserati + acconto spese (rateizzazione CR Puglia)',
    data_scadenza: '2026-10-15',
    tipo: 'tassa_federale',
    importo_previsto: null,
    note: 'Solo se ci si è avvalsi della rateizzazione: entro il 15 ottobre 2026 va saldato un ulteriore 40% del dovuto per assicurazione tesserati e acconto spese attività/organizzazione. Fonte: Comunicato Ufficiale CR Puglia n. 18 del 4 agosto 2026 — regola specifica di questo Comitato Regionale, verificare se il proprio CR applica la stessa rateizzazione.',
    alert_giorni_prima: 15,
  },
  {
    titolo: 'Terza rata (saldo) assicurazione tesserati + acconto spese (rateizzazione CR Puglia)',
    data_scadenza: '2026-12-15',
    tipo: 'tassa_federale',
    importo_previsto: null,
    note: 'Solo se ci si è avvalsi della rateizzazione: entro il 15 dicembre 2026 va saldato il restante 30% del dovuto per assicurazione tesserati e acconto spese attività/organizzazione. Fonte: Comunicato Ufficiale CR Puglia n. 18 del 4 agosto 2026 — regola specifica di questo Comitato Regionale, verificare se il proprio CR applica la stessa rateizzazione.',
    alert_giorni_prima: 15,
  },
  {
    titolo: 'Diritto di affiliazione FIGC (solo nuove affiliate)',
    data_scadenza: '2026-07-31',
    tipo: 'tassa_federale',
    importo_previsto: 65,
    note: 'Dovuto SOLO dalle società che si affiliano per la prima volta alla FIGC in questa stagione — €65 (Comunicato Ufficiale LND N.1 S.S. 2026/2027, Titolo I punto 1 lett. d, confermato anche a livello di CR Puglia). Le società già affiliate non pagano questa voce: la quota ricorrente da versare ogni stagione è invece il diritto di associazione LND (300€), già conteggiato nell\'iscrizione al campionato.',
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Obbligo squadra Juniores Under 19 (o alternativa Under 18/Under 21)',
    data_scadenza: '2026-08-15',
    tipo: 'altro',
    importo_previsto: 4000,
    note: 'Obbligo di partecipare con una propria squadra al Campionato Regionale/Provinciale Juniores Under 19 (o, in alternativa, Under 18 Dilettanti o Under 21). Mancata partecipazione o rinuncia prima dell\'inizio attività: ammenda €4.000 (il Comitato Regionale può aumentarla). Attenuante di €1.000 per ogni categoria giovanile Allievi/Giovanissimi (o corrispondente femminile) effettivamente svolta. Fonte: Comunicato Ufficiale LND N.1 S.S. 2026/2027, punto A/2 lett. h).',
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Indennizzo per rinuncia a una gara (nota informativa, CR Puglia)',
    data_scadenza: '2026-08-30',
    tipo: 'altro',
    importo_previsto: 400,
    note: 'Non un adempimento con termine proprio, ma un rischio da conoscere: in CR Puglia la rinuncia alla disputa di una gara di Eccellenza comporta un indennizzo di €400 per mancato incasso, oltre alle sanzioni sportive. Fonte: Comunicato Ufficiale CR Puglia n. 18 del 4 agosto 2026 (delibera Consiglio Direttivo del 24 luglio 2026). Data impostata all\'avvio del campionato solo come promemoria.',
    alert_giorni_prima: 0,
  },
  {
    titolo: 'Apertura campagna tesseramenti',
    data_scadenza: '2026-07-01',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Dal 1° luglio apertura finestra estiva tesseramenti LND.',
    alert_giorni_prima: 14,
  },
  {
    titolo: 'Chiusura prima finestra tesseramenti',
    data_scadenza: '2026-09-30',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Chiusura finestra estiva tesseramenti LND (1 luglio–30 settembre). Verificare tutti i tesseramenti pendenti.',
    alert_giorni_prima: 21,
  },
  {
    titolo: 'Visite mediche rosa — scadenza rinnovi',
    data_scadenza: '2026-09-13',
    tipo: 'visita_medica',
    importo_previsto: null,
    note: "Tutti i giocatori devono avere certificato medico valido prima dell'inizio campionato (avvio Eccellenza confermato 30 agosto 2026 in CR Puglia — verificare la data reale d'inizio del proprio girone/Comitato).",
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Apertura finestra invernale tesseramenti',
    data_scadenza: '2026-12-01',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Apertura finestra invernale tesseramenti LND (1–16 dicembre). Verificare svincoli e trasferimenti.',
    alert_giorni_prima: 14,
  },
  {
    titolo: 'Chiusura finestra invernale tesseramenti',
    data_scadenza: '2026-12-16',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Chiusura finestra invernale tesseramenti LND.',
    alert_giorni_prima: 10,
  },
]

/**
 * Scadenze Promozione — stagione 2026/27.
 * Stessa struttura di Eccellenza, ma con ammenda Juniores U19 più bassa:
 * €3.000 anziché €4.000 (Comunicato Ufficiale LND N.1 S.S. 2026/2027, punto
 * A/3 lett. g) — differenza confermata su fonte primaria, non un errore di
 * battitura). Date di avvio in CR Puglia: Promozione 6 settembre 2026 (una
 * settimana dopo l'Eccellenza).
 */
export const SCADENZE_PROMOZIONE_2026_27 = [
  {
    titolo: 'Iscrizione campionato 2026/27 (termine ordinatorio)',
    data_scadenza: '2026-07-17',
    tipo: 'iscrizione',
    importo_previsto: null,
    note: 'Formalizzazione telematica dell\'iscrizione. Termine ordinatorio: verificare il comunicato ufficiale del proprio Comitato Regionale (le date variano da regione a regione). In CR Puglia le domande di ammissione al campionato superiore seguono il Comunicato Ufficiale n. 5 del 3 luglio 2026.',
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Iscrizione campionato 2026/27 (termine perentorio)',
    data_scadenza: '2026-07-27',
    tipo: 'iscrizione',
    importo_previsto: 2375,
    note: 'Termine perentorio: saldo di tutte le pendenze della stagione 2025/2026, tassa associativa LND (300€, saldata al 100%) e diritti di iscrizione al Campionato di Promozione (fascia nazionale ufficiale da €2.100 a €2.650, il Comitato Regionale fissa il valore esatto entro questa forbice — Comunicato Ufficiale LND N.1 S.S. 2026/2027, Titolo I punto 1 lett. b) — saldati al 100%. Assicurazione tesserati e acconto spese attività/organizzazione: in CR Puglia versare almeno il 30% del dovuto entro questo termine è sufficiente per l\'iscrizione, il resto è rateizzabile (vedi le due voci successive) — Comunicato Ufficiale CR Puglia n. 18 del 4 agosto 2026. Il mancato versamento di almeno il 30% comporta la mancata iscrizione al campionato. Il valore indicato come importo è il punto medio della forbice iscrizione — verificare il comunicato del proprio CR per il numero esatto e per le regole di rateizzazione (possono differire da regione a regione).',
    alert_giorni_prima: 20,
  },
  {
    titolo: 'Seconda rata assicurazione tesserati + acconto spese (rateizzazione CR Puglia)',
    data_scadenza: '2026-10-15',
    tipo: 'tassa_federale',
    importo_previsto: null,
    note: 'Solo se ci si è avvalsi della rateizzazione: entro il 15 ottobre 2026 va saldato un ulteriore 40% del dovuto per assicurazione tesserati e acconto spese attività/organizzazione. Fonte: Comunicato Ufficiale CR Puglia n. 18 del 4 agosto 2026 — regola specifica di questo Comitato Regionale, verificare se il proprio CR applica la stessa rateizzazione.',
    alert_giorni_prima: 15,
  },
  {
    titolo: 'Terza rata (saldo) assicurazione tesserati + acconto spese (rateizzazione CR Puglia)',
    data_scadenza: '2026-12-15',
    tipo: 'tassa_federale',
    importo_previsto: null,
    note: 'Solo se ci si è avvalsi della rateizzazione: entro il 15 dicembre 2026 va saldato il restante 30% del dovuto per assicurazione tesserati e acconto spese attività/organizzazione. Fonte: Comunicato Ufficiale CR Puglia n. 18 del 4 agosto 2026 — regola specifica di questo Comitato Regionale, verificare se il proprio CR applica la stessa rateizzazione.',
    alert_giorni_prima: 15,
  },
  {
    titolo: 'Diritto di affiliazione FIGC (solo nuove affiliate)',
    data_scadenza: '2026-07-31',
    tipo: 'tassa_federale',
    importo_previsto: 65,
    note: 'Dovuto SOLO dalle società che si affiliano per la prima volta alla FIGC in questa stagione — €65 (Comunicato Ufficiale LND N.1 S.S. 2026/2027, Titolo I punto 1 lett. d, confermato anche a livello di CR Puglia). Le società già affiliate non pagano questa voce: la quota ricorrente da versare ogni stagione è invece il diritto di associazione LND (300€), già conteggiato nell\'iscrizione al campionato.',
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Obbligo squadra Juniores Under 19 (o alternativa Under 18/Under 21)',
    data_scadenza: '2026-08-15',
    tipo: 'altro',
    importo_previsto: 3000,
    note: 'Obbligo di partecipare con una propria squadra al Campionato Regionale/Provinciale Juniores Under 19 (o, in alternativa, Under 18 Dilettanti o Under 21). Mancata partecipazione o rinuncia prima dell\'inizio attività: ammenda €3.000 (il Comitato Regionale può aumentarla). Attenuante di €1.000 per ogni categoria giovanile Allievi/Giovanissimi (o corrispondente femminile) effettivamente svolta. Fonte: Comunicato Ufficiale LND N.1 S.S. 2026/2027, punto A/3 lett. g).',
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Indennizzo per rinuncia a una gara (nota informativa, CR Puglia)',
    data_scadenza: '2026-09-06',
    tipo: 'altro',
    importo_previsto: 200,
    note: 'Non un adempimento con termine proprio, ma un rischio da conoscere: in CR Puglia la rinuncia alla disputa di una gara di Promozione comporta un indennizzo di €200 per mancato incasso, oltre alle sanzioni sportive. Fonte: Comunicato Ufficiale CR Puglia n. 18 del 4 agosto 2026 (delibera Consiglio Direttivo del 24 luglio 2026). Data impostata all\'avvio del campionato solo come promemoria.',
    alert_giorni_prima: 0,
  },
  {
    titolo: 'Apertura campagna tesseramenti',
    data_scadenza: '2026-07-01',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Dal 1° luglio apertura finestra estiva tesseramenti LND.',
    alert_giorni_prima: 14,
  },
  {
    titolo: 'Chiusura prima finestra tesseramenti',
    data_scadenza: '2026-09-30',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Chiusura finestra estiva tesseramenti LND (1 luglio–30 settembre). Verificare tutti i tesseramenti pendenti.',
    alert_giorni_prima: 21,
  },
  {
    titolo: 'Visite mediche rosa — scadenza rinnovi',
    data_scadenza: '2026-09-13',
    tipo: 'visita_medica',
    importo_previsto: null,
    note: "Tutti i giocatori devono avere certificato medico valido prima dell'inizio campionato (avvio Promozione confermato 6 settembre 2026 in CR Puglia — verificare la data reale d'inizio del proprio girone/Comitato).",
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Apertura finestra invernale tesseramenti',
    data_scadenza: '2026-12-01',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Apertura finestra invernale tesseramenti LND (1–16 dicembre). Verificare svincoli e trasferimenti.',
    alert_giorni_prima: 14,
  },
  {
    titolo: 'Chiusura finestra invernale tesseramenti',
    data_scadenza: '2026-12-16',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Chiusura finestra invernale tesseramenti LND.',
    alert_giorni_prima: 10,
  },
]

/**
 * Scadenze Serie D — stagione 2026/27.
 * Regime LND a livello nazionale: date e importi fissi su tutto il territorio
 * (Dipartimento Interregionale, non il Comitato Regionale). Costi/date di
 * iscrizione da Comunicato Ufficiale LND N.145 del 04/06/2026; adempimenti
 * generali di ammissione e ammenda Juniores da Comunicato Ufficiale LND N.1
 * S.S. 2026/2027, punto A/1 lett. d) e h).
 */
export const SCADENZE_SERIE_D_2026_27 = [
  {
    titolo: 'Iscrizione campionato Serie D 2026/27 (termine perentorio)',
    data_scadenza: '2026-07-10',
    tipo: 'iscrizione',
    importo_previsto: 21500,
    note: 'Richiesta di iscrizione telematica (periodo 3–10 luglio), termine perentorio ore 14:00 del 10 luglio. Comprende tassa associativa LND (300€), diritti di iscrizione al Campionato Serie D (16.000€), iscrizione al Campionato Juniores Under 19 (2.000€) e acconto spese (3.200€). Richiede inoltre il deposito di quietanze attestanti il pagamento delle mensilità ai tesserati fino a maggio della stagione precedente. Importi di riferimento stagione 2026/27 (Comunicato Ufficiale LND N.145 del 04/06/2026) — verificare il comunicato ufficiale della stagione in corso.',
    alert_giorni_prima: 20,
  },
  {
    titolo: 'Fideiussione bancaria/garanzia alternativa',
    data_scadenza: '2026-07-10',
    tipo: 'tassa_federale',
    importo_previsto: 31000,
    note: 'Fideiussione bancaria o garanzia alternativa (31.000€, validità fino al 12/07/2027) da depositare contestualmente all\'iscrizione.',
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Verifica documentazione Co.Vi.So.D.',
    data_scadenza: '2026-07-17',
    tipo: 'altro',
    importo_previsto: null,
    note: 'La Co.Vi.So.D. (Commissione di Vigilanza sulle Società Dilettantistiche) esamina la documentazione di iscrizione e comunica alle società l\'esito del controllo entro questa data.',
    alert_giorni_prima: 10,
  },
  {
    titolo: 'Termine ricorsi su ammissioni/ripescaggi Co.Vi.So.D.',
    data_scadenza: '2026-07-23',
    tipo: 'altro',
    importo_previsto: null,
    note: 'Termine per presentare ricorso contro l\'esito della verifica Co.Vi.So.D. sulla domanda di iscrizione.',
    alert_giorni_prima: 5,
  },
  {
    titolo: 'Obbligo squadra Campionato Nazionale Juniores Under 19',
    data_scadenza: '2026-08-15',
    tipo: 'altro',
    importo_previsto: 15000,
    note: 'Obbligo di partecipare con una propria squadra al Campionato Nazionale Juniores Under 19 organizzato dal Dipartimento Interregionale (per le Società di Sardegna e Sicilia: Campionato Regionale Juniores U19 del proprio Comitato, in sostituzione). Mancata partecipazione o rinuncia prima dell\'inizio attività: ammenda €15.000 al primo anno, €25.000 dal secondo anno consecutivo. Fonte: Comunicato Ufficiale LND N.1 S.S. 2026/2027, punto A/1 lett. h) — importo nettamente superiore a quello di Eccellenza/Promozione, non un refuso.',
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Diritto di affiliazione FIGC (solo nuove affiliate)',
    data_scadenza: '2026-07-31',
    tipo: 'tassa_federale',
    importo_previsto: 65,
    note: 'Dovuto SOLO dalle società che si affiliano per la prima volta alla FIGC in questa stagione — €65 (Comunicato Ufficiale LND N.1 S.S. 2026/2027, Titolo I punto 1 lett. d). Le società già affiliate non pagano questa voce: la quota ricorrente da versare ogni stagione è invece il diritto di associazione LND (300€), già conteggiato nell\'iscrizione al campionato.',
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Ammenda per rinuncia a una gara (nota informativa)',
    data_scadenza: '2026-08-24',
    tipo: 'altro',
    importo_previsto: 2000,
    note: 'Non un adempimento con termine proprio, ma un rischio da conoscere: la rinuncia alla disputa di una gara di Campionato Nazionale Serie D comporta un\'ammenda di €2.000 alla prima rinuncia, oltre alle sanzioni sportive previste dal Codice di Giustizia Sportiva (Comunicato Ufficiale LND N.1 S.S. 2026/2027, Titolo I punto 3). Data impostata all\'avvio indicativo del campionato solo come promemoria.',
    alert_giorni_prima: 0,
  },
  {
    titolo: 'Apertura campagna tesseramenti',
    data_scadenza: '2026-07-01',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Dal 1° luglio apertura finestra estiva tesseramenti LND.',
    alert_giorni_prima: 14,
  },
  {
    titolo: 'Chiusura prima finestra tesseramenti',
    data_scadenza: '2026-09-30',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Chiusura finestra estiva tesseramenti LND (1 luglio–30 settembre).',
    alert_giorni_prima: 21,
  },
  {
    titolo: 'Visite mediche rosa — scadenza rinnovi',
    data_scadenza: '2026-09-13',
    tipo: 'visita_medica',
    importo_previsto: null,
    note: "Tutti i giocatori devono avere certificato medico valido prima dell'inizio campionato.",
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Apertura finestra invernale tesseramenti',
    data_scadenza: '2026-12-01',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Apertura finestra invernale tesseramenti LND (1–16 dicembre). Verificare svincoli e trasferimenti.',
    alert_giorni_prima: 14,
  },
  {
    titolo: 'Chiusura finestra invernale tesseramenti',
    data_scadenza: '2026-12-16',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Chiusura finestra invernale tesseramenti LND.',
    alert_giorni_prima: 10,
  },
]

/**
 * Scadenze Attività Femminile — stagione 2026/27.
 * Placeholder generico: struttura identica alle scadenze maschili (iscrizione,
 * tassa federale, finestre tesseramento, visite mediche) ma senza importi/date
 * specifiche, perché Serie A/B/C Femminile (Divisione Calcio Femminile FIGC) ed
 * Eccellenza/Promozione Femminile (Comitati Regionali LND) hanno iter e
 * comunicati propri, distinti da quelli maschili. Verificare sempre il
 * comunicato ufficiale della Divisione Calcio Femminile o del proprio
 * Comitato Regionale per date e importi reali.
 */
export const SCADENZE_FEMMINILE_2026_27 = [
  {
    titolo: 'Iscrizione campionato femminile 2026/27',
    data_scadenza: '2026-07-27',
    tipo: 'iscrizione',
    importo_previsto: null,
    note: 'Formalizzazione dell\'iscrizione al campionato di competenza (Serie A/B/C Femminile FIGC oppure Eccellenza/Promozione Femminile del Comitato Regionale LND). Data e importi da verificare sul comunicato ufficiale — variano per livello e comitato.',
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Diritto di affiliazione FIGC (solo nuove affiliate)',
    data_scadenza: '2026-07-31',
    tipo: 'tassa_federale',
    importo_previsto: 65,
    note: 'Dovuto SOLO dalle società che si affiliano per la prima volta alla FIGC in questa stagione — €65 su base nazionale (Comunicato Ufficiale LND N.1 S.S. 2026/2027, Titolo I punto 1 lett. d). Le società già affiliate non pagano questa voce ogni anno: la quota ricorrente è il diritto di associazione LND (300€, fisso su tutto il territorio), da verificare se già incluso nell\'iscrizione al campionato di competenza.',
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Apertura campagna tesseramenti',
    data_scadenza: '2026-07-01',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Apertura finestra estiva tesseramenti. Verificare le date esatte sul comunicato della Divisione Calcio Femminile o del proprio Comitato Regionale.',
    alert_giorni_prima: 14,
  },
  {
    titolo: 'Chiusura prima finestra tesseramenti',
    data_scadenza: '2026-09-30',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Chiusura finestra estiva tesseramenti. Verificare tutti i tesseramenti pendenti.',
    alert_giorni_prima: 21,
  },
  {
    titolo: 'Visite mediche rosa — scadenza rinnovi',
    data_scadenza: '2026-09-13',
    tipo: 'visita_medica',
    importo_previsto: null,
    note: "Tutte le tesserate devono avere certificato medico valido prima dell'inizio campionato (data indicativa — verificare calendario ufficiale).",
    alert_giorni_prima: 30,
  },
  {
    titolo: 'Apertura finestra invernale tesseramenti',
    data_scadenza: '2026-12-01',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Apertura finestra invernale tesseramenti. Verificare svincoli e trasferimenti sul comunicato ufficiale.',
    alert_giorni_prima: 14,
  },
  {
    titolo: 'Chiusura finestra invernale tesseramenti',
    data_scadenza: '2026-12-16',
    tipo: 'tesseramento',
    importo_previsto: null,
    note: 'Chiusura finestra invernale tesseramenti.',
    alert_giorni_prima: 10,
  },
]

/** Alias generico — punta sempre alla stagione corrente (default Eccellenza) */
export const SCADENZE_DEFAULT = SCADENZE_ECCELLENZA_2026_27

/** @deprecated usa SCADENZE_ECCELLENZA_2026_27, SCADENZE_PROMOZIONE_2026_27 o SCADENZE_SERIE_D_2026_27 */
export const SCADENZE_DEFAULT_2026_27 = SCADENZE_ECCELLENZA_2026_27

/** @deprecated usa SCADENZE_ECCELLENZA_2026_27 */
export const SCADENZE_DEFAULT_2025_26 = SCADENZE_ECCELLENZA_2026_27

/**
 * Ritorna il set di scadenze FIGC/LND corretto in base alla categoria (e genere)
 * del club. Il genere ha priorità: Serie A/B/C Femminile ed Eccellenza/Promozione
 * Femminile seguono iter propri (Divisione Calcio Femminile FIGC / Comitati
 * Regionali LND), diversi da quelli maschili, per cui usano sempre il set
 * placeholder femminile a prescindere dal livello/categoria. Per il maschile,
 * Serie D usa il regime nazionale (Co.Vi.So.D. / Dipartimento Interregionale);
 * Eccellenza e Promozione hanno ciascuna il proprio set (l'ammenda per la
 * mancata squadra Juniores è diversa: €4.000 vs €3.000, dato confermato dal
 * Comunicato Ufficiale LND N.1). Le categorie dilettantistiche inferiori non
 * gestite esplicitamente (Prima/Seconda/Terza Categoria) ricadono sul set
 * Eccellenza come riferimento generico più prudente in assenza di dati propri.
 */
export function getScadenzeDefaultPerCategoria(categoria: string | null | undefined, genere?: string | null) {
  if (genere === 'femminile') return SCADENZE_FEMMINILE_2026_27
  if (categoria === 'serie_d') return SCADENZE_SERIE_D_2026_27
  if (categoria === 'promozione') return SCADENZE_PROMOZIONE_2026_27
  return SCADENZE_ECCELLENZA_2026_27
}

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
