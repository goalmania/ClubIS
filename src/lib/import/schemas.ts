export const SCHEMA_GIOCATORI = {
  mapping: {
    'cognome': 'cognome',
    'nome': 'nome',
    'data_nascita': 'data_nascita',
    'luogo_nascita': 'luogo_nascita',
    'codice_fiscale': 'codice_fiscale',
    'ruolo': 'ruolo_principale',
    'piede': 'piede',
    'altezza': 'altezza_cm',
    'peso': 'peso_kg',
    'email': 'email_contatto',
    'telefono': 'telefono_contatto',
    'nazionalita': 'nazionalita_tipo',
    'numero_maglia': 'numero_maglia',
    'iban': 'iban',
    'codice_fiscale_figc': 'codice_fiscale_figc',
  } as Record<string, string>,
  required: ['cognome', 'nome'],
  dateFields: ['data_nascita'],
  // Campi enum PostgreSQL → il valore viene normalizzato a lowercase prima dell'INSERT
  lowercaseFields: ['piede', 'ruolo_principale', 'nazionalita_tipo'],
}

export const SCHEMA_MOVIMENTI = {
  mapping: {
    'data': 'data',
    'tipo': 'tipo',
    'categoria': 'categoria',
    'importo': 'importo',
    'descrizione': 'descrizione',
    'controparte': 'controparte',
    'note': 'note',
  } as Record<string, string>,
  required: ['data', 'tipo', 'importo', 'descrizione'],
  dateFields: ['data'],
  lowercaseFields: ['tipo', 'categoria'],
}

export const SCHEMA_FAMIGLIE = {
  mapping: {
    'cognome_genitore': 'cognome',
    'nome_genitore': 'nome',
    'email': 'email',
    'telefono': 'telefono',
    'relazione': 'relazione',
    'nome_bambino': 'giocatore_nome',
    'cognome_bambino': 'giocatore_cognome',
    'data_nascita_bambino': 'giocatore_data_nascita',
    'codice_fiscale_bambino': 'giocatore_cf',
  } as Record<string, string>,
  required: ['cognome_genitore', 'nome_genitore', 'cognome_bambino', 'nome_bambino'],
  dateFields: ['giocatore_data_nascita'],
  lowercaseFields: ['relazione'],
}

// Import quote/pagamenti per giocatore già in rosa — usato per migrare lo
// storico contabile da un altro gestionale (es. Golee). Il giocatore deve
// esistere già nel club (importarlo prima con SCHEMA_GIOCATORI): la riga
// viene abbinata per cognome+nome.
export const SCHEMA_QUOTE = {
  mapping: {
    'cognome': 'giocatore_cognome',
    'nome': 'giocatore_nome',
    'stagione': 'stagione',
    'importo_totale': 'importo_totale',
    'importo_pagato': 'importo_pagato',
    'stato': 'stato',
    'scadenza': 'scadenza',
    'note': 'note',
  } as Record<string, string>,
  required: ['cognome', 'nome', 'stagione', 'importo_totale'],
  dateFields: ['scadenza'],
  lowercaseFields: ['stato'],
}

// Import eventi di calendario (allenamenti, partite, riunioni, trasferte).
export const SCHEMA_CALENDARIO = {
  mapping: {
    'tipologia': 'tipologia',
    'data': 'data',
    'ora_inizio': 'ora_inizio',
    'ora_fine': 'ora_fine',
    'luogo': 'luogo_testo',
    'priorita': 'priorita',
    'note': 'note',
  } as Record<string, string>,
  required: ['tipologia', 'data', 'ora_inizio', 'luogo'],
  dateFields: ['data'],
  lowercaseFields: ['tipologia', 'priorita'],
}

// Import certificati medici — il giocatore deve esistere già nel club.
export const SCHEMA_CERTIFICATI = {
  mapping: {
    'cognome': 'giocatore_cognome',
    'nome': 'giocatore_nome',
    'tipo': 'tipo',
    'data_rilascio': 'data_rilascio',
    'data_scadenza': 'data_scadenza',
    'medico': 'medico',
    'struttura': 'struttura',
  } as Record<string, string>,
  required: ['cognome', 'nome', 'tipo', 'data_rilascio', 'data_scadenza'],
  dateFields: ['data_rilascio', 'data_scadenza'],
  lowercaseFields: ['tipo'],
}

export type ImportSchema = {
  mapping: Record<string, string>
  required: string[]
  dateFields: string[]
  lowercaseFields: string[]
}
