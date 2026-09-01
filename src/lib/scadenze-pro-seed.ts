/**
 * Template scadenze federali per club professionistici (Serie B/C), basato
 * sul Manuale Licenze Nazionali FIGC in vigore per la stagione 2026/2027
 * (Titolo I: criteri legali ed economico-finanziari; Titolo II: criteri
 * infrastrutturali; Titolo III: criteri sportivi e organizzativi).
 *
 * Le date e gli importi (fideiussione, ammende) sono fissati dalla
 * FIGC/Lega Pro con Comunicato Ufficiale ogni stagione e possono spostarsi
 * di qualche giorno o cambiare cifra da un anno all'altro (es. la
 * fideiussione Serie C è passata da 350.000€ a 700.000€ e viceversa tra
 * stagioni diverse): quanto sotto riproduce lo schema ufficiale 2026/2027 e
 * va riverificato sul Manuale/Comunicato Ufficiale della stagione corrente
 * prima di generare le scadenze per stagioni successive.
 *
 * Serie A non è modellata: importi e tempistiche specifiche non sono
 * ancora state verificate su fonte ufficiale in questo modulo.
 */

export interface ScadenzaTemplate {
  tipo: string
  categoria_scadenza: string
  descrizione: string
  /** Funzione che riceve l'anno di inizio stagione e restituisce la data ISO */
  getDataScadenza: (annoInizio: number) => string
  importo_coinvolto?: number | null
}

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Promemoria interno mensile di pagamento stipendi (buona prassi di cassa
 * del club). NON è una scadenza formale COVISOC con sanzione: le
 * attestazioni ufficiali con penalizzazione sono negli appuntamenti
 * dedicati della categoria COVISOC, che verificano più mensilità insieme.
 */
function promemoriaStipendiMensili(annoInizio: number): ScadenzaTemplate[] {
  const mesi = [
    { label: 'luglio', m: 8 },
    { label: 'agosto', m: 9 },
    { label: 'settembre', m: 10 },
    { label: 'ottobre', m: 11 },
    { label: 'novembre', m: 12 },
    { label: 'dicembre', m: 1, nextYear: true },
    { label: 'gennaio', m: 2, nextYear: true },
    { label: 'febbraio', m: 3, nextYear: true },
    { label: 'marzo', m: 4, nextYear: true },
    { label: 'aprile', m: 5, nextYear: true },
    { label: 'maggio', m: 6, nextYear: true },
    { label: 'giugno', m: 7, nextYear: true },
  ]

  return mesi.map(({ label, m, nextYear }) => {
    const y = nextYear ? annoInizio + 1 : annoInizio
    return {
      tipo: 'promemoria_stipendi',
      categoria_scadenza: 'STIPENDI',
      descrizione: `Promemoria interno: pagamento stipendi e contributi di ${label} (buona prassi di cassa — le attestazioni ufficiali COVISOC sono negli appuntamenti cumulativi in categoria COVISOC)`,
      getDataScadenza: () => iso(y, m, 16),
      importo_coinvolto: null,
    }
  })
}

/**
 * Adempimenti Titolo I/II/III del Manuale Licenze Nazionali comuni a Serie
 * B e Serie C, con le sanzioni reali (ammenda o penalizzazione punti).
 */
function adempimentiComuni(annoInizio: number, isSerieB: boolean): ScadenzaTemplate[] {
  const ammendaMin = isSerieB ? 20000 : 10000
  const ammendaFmt = ammendaMin.toLocaleString('it-IT')

  return [
    {
      tipo: 'documentazione_economico_finanziaria',
      categoria_scadenza: 'COVISOC',
      descrizione: `Deposito IVA I-III trimestre, contratti trasferimenti internazionali, visura camerale e dichiarazioni societarie (Manuale Licenze Nazionali Tit. I, lett. A) — ammenda non inferiore a €${ammendaFmt} per ogni inadempimento`,
      getDataScadenza: () => iso(annoInizio, 5, 15),
      importo_coinvolto: null,
    },
    {
      tipo: 'bilancio_certificato',
      categoria_scadenza: 'COVISOC',
      descrizione: 'Deposito bilancio d\'esercizio approvato, corredato dalla relazione della società di revisione (Manuale Licenze Nazionali Tit. I, lett. A, punto 13)',
      getDataScadenza: () => iso(annoInizio, 5, 15),
      importo_coinvolto: null,
    },
    {
      tipo: 'prospetto_indicatori',
      categoria_scadenza: 'COVISOC',
      descrizione: 'Prospetto indicatori Liquidità (minimo 0,8), Indebitamento e Costo del Lavoro Allargato su situazione patrimoniale al 31 marzo — mancato rispetto: -1 punto in classifica',
      getDataScadenza: () => iso(annoInizio, 6, 1),
      importo_coinvolto: null,
    },
    {
      tipo: 'domanda_ammissione',
      categoria_scadenza: 'ISCRIZIONE',
      descrizione: 'Domanda di ammissione al campionato con richiesta di Licenza Nazionale + versamento tassa di iscrizione (termine perentorio)',
      getDataScadenza: () => iso(annoInizio, 6, 16),
      importo_coinvolto: null,
    },
    {
      tipo: 'requisiti_infrastrutturali',
      categoria_scadenza: 'ISCRIZIONE',
      descrizione: 'Documentazione impianto sportivo: proprietà/contratto d\'uso, licenza TULPS art. 68, verifica agibilità art. 80 (termine perentorio)',
      getDataScadenza: () => iso(annoInizio, 6, 16),
      importo_coinvolto: null,
    },
    {
      tipo: 'requisiti_sportivi',
      categoria_scadenza: 'ISCRIZIONE',
      descrizione: 'Impegno partecipazione Primavera/Under 18-17-16-15, tesseramento tecnici qualificati, attività giovanile femminile (termine perentorio)',
      getDataScadenza: () => iso(annoInizio, 6, 16),
      importo_coinvolto: null,
    },
    {
      tipo: 'iva_quarto_trimestre_deposito',
      categoria_scadenza: 'COVISOC',
      descrizione: `Deposito comunicazione liquidazioni periodiche IVA IV trimestre anno precedente — ammenda non inferiore a €${ammendaFmt}`,
      getDataScadenza: () => iso(annoInizio, 7, 6),
      importo_coinvolto: null,
    },
    {
      tipo: 'irpef_inps_maggio_giugno',
      categoria_scadenza: 'COVISOC',
      descrizione: 'Versamento ritenute IRPEF (mensilità maggio+giugno) e contributi INPS (mensilità giugno) su emolumenti tesserati, con attestazione — mancato rispetto: -2 punti in classifica',
      getDataScadenza: () => iso(annoInizio, 9, 16),
      importo_coinvolto: null,
    },
    {
      tipo: 'iva_quarto_trimestre_versamento',
      categoria_scadenza: 'COVISOC',
      descrizione: 'Versamento liquidazioni periodiche IVA IV trimestre anno precedente, con attestazione — mancato rispetto: -2 punti in classifica',
      getDataScadenza: () => iso(annoInizio, 9, 30),
      importo_coinvolto: null,
    },
  ]
}

/**
 * Fideiussione/deposito cauzionale d'iscrizione — l'importo dipende dallo
 * stato del club: già affiliato in Serie C vs neopromosso dalla Serie D
 * (Manuale Licenze Nazionali Tit. I, par. IV vs par. V).
 */
function fideiussioneSerieC(annoInizio: number, neopromossa: boolean): ScadenzaTemplate {
  return {
    tipo: 'fideiussione',
    categoria_scadenza: 'ISCRIZIONE',
    descrizione: neopromossa
      ? 'Fideiussione bancaria/assicurativa o deposito cauzionale a garanzia Lega Pro — club neopromosso dalla Serie D: €700.000 (Manuale Licenze Nazionali Tit. I, par. V) — verificare il comunicato ufficiale della stagione'
      : 'Fideiussione bancaria/assicurativa o deposito cauzionale a garanzia Lega Pro — club già affiliato in Serie C: €350.000 (Manuale Licenze Nazionali Tit. I, par. IV) — verificare il comunicato ufficiale della stagione',
    getDataScadenza: () => iso(annoInizio, 6, 16),
    importo_coinvolto: neopromossa ? 700000 : 350000,
  }
}

function fideiussioneSerieB(annoInizio: number): ScadenzaTemplate {
  return {
    tipo: 'fideiussione',
    categoria_scadenza: 'ISCRIZIONE',
    descrizione: 'Fideiussione bancaria/assicurativa o deposito cauzionale a garanzia Lega Serie B — €800.000 (Manuale Licenze Nazionali Tit. I, par. III) — verificare il comunicato ufficiale della stagione',
    getDataScadenza: () => iso(annoInizio, 6, 16),
    importo_coinvolto: 800000,
  }
}

/**
 * I club neopromossi dalla Serie C dalla Serie D non devono attestare il
 * pagamento degli stipendi di giugno (non erano ancora in Serie C): al suo
 * posto depositano dichiarazioni liberatorie di assenza debiti verso i
 * tesserati (Tit. I, par. VIII lett. C). Stessa scadenza, contenuto diverso.
 */
function adempimento3Agosto(neopromossaSerieC: boolean): ScadenzaTemplate {
  if (neopromossaSerieC) {
    return {
      tipo: 'dichiarazioni_liberatorie',
      categoria_scadenza: 'COVISOC',
      descrizione: 'Club neopromosso: dichiarazioni liberatorie al 30 giugno (autenticate) attestanti l\'assenza di debiti verso tesserati, da depositare presso il Dipartimento Interregionale-LND — mancato rispetto: -2 punti in classifica',
      getDataScadenza: (annoInizio: number) => iso(annoInizio, 8, 3),
      importo_coinvolto: null,
    }
  }
  return {
    tipo: 'stipendi_giugno',
    categoria_scadenza: 'COVISOC',
    descrizione: 'Pagamento stipendi/compensi tesserati e figure tecnico-sportive per la mensilità di giugno, con attestazione — mancato rispetto: -2 punti in classifica',
    getDataScadenza: (annoInizio: number) => iso(annoInizio, 8, 3),
    importo_coinvolto: null,
  }
}

export function getScadenzeTemplate(
  annoInizio: number,
  categoria: 'serie_c' | 'serie_b' | 'serie_a' | string | null | undefined = 'serie_c',
  neopromossaDaSerieD = false,
): ScadenzaTemplate[] {
  const annoFine = annoInizio + 1
  const isSerieB = categoria === 'serie_b'
  const isSerieC = categoria === 'serie_c' || (!isSerieB && categoria !== 'serie_a')

  if (categoria === 'serie_a') {
    // Nessun template dedicato: importi (fideiussione) e tempistiche di
    // Serie A differiscono da Serie B/C e non sono ancora stati verificati
    // su fonte ufficiale in questo modulo — meglio nessuna scadenza che
    // una scadenza sbagliata mostrata come se fosse affidabile.
    return []
  }

  return [
    ...adempimentiComuni(annoInizio, isSerieB),
    isSerieB ? fideiussioneSerieB(annoInizio) : fideiussioneSerieC(annoInizio, isSerieC && neopromossaDaSerieD),
    adempimento3Agosto(isSerieC && neopromossaDaSerieD),

    // ── MERCATO ───────────────────────────────────────────────────
    {
      tipo: 'mercato_estivo_chiusura',
      categoria_scadenza: 'MERCATO',
      descrizione: 'Chiusura sessione estiva calciomercato (ore 20:00)',
      getDataScadenza: () => iso(annoInizio, 9, 1),
      importo_coinvolto: null,
    },
    {
      tipo: 'mercato_lista_a_estiva',
      categoria_scadenza: 'MERCATO',
      descrizione: isSerieB
        ? 'Comunicazione Lista Calciatori — apertura stagione (verificare comunicato ufficiale Lega)'
        : 'Comunicazione Lista A e Lista B under — apertura stagione (verificare comunicato ufficiale Lega Pro)',
      getDataScadenza: () => iso(annoInizio, 8, 15),
      importo_coinvolto: null,
    },
    {
      tipo: 'mercato_invernale_chiusura',
      categoria_scadenza: 'MERCATO',
      descrizione: 'Chiusura sessione invernale calciomercato (ore 20:00)',
      getDataScadenza: () => iso(annoFine, 2, 2),
      importo_coinvolto: null,
    },
    {
      tipo: 'mercato_lista_a_invernale',
      categoria_scadenza: 'MERCATO',
      descrizione: isSerieB
        ? 'Aggiornamento Lista Calciatori — sessione invernale (verificare comunicato ufficiale Lega)'
        : 'Aggiornamento Lista A e Lista B under — sessione invernale (verificare comunicato ufficiale Lega Pro)',
      getDataScadenza: () => iso(annoFine, 2, 5),
      importo_coinvolto: null,
    },

    // ── Promemoria interno pagamento stipendi (non è di per sé una scadenza COVISOC) ──
    ...promemoriaStipendiMensili(annoInizio),
  ]
}
