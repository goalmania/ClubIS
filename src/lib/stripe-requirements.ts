// Traduzione in italiano dei codici "requirements" e "disabled_reason" che
// Stripe restituisce sull'oggetto Account Connect, per mostrare al presidente
// esattamente cosa manca invece di un generico "in verifica".
// Riferimento codici: https://docs.stripe.com/api/accounts/object#account_object-requirements

const GRUPPO: Record<string, string> = {
  business_profile: 'Profilo attività',
  company: 'Dati società',
  representative: 'Rappresentante legale',
  individual: 'Titolare',
  directors: 'Membro del CDA',
  external_account: 'Conto bancario',
  tos_acceptance: 'Termini di servizio',
}

const CAMPO: Record<string, string> = {
  url: 'sito web o pagina social del club',
  mcc: 'categoria attività',
  product_description: 'descrizione attività',
  tax_id: 'codice fiscale / partita IVA',
  'address.line1': 'indirizzo',
  'address.city': 'città',
  'address.postal_code': 'CAP',
  'dob.day': 'data di nascita',
  'dob.month': 'data di nascita',
  'dob.year': 'data di nascita',
  first_name: 'nome',
  last_name: 'cognome',
  email: 'email',
  phone: 'telefono',
  nationality: 'nazionalità',
  'relationship.title': 'ruolo nella società (es. presidente)',
  'verification.document': 'documento d\'identità da caricare (selfie + foto documento)',
  'verification.additional_document': 'documento aggiuntivo da caricare',
  directors_provided: 'conferma dei membri del CDA (consiglio direttivo)',
  date: 'accettazione termini di servizio',
  ip: 'accettazione termini di servizio',
}

export function labelRequirement(code: string): string {
  const parts = code.split('.')
  const prefixRaw = parts[0]
  // Stripe usa ID dinamici tipo "person_1AbC..." per i singoli membri del CDA:
  // li normalizziamo tutti sotto "Membro del CDA" invece di mostrare l'ID grezzo.
  const prefix = prefixRaw.startsWith('person_') ? 'directors' : prefixRaw
  const gruppo = GRUPPO[prefix]
  const resto = parts.slice(1).join('.')

  // Prova match esatto sul resto (es. "verification.document"), poi sull'ultimo segmento
  const campo = CAMPO[resto] ?? CAMPO[parts[parts.length - 1]]

  if (gruppo && campo) return `${gruppo} — ${campo}`
  if (gruppo) return `${gruppo} — ${resto.replace(/[._]/g, ' ')}`
  return code.replace(/[._]/g, ' ')
}

const DISABLED_REASON: Record<string, string> = {
  'requirements.past_due': 'Ci sono dati mancanti o scaduti da correggere.',
  'requirements.pending_verification': 'Stripe sta verificando i dati inseriti — normalmente richiede da poche ore a 1-2 giorni lavorativi.',
  under_review: 'L\'account è in revisione manuale da parte del team Stripe. Può richiedere alcuni giorni; se si protrae oltre una settimana contatta l\'assistenza Stripe.',
  listed: 'L\'account è in fase di controllo automatico da parte di Stripe.',
  'rejected.fraud': 'Stripe ha rifiutato l\'account per sospetta frode. Contatta l\'assistenza Stripe per chiarimenti.',
  'rejected.terms_of_service': 'Stripe ha rifiutato l\'account per violazione dei termini di servizio. Contatta l\'assistenza Stripe.',
  'rejected.listed': 'Stripe ha rifiutato l\'account dopo un controllo automatico. Contatta l\'assistenza Stripe.',
  'rejected.other': 'Stripe ha rifiutato l\'account. Contatta l\'assistenza Stripe per maggiori dettagli.',
  platform_paused: 'I pagamenti sono temporaneamente sospesi dalla piattaforma.',
}

export function labelDisabledReason(reason: string | null): string | null {
  if (!reason) return null
  return DISABLED_REASON[reason] ?? `Motivo Stripe: ${reason.replace(/[._]/g, ' ')}`
}
