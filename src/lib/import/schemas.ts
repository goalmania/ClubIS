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

export type ImportSchema = {
  mapping: Record<string, string>
  required: string[]
  dateFields: string[]
  lowercaseFields: string[]
}
