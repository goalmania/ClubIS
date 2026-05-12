// ── Dati club/società ──────────────────────────────────────
export interface DatiSocieta {
  nome: string
  nome_esteso?: string
  citta: string
  indirizzo?: string
  codice_fiscale?: string
  partita_iva?: string
  pec?: string
  presidente_nome?: string
  presidente_cf?: string
  logo_url?: string
  iban?: string
  nome_banca?: string
}

// ── Dati tesserato ─────────────────────────────────────────
export interface DatiTesserato {
  nome: string
  cognome: string
  data_nascita: string        // YYYY-MM-DD
  luogo_nascita?: string
  codice_fiscale?: string
  codice_tessera_figc?: string
  ruolo_principale?: string
  nazionalita_paese?: string
  indirizzo?: string
  citta?: string
  cap?: string
  provincia?: string
  email_contatto?: string
  telefono_contatto?: string
  is_minorenne: boolean        // calcolato dalla data_nascita
}

// ── Dati genitore/responsabile legale ─────────────────────
export interface DatiGenitore {
  nome: string
  cognome: string
  email?: string
  telefono?: string
  codice_fiscale?: string
  relazione?: string           // padre | madre | tutore
  indirizzo?: string
}

// ── Documento: definizione completa ───────────────────────
export interface DocumentoDefinizione {
  id: string
  label: string
  descrizione: string
  categoria: CategoriaDocumento
  ha_varianti: boolean
  is_verificato: boolean
  varianti?: DocumentoVariante[]
}

export interface DocumentoVariante {
  id: string
  documento_id: string
  label: string
  descrizione?: string
  config: Record<string, unknown>
}

// ── Categorie ─────────────────────────────────────────────
export type CategoriaDocumento =
  | 'visite_mediche'
  | 'riforma_sport'
  | 'dichiarazioni_fiscali'
  | 'iscrizioni_tesseramenti'
  | 'certificazioni_scolastiche'
  | 'autorizzazioni_consensi'
  | 'privacy_gdpr'
  | 'altri'

export const CATEGORIA_META: Record<CategoriaDocumento, { label: string; icona: string; ordine: number }> = {
  visite_mediche:             { label: 'Visite Mediche e Certificazioni Sanitarie', icona: '🏥', ordine: 1 },
  riforma_sport:              { label: 'Riforma dello Sport',                       icona: '⚖️', ordine: 2 },
  dichiarazioni_fiscali:      { label: 'Dichiarazioni e Documenti Fiscali',          icona: '💰', ordine: 3 },
  iscrizioni_tesseramenti:    { label: 'Iscrizioni e Tesseramenti',                  icona: '📝', ordine: 4 },
  certificazioni_scolastiche: { label: 'Certificazioni e Attestati Scolastici',      icona: '🎓', ordine: 5 },
  autorizzazioni_consensi:    { label: 'Autorizzazioni e Consensi Legali',           icona: '📋', ordine: 6 },
  privacy_gdpr:               { label: 'Privacy e GDPR',                            icona: '🔒', ordine: 7 },
  altri:                      { label: 'Altri',                                     icona: '📄', ordine: 8 },
}

// ── Dati per generazione ──────────────────────────────────
export interface DatiGenerazione {
  societa: DatiSocieta
  tesserato: DatiTesserato
  genitore?: DatiGenitore
  stagione: string
  data_oggi: string
  anno: number
  // Campi extra dipendenti dal documento
  importo?: number
  importo_split_1?: number
  importo_split_2?: number
  intestatario_split_1?: string
  intestatario_split_2?: string
  compenso_lordo?: number
  compenso_netto?: number
  compenso_ritenuta?: number
  mese?: string
  anno_compenso?: number
  tipo_contratto?: string
  disciplina_sportiva?: string
  [key: string]: unknown
}
