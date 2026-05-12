/**
 * Catalogo statico di tutti i template documenti.
 * Non dipende dal database — il catalogo vive nel codice.
 * Il DB è usato SOLO per preferiti, log e contatori (con fallback silenzioso).
 */

import type { CategoriaDocumento } from './types'

export type VarianteCatalogo = {
  id:          string
  label:       string
  descrizione?: string
  config:      Record<string, unknown>
}

export type DocumentoCatalogo = {
  id:            string
  label:         string
  descrizione:   string
  categoria:     CategoriaDocumento
  ha_varianti:   boolean
  is_verificato: boolean
  ordine:        number
  varianti?:     VarianteCatalogo[]
  /** Sinonimi e abbreviazioni per la ricerca full-text */
  keywords?:     string[]
}

export const CATALOGO_DOCUMENTI: DocumentoCatalogo[] = [

  // ── VISITE MEDICHE ─────────────────────────────────────────────────────
  {
    id: 'vm-agonistica',
    label: 'Richiesta VM Agonistica',
    descrizione: 'Decreto Balduzzi. Disponibile per tutte le regioni: Standard, Lombardia, Piemonte, Toscana, Sicilia, Liguria, Emilia-Romagna, Bologna, Ravenna, Reggio Emilia, Ferrara, Veneto.',
    categoria: 'visite_mediche', ha_varianti: true, is_verificato: true, ordine: 10,
    keywords: ['visita medica', 'idoneita', 'idoneità', 'agonistica', 'balduzzi', 'medico', 'sanitario', 'certificato medico'],
    varianti: [
      { id: 'vm-agonistica-standard',  label: 'Standard (Decreto Balduzzi)', descrizione: 'Modulo nazionale standard', config: { regione: null } },
      { id: 'vm-agonistica-lombardia', label: 'Regione Lombardia',           config: { regione: 'Lombardia' } },
      { id: 'vm-agonistica-piemonte',  label: 'Regione Piemonte',            config: { regione: 'Piemonte' } },
      { id: 'vm-agonistica-toscana',   label: 'Regione Toscana',             config: { regione: 'Toscana' } },
      { id: 'vm-agonistica-sicilia',   label: 'Regione Sicilia',             config: { regione: 'Sicilia' } },
      { id: 'vm-agonistica-liguria',   label: 'Regione Liguria',             config: { regione: 'Liguria' } },
      { id: 'vm-agonistica-romagna',   label: 'Emilia-Romagna',              config: { regione: 'Emilia-Romagna' } },
      { id: 'vm-agonistica-bologna',   label: 'ASL Bologna',                 config: { regione: 'Bologna' } },
      { id: 'vm-agonistica-ravenna',   label: 'ASL Ravenna',                 config: { regione: 'Ravenna' } },
      { id: 'vm-agonistica-re',        label: 'ASL Reggio Emilia',           config: { regione: 'Reggio Emilia' } },
      { id: 'vm-agonistica-ferrara',   label: 'ASL Ferrara',                 config: { regione: 'Ferrara' } },
      { id: 'vm-agonistica-veneto',    label: 'Regione Veneto',              config: { regione: 'Veneto' } },
    ],
  },
  {
    id: 'vm-agonistica-sardegna',
    label: 'VM Agonistica — Regione Sardegna (DM 1982)',
    descrizione: 'Modulo specifico Regione Sardegna (D.M. Sanità 18/02/1982 e Circolare 31/01/1983).',
    categoria: 'visite_mediche', ha_varianti: false, is_verificato: true, ordine: 11,
    keywords: ['visita medica', 'idoneita', 'sardegna', 'agonistica', 'dm 1982'],
  },
  {
    id: 'vm-non-agonistica',
    label: 'Richiesta VM Non Agonistica',
    descrizione: 'Richiesta visita medica per idoneità sportiva non agonistica (D.M. Sanità 18/02/1982).',
    categoria: 'visite_mediche', ha_varianti: false, is_verificato: true, ordine: 12,
    keywords: ['visita medica', 'idoneita', 'non agonistica', 'amatoriale', 'dm 1982'],
  },
  {
    id: 'modulo-urine',
    label: 'Modulo Urine Reggio Emilia',
    descrizione: 'Modulo per test urine specifico ASL Reggio Emilia.',
    categoria: 'visite_mediche', ha_varianti: false, is_verificato: false, ordine: 13,
    keywords: ['urina', 'antidoping', 'asl', 'reggio emilia', 'test'],
  },

  // ── RIFORMA SPORT ──────────────────────────────────────────────────────
  {
    id: 'cococo-figc-atleti',
    label: 'CoCoCo Atleta FIGC',
    descrizione: 'Contratto di collaborazione coordinata e continuativa per atleti dilettantistici FIGC (D.Lgs. 36/2021).',
    categoria: 'riforma_sport', ha_varianti: false, is_verificato: true, ordine: 20,
    keywords: ['contratto', 'collaborazione', 'atleta', 'riforma', 'dilettante', '36 2021', 'compenso'],
  },
  {
    id: 'cococo-figc-tecnico',
    label: 'CoCoCo Tecnico FIGC',
    descrizione: 'Contratto CoCoCo per tecnici sportivi affiliati FIGC (D.Lgs. 36/2021).',
    categoria: 'riforma_sport', ha_varianti: false, is_verificato: true, ordine: 21,
    keywords: ['contratto', 'collaborazione', 'tecnico', 'allenatore', 'riforma', '36 2021', 'compenso'],
  },
  {
    id: 'cococo-sport',
    label: 'CoCoCo con Scelta Sport',
    descrizione: 'Contratto CoCoCo con disciplina sportiva personalizzabile.',
    categoria: 'riforma_sport', ha_varianti: false, is_verificato: false, ordine: 22,
    keywords: ['contratto', 'collaborazione', 'riforma', 'personalizzabile', 'compenso'],
  },
  {
    id: 'richiesta-pa',
    label: 'Richiesta Autorizzazione PA',
    descrizione: "Richiesta di autorizzazione all'Amministrazione Pubblica di appartenenza (D.Lgs. n. 36/2021).",
    categoria: 'riforma_sport', ha_varianti: false, is_verificato: true, ordine: 23,
    keywords: ['pubblica amministrazione', 'dipendente pubblico', 'autorizzazione', 'lavoro', 'doppio incarico'],
  },
  {
    id: 'dichiarazione-volontario-dirigente',
    label: 'Dichiarazione Volontario Sportivo — Dirigente',
    descrizione: 'Dichiarazione mensile rimborso spese per volontario sportivo con ruolo dirigenziale.',
    categoria: 'riforma_sport', ha_varianti: false, is_verificato: false, ordine: 24,
    keywords: ['volontario', 'rimborso spese', 'dirigente', 'mensile', 'dichiarazione'],
  },
  {
    id: 'dichiarazione-volontario-tecnico',
    label: 'Dichiarazione Volontario Sportivo — Tecnico',
    descrizione: 'Dichiarazione mensile rimborso spese per volontario sportivo con ruolo tecnico.',
    categoria: 'riforma_sport', ha_varianti: false, is_verificato: false, ordine: 25,
    keywords: ['volontario', 'rimborso spese', 'tecnico', 'mensile', 'dichiarazione'],
  },

  // ── DICHIARAZIONI FISCALI ──────────────────────────────────────────────
  {
    id: 'dichiarazione-730',
    label: 'Dichiarazione 730',
    descrizione: 'Dichiarazione ai fini della detrazione fiscale (Art. 15 TUIR). 4 varianti disponibili.',
    categoria: 'dichiarazioni_fiscali', ha_varianti: true, is_verificato: true, ordine: 30,
    keywords: ['730', 'detrazioni', 'fiscale', 'tuir', 'irpef', 'fisco', 'detrazione', 'genitore', 'importo'],
    varianti: [
      { id: '730-importo-auto',       label: 'Importo automatico',                  descrizione: 'Importo calcolato automaticamente dalle quote pagate',         config: { modalita: 'auto',    genitoreVuoto: false, splitGenitori: false } },
      { id: '730-importo-manuale',    label: 'Importo manuale',                     descrizione: "Inserisci manualmente l'importo da attestare",                 config: { modalita: 'manuale', genitoreVuoto: false, splitGenitori: false } },
      { id: '730-intestatario-vuoto', label: 'Importo auto — intestatario vuoto',   descrizione: 'Importo automatico, nome/CF intestatario da compilare a mano', config: { modalita: 'auto',    genitoreVuoto: true,  splitGenitori: false } },
      { id: '730-split-genitori',     label: 'Split tra genitori',                  descrizione: 'Importo suddiviso tra i due genitori',                          config: { modalita: 'manuale', genitoreVuoto: false, splitGenitori: true } },
    ],
  },
  {
    id: 'attestazione-pagamento',
    label: 'Attestazione Pagamento e Frequenza',
    descrizione: 'Attestazione di pagamento quota e frequenza attività sportiva per uso fiscale.',
    categoria: 'dichiarazioni_fiscali', ha_varianti: false, is_verificato: true, ordine: 31,
    keywords: ['attestato', 'pagamento', 'quota', 'frequenza', 'fiscale', 'ricevuta'],
  },
  {
    id: 'bando-dote-sport-2025',
    label: 'Bando Dote Sport 2025 (D.D.S. 3228/2025)',
    descrizione: 'Attestazione pagamento e frequenza per Bando Dote Sport 2025 — Regione Lombardia.',
    categoria: 'dichiarazioni_fiscali', ha_varianti: false, is_verificato: true, ordine: 32,
    keywords: ['bando', 'dote', 'voucher', 'contributo', 'lombardia', 'regione', '2025'],
  },
  {
    id: 'bando-dote-sport-2026',
    label: 'Bando Dote Sport 2026 (D.d.s. n. 716/2026)',
    descrizione: 'Attestazione pagamento e frequenza per Bando Dote Sport 2026 — Regione Lombardia.',
    categoria: 'dichiarazioni_fiscali', ha_varianti: false, is_verificato: true, ordine: 33,
    keywords: ['bando', 'dote', 'voucher', 'contributo', 'lombardia', 'regione', '2026'],
  },
  {
    id: 'dichiarazione-compensi-anno',
    label: 'Dichiarazione Compensi Anno Solare',
    descrizione: 'Dichiarazione di pagamento compensi a collaboratori per anno solare.',
    categoria: 'dichiarazioni_fiscali', ha_varianti: false, is_verificato: false, ordine: 34,
    keywords: ['compenso', 'anno', 'collaboratori', 'pagamento', 'ingaggio'],
  },
  {
    id: 'dichiarazione-compensi-stagione',
    label: 'Dichiarazione Compensi Stagione',
    descrizione: 'Dichiarazione di pagamento compensi a collaboratori per stagione sportiva.',
    categoria: 'dichiarazioni_fiscali', ha_varianti: false, is_verificato: false, ordine: 35,
    keywords: ['compenso', 'stagione', 'collaboratori', 'pagamento', 'ingaggio'],
  },
  {
    id: 'bando-lazio',
    label: 'Bando Lazio',
    descrizione: 'Attestazione pagamento e frequenza per bandi regionali del Lazio.',
    categoria: 'dichiarazioni_fiscali', ha_varianti: false, is_verificato: false, ordine: 36,
    keywords: ['bando', 'lazio', 'regione', 'voucher', 'contributo', 'roma'],
  },
  {
    id: 'fondo-dote-famiglia-2025',
    label: 'Fondo Dote Famiglia 2025',
    descrizione: 'Documentazione per il Fondo Dote Famiglia 2025.',
    categoria: 'dichiarazioni_fiscali', ha_varianti: false, is_verificato: false, ordine: 37,
    keywords: ['fondo', 'famiglia', 'contributo', 'sussidio', 'bando', '2025'],
  },

  // ── ISCRIZIONI E TESSERAMENTI ──────────────────────────────────────────
  {
    id: 'modulo-iscrizione',
    label: 'Modulo Iscrizione Tesserati',
    descrizione: 'Modulo di iscrizione e tesseramento per la stagione sportiva.',
    categoria: 'iscrizioni_tesseramenti', ha_varianti: false, is_verificato: true, ordine: 40,
    keywords: ['iscrizione', 'tesseramento', 'modulo', 'stagione', 'registrazione'],
  },
  {
    id: 'nulla-osta',
    label: 'Nulla Osta Sportivo',
    descrizione: 'Nulla osta per trasferimento atleta ad altra società sportiva.',
    categoria: 'iscrizioni_tesseramenti', ha_varianti: false, is_verificato: true, ordine: 41,
    keywords: ['nulla osta', 'trasferimento', 'svincolo', 'passaggio', 'societa'],
  },
  {
    id: 'scheda-atleta',
    label: 'Scheda Atleta Anagrafica',
    descrizione: 'Scheda completa con dati anagrafici, sportivi e contatti del tesserato.',
    categoria: 'iscrizioni_tesseramenti', ha_varianti: false, is_verificato: true, ordine: 42,
    keywords: ['scheda', 'anagrafica', 'dati personali', 'contatti', 'profilo'],
  },
  {
    id: 'domanda-socio',
    label: 'Domanda Ammissione a Socio',
    descrizione: "Modulo di domanda per l'ammissione come socio del club.",
    categoria: 'iscrizioni_tesseramenti', ha_varianti: false, is_verificato: false, ordine: 43,
    keywords: ['socio', 'ammissione', 'domanda', 'associato', 'quota sociale'],
  },
  {
    id: 'convocazione-soci',
    label: 'Convocazione Assemblea Soci',
    descrizione: 'Lettera di convocazione per assemblea ordinaria o straordinaria dei soci.',
    categoria: 'iscrizioni_tesseramenti', ha_varianti: false, is_verificato: false, ordine: 44,
    keywords: ['assemblea', 'convocazione', 'soci', 'riunione', 'verbale', 'odg'],
  },

  // ── CERTIFICAZIONI SCOLASTICHE ─────────────────────────────────────────
  {
    id: 'richiesta-iscrizione-scolastica',
    label: 'Richiesta Iscrizione e Frequenza Scolastica',
    descrizione: 'Richiesta certificati iscrizione e frequenza scolastica per uso sportivo.',
    categoria: 'certificazioni_scolastiche', ha_varianti: false, is_verificato: true, ordine: 50,
    keywords: ['scuola', 'scolastico', 'iscrizione', 'frequenza', 'certificato', 'studente'],
  },
  {
    id: 'modulo-giustificazione-assenza',
    label: 'Modulo Giustificazione Assenza',
    descrizione: "Modulo per giustificare l'assenza scolastica dell'atleta per attività sportiva.",
    categoria: 'certificazioni_scolastiche', ha_varianti: false, is_verificato: false, ordine: 51,
    keywords: ['giustificazione', 'assenza', 'scuola', 'gara', 'trasferta', 'giustifica'],
  },
  {
    id: 'richiesta-certificato-contestuale',
    label: 'Richiesta Certificato Contestuale',
    descrizione: 'Richiesta certificato anagrafico contestuale e plurimo di residenza per uso sportivo.',
    categoria: 'certificazioni_scolastiche', ha_varianti: false, is_verificato: true, ordine: 52,
    keywords: ['certificato', 'contestuale', 'anagrafico', 'residenza', 'comune'],
  },
  {
    id: 'richiesta-storico-residenza',
    label: 'Richiesta Storico Residenza',
    descrizione: 'Richiesta di storico di residenza per uso sportivo.',
    categoria: 'certificazioni_scolastiche', ha_varianti: false, is_verificato: false, ordine: 53,
    keywords: ['residenza', 'storico', 'comune', 'anagrafe', 'indirizzo'],
  },
  {
    id: 'certificazione-crediti',
    label: 'Certificazione Crediti Scolastici',
    descrizione: "Certificazione dei crediti scolastici per l'atleta.",
    categoria: 'certificazioni_scolastiche', ha_varianti: false, is_verificato: false, ordine: 54,
    keywords: ['crediti', 'scolastici', 'scuola', 'valutazione', 'voti', 'diploma'],
  },

  // ── AUTORIZZAZIONI E CONSENSI ──────────────────────────────────────────
  {
    id: 'autorizzazione-trasporto',
    label: 'Autorizzazione al Trasporto',
    descrizione: 'Autorizzazione dei genitori per il trasporto del minore durante le attività sportive.',
    categoria: 'autorizzazioni_consensi', ha_varianti: false, is_verificato: true, ordine: 60,
    keywords: ['trasporto', 'minore', 'genitori', 'consenso', 'pullman', 'viaggio', 'trasferta'],
  },
  {
    id: 'autorizzazione-uscita-autonoma',
    label: 'Autorizzazione Uscita Autonoma',
    descrizione: "Autorizzazione dei genitori per l'uscita autonoma del minore dalla sede del club.",
    categoria: 'autorizzazioni_consensi', ha_varianti: false, is_verificato: true, ordine: 61,
    keywords: ['uscita', 'autonoma', 'minore', 'genitori', 'consenso', 'solo'],
  },
  {
    id: 'dichiarazione-resp-manleva',
    label: 'Dichiarazione Responsabilità e Manleva',
    descrizione: 'Dichiarazione di responsabilità e manleva da parte dei genitori.',
    categoria: 'autorizzazioni_consensi', ha_varianti: false, is_verificato: false, ordine: 62,
    keywords: ['manleva', 'responsabilità', 'responsabilita', 'genitori', 'liberatoria', 'esonero'],
  },
  {
    id: 'prestazione-volontaria-maggiorenni',
    label: 'Prestazione Volontaria Maggiorenni',
    descrizione: 'Dichiarazione di prestazione volontaria per atleti maggiorenni (D.Lgs. 36/2021).',
    categoria: 'autorizzazioni_consensi', ha_varianti: false, is_verificato: true, ordine: 63,
    keywords: ['volontario', 'maggiorenne', 'prestazione', 'gratuita', 'riforma'],
  },
  {
    id: 'prestazione-volontaria-minorenni',
    label: 'Prestazione Volontaria Minorenni',
    descrizione: 'Dichiarazione di prestazione volontaria per atleti minorenni (firmata dai genitori).',
    categoria: 'autorizzazioni_consensi', ha_varianti: false, is_verificato: true, ordine: 64,
    keywords: ['volontario', 'minorenne', 'prestazione', 'gratuita', 'genitori', 'riforma'],
  },
  {
    id: 'dichiarazione-casellario',
    label: 'Dichiarazione Sostitutiva Casellario',
    descrizione: 'Dichiarazione sostitutiva del casellario giudiziale ai sensi del D.P.R. 445/2000.',
    categoria: 'autorizzazioni_consensi', ha_varianti: false, is_verificato: true, ordine: 65,
    keywords: ['casellario', 'giudiziale', 'penale', 'dichiarazione sostitutiva', 'precedenti', 'dpr 445'],
  },

  // ── PRIVACY E GDPR ─────────────────────────────────────────────────────
  {
    id: 'informativa-gdpr',
    label: 'Informativa GDPR',
    descrizione: 'Informativa completa sul trattamento dei dati personali (Reg. UE 2016/679).',
    categoria: 'privacy_gdpr', ha_varianti: false, is_verificato: true, ordine: 70,
    keywords: ['gdpr', 'privacy', 'dati personali', 'trattamento', 'regolamento europeo', 'consenso dati', 'informativa'],
  },
  {
    id: 'liberatoria-foto-video',
    label: 'Liberatoria Privacy Foto e Video',
    descrizione: "Liberatoria per l'utilizzo di immagini e video del tesserato su tutti i canali del club.",
    categoria: 'privacy_gdpr', ha_varianti: false, is_verificato: true, ordine: 71,
    keywords: ['foto', 'video', 'immagini', 'social', 'instagram', 'facebook', 'liberatoria', 'privacy', 'consenso'],
  },
]

/** Lookup rapido per ID */
export const CATALOGO_MAP = new Map(
  CATALOGO_DOCUMENTI.map(d => [d.id, d])
)

/** Lookup rapido variante: documentoId + varianteId → config */
export function getConfigVariante(
  documentoId: string,
  varianteId: string | null
): Record<string, unknown> {
  if (!varianteId) return {}
  const doc = CATALOGO_MAP.get(documentoId)
  if (!doc?.varianti) return {}
  return doc.varianti.find(v => v.id === varianteId)?.config ?? {}
}

// ── Ricerca full-text normalizzata ─────────────────────────────────────────

/** Rimuove accenti, apostrofi, trattini → testo piatto */
function normalizza(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // rimuove diacritici (è→e, à→a, ecc.)
    .replace(/[''`]/g, '')           // apostrofi
    .replace(/[-–—]/g, ' ')         // trattini → spazio
    .replace(/\s+/g, ' ')
    .trim()
}

/** Testo ricercabile completo per un documento */
function testoRicercabile(d: DocumentoCatalogo): string {
  return normalizza([
    d.label,
    d.descrizione,
    d.id.replace(/-/g, ' '),
    ...(d.keywords ?? []),
    ...(d.varianti?.map(v => v.label) ?? []),
  ].join(' '))
}

/**
 * Filtra il catalogo per query testuale.
 * Ogni parola della query deve apparire nel testo ricercabile del documento.
 * Es: "visita medica lombardia" → trova VM Agonistica variante Lombardia.
 */
export function cercaDocumenti(
  documenti: DocumentoCatalogo[],
  query: string
): DocumentoCatalogo[] {
  const tokens = normalizza(query).split(' ').filter(Boolean)
  if (!tokens.length) return documenti
  return documenti.filter(d => {
    const testo = testoRicercabile(d)
    return tokens.every(t => testo.includes(t))
  })
}
