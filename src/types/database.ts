export type RuoloUtente =
  | 'presidente' | 'ds' | 'segretario'
  | 'allenatore' | 'osservatore' | 'medico' | 'famiglia'
  | 'team_manager' | 'giocatore' | 'ufficio_stampa' | 'custode'

export type TipoEventoMedia =
  | 'intervista_tv' | 'conferenza_stampa' | 'intervista_radio'
  | 'podcast' | 'photoshoot' | 'altro'

export type StatoEventoMedia =
  | 'da_confermare' | 'confermato' | 'annullato' | 'completato'

export type StatoBriefLocandina =
  | 'bozza' | 'inviato_grafico' | 'in_lavorazione' | 'completato'

export type CategoriaClub =
  | 'serie_a' | 'serie_b' | 'serie_c' | 'serie_d'
  | 'eccellenza' | 'promozione' | 'prima_categoria'
  | 'seconda_categoria' | 'terza_categoria' | 'scuola_calcio'

export type PianoAbbonamento = 'base' | 'pro' | 'elite'
export type CategoriaEta = 'u6'|'u8'|'u10'|'u12'|'u13'|'u14'|'u15'|'u16'|'u17'|'u19'|'juniores'|'primavera'|'prima_squadra'|'femminile'
export type RuoloCampo = 'portiere'|'difensore_centrale'|'terzino'|'centrocampista_difensivo'|'centrocampista'|'trequartista'|'ala'|'seconda_punta'|'centravanti'
export type Piede = 'destro' | 'sinistro' | 'ambidestro'
export type NazionalitaTipo = 'italiano' | 'ue' | 'extracomunitario'
export type TipoTesseramento = 'definitivo'|'prestito'|'in_prova'|'svincolo'|'compartecipazione'
export type StatoTesseramento = 'attivo' | 'sospeso' | 'cessato'
export type TipoSessione = 'tecnico'|'tattico'|'fisico'|'partitella'|'recupero'|'video'
export type StatoSessione = 'programmato' | 'effettuato' | 'annullato'
export type StatoPartita = 'programmata'|'giocata'|'rinviata'|'annullata'|'sospesa'
export type TipoPartita = 'campionato' | 'coppa' | 'amichevole' | 'playoff'
export type CasaTrasferta = 'casa' | 'trasferta' | 'neutro'
export type StatoConvocazione = 'in_attesa' | 'confermato' | 'indisponibile'
export type Potenziale = 'basso' | 'medio' | 'alto' | 'eccezionale'
export type EsitoScouting = 'in_valutazione'|'ingaggiato'|'rifiutato'|'archiviato'|'lista_attesa'
export type StatoQuota = 'non_pagato'|'parziale'|'pagato'|'rimborsato'|'esonerato'
export type MetodoPagamento = 'contanti'|'bonifico'|'stripe'|'paypal'|'assegno'
export type TipoMovimento = 'entrata' | 'uscita'
export type TipoNotifica = 'scadenza_certificato'|'scadenza_contratto'|'quota_arretrata'|'convocazione'|'messaggio'|'alert_sistema'|'abbonamento_cis'

export interface Club {
  id: string
  nome: string
  nome_esteso?: string
  figc_codice?: string
  categoria: CategoriaClub
  citta: string
  provincia?: string
  regione?: string
  logo_url?: string
  piano_abbonamento: PianoAbbonamento
  abbonamento_scadenza?: string
  email_ufficiale?: string
  telefono?: string
  attivo: boolean
  created_at: string
}

export interface Utente {
  id: string
  club_id: string
  nome: string
  cognome: string
  email: string
  telefono?: string
  ruolo: RuoloUtente
  squadre_ids: string[]
  foto_url?: string
  attivo: boolean
  is_super_admin: boolean
  ultimo_accesso?: string
  created_at: string
  /** Per utenti con ruolo 'famiglia': FK al record giocatore del figlio */
  giocatore_figlio_id?: string | null
}

export interface Squadra {
  id: string
  club_id: string
  nome: string
  categoria_eta: CategoriaEta
  stagione: string
  allenatore_id?: string
  campo_default?: string
  attiva: boolean
  /** Modulo 6: colore badge hex per UI */
  colore_badge?: string
  /** Modulo 6: descrizione libera della squadra */
  descrizione?: string | null
  /** Modulo 6: numero massimo giocatori */
  max_giocatori?: number
}

export type StatoQuotaGiovanile = 'da_pagare' | 'pagata' | 'in_ritardo' | 'esonerata'

export interface QuotaGiovanile {
  id: string
  club_id: string
  squadra_id: string
  giocatore_id: string
  famiglia_id?: string | null
  importo_mensile: number
  mese_competenza: string
  stato: StatoQuotaGiovanile
  data_pagamento?: string | null
  metodo_pagamento?: string | null
  note?: string | null
  ricevuta_url?: string | null
  creato_da?: string | null
  created_at: string
  updated_at: string
}

export interface Giocatore {
  id: string
  nome: string
  cognome: string
  data_nascita: string
  luogo_nascita?: string
  nazionalita_tipo: NazionalitaTipo
  nazionalita_paese: string
  codice_fiscale: string
  ruolo_principale?: RuoloCampo
  ruolo_secondario?: RuoloCampo
  piede: Piede
  altezza_cm?: number
  peso_kg?: number
  foto_url?: string
  email_contatto?: string
  telefono_contatto?: string
  consenso_gdpr: boolean
  consenso_data?: string
  created_at: string
}

export interface Tesseramento {
  id: string
  giocatore_id: string
  club_id: string
  squadra_id?: string
  stagione: string
  tipo: TipoTesseramento
  data_inizio: string
  data_fine?: string
  numero_maglia?: number
  stato: StatoTesseramento
  note?: string
}

export interface CertificatoMedico {
  id: string
  giocatore_id: string
  club_id: string
  tipo: 'agonistico' | 'non_agonistico'
  data_rilascio: string
  data_scadenza: string
  medico?: string
  struttura?: string
  documento_url?: string
}

export interface SessioneAllenamento {
  id: string
  squadra_id: string
  allenatore_id?: string
  data_ora: string
  durata_minuti: number
  campo?: string
  tipologia: TipoSessione
  obiettivo?: string
  note_tecnico?: string
  stato: StatoSessione
}

export interface Presenza {
  id: string
  sessione_id: string
  giocatore_id: string
  presente: boolean
  motivo_assenza?: string
  note?: string
  registrato_at: string
}

export interface Partita {
  id: string
  squadra_id: string
  avversario: string
  data_ora: string
  campo?: string
  tipo: TipoPartita
  competizione?: string
  giornata?: number
  casa_trasferta: CasaTrasferta
  gol_fatti?: number
  gol_subiti?: number
  stato: StatoPartita
}

export interface Convocazione {
  id: string
  partita_id: string
  giocatore_id: string
  stato_risposta: StatoConvocazione
  motivo_assenza?: string
  risposta_at?: string
  titolare?: boolean
  minuti_giocati?: number
}

export interface ValutazioneTecnica {
  id: string
  giocatore_id: string
  allenatore_id: string
  club_id: string
  data: string
  tecnica?: number
  tattica?: number
  fisico?: number
  mentale?: number
  note?: string
  visibile_famiglia: boolean
}

export interface ReportScouting {
  id: string
  giocatore_id?: string
  nome_giocatore_ext?: string
  club_attuale_ext?: string
  osservatore_id: string
  club_richiedente_id: string
  data_osservazione: string
  partita_osservata?: string
  tecnica?: number
  tattica?: number
  fisico?: number
  mentale?: number
  voto_globale?: number
  potenziale: Potenziale
  punti_forza?: string
  punti_debolezza?: string
  note_libere?: string
  esito: EsitoScouting
  created_at: string
}

export interface QuotaIscrizione {
  id: string
  giocatore_id: string
  club_id: string
  stagione: string
  importo_totale: number
  importo_pagato: number
  stato: StatoQuota
  scadenza?: string
}

export interface Pagamento {
  id: string
  quota_id: string
  importo: number
  metodo: MetodoPagamento
  data_pagamento: string
  stripe_payment_id?: string
  ricevuta_url?: string
  note?: string
}

export interface PrimaNota {
  id: string
  club_id: string
  tipo: TipoMovimento
  categoria: string
  importo: number
  data: string
  descrizione: string
  controparte?: string
  documento_url?: string
}

export interface NotificaSistema {
  id: string
  club_id: string
  destinatario_id: string
  tipo: TipoNotifica
  titolo: string
  messaggio: string
  letta: boolean
  azione_url?: string
  creata_at: string
}

// Tipi estesi con join
export interface GiocatoreConTesseramento extends Giocatore {
  tesseramento?: Tesseramento
  squadra?: Squadra
  certificato_attivo?: CertificatoMedico
}

export interface StatisticheGiocatore {
  giocatore_id: string
  stagione: string
  presenze_allenamento: number
  presenze_partite: number
  gol: number
  assist: number
  ammonizioni: number
  espulsioni: number
  minuti_totali: number
}

export interface EventoMedia {
  id: string
  club_id: string
  tipo: TipoEventoMedia
  data_ora: string
  durata_minuti: number
  luogo?: string
  emittente_testata?: string
  soggetti_coinvolti: string[]
  stato: StatoEventoMedia
  note?: string
  creato_da?: string
  created_at: string
  updated_at: string
}

export type DestinatarioRuoloConsiglio = 'presidente' | 'ds' | 'team_manager' | 'allenatore' | 'giocatore'
export type ContestoConsiglio = 'pre_partita' | 'post_partita' | 'conferenza_stampa' | 'mercato' | 'generale' | 'crisi_risultati' | 'infortunio'

export interface ConsiglioIntervista {
  id: string
  club_id: string | null
  creato_da: string | null
  destinatario_ruolo: DestinatarioRuoloConsiglio
  destinatario_specifico_id: string | null
  domanda: string
  consiglio_risposta: string
  contesto: ContestoConsiglio
  priorita: 1 | 2 | 3
  attivo: boolean
  is_template: boolean
  created_at: string
  updated_at: string
}

export interface BriefLocandina {
  id: string
  club_id: string
  partita_id?: string
  evento_media_id?: string
  data_evento: string
  titolo_evento: string
  campo_impianto?: string
  ora_inizio?: string
  competizione?: string
  logo_home_url?: string
  logo_away_url?: string
  colori_preferiti?: string
  note_grafiche?: string
  stato: StatoBriefLocandina
  file_finale_url?: string
  creato_da?: string
  created_at: string
  updated_at: string
}
