export interface SollecitoDati {
  rata: {
    id: string
    numero_rata: number
    importo: number
    scadenza: string
  }
  piano: { descrizione: string }
  famiglia: { nome: string; cognome: string; email: string }
  giocatore: { nome: string; cognome: string }
  club: { nome: string; iban?: string | null }
}

export function generaSollecito(dati: SollecitoDati): string {
  const { rata, piano, famiglia, giocatore, club } = dati

  const importoFmt = Number(rata.importo).toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
  })
  const scadenzaFmt = new Date(rata.scadenza).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const subject = `Sollecito pagamento quota - ${giocatore.cognome} ${giocatore.nome} - ${club.nome}`

  const body = [
    `Gentile ${famiglia.cognome} ${famiglia.nome},`,
    '',
    `Le scriviamo in merito al pagamento della rata n. ${rata.numero_rata} relativa a:`,
    `${piano.descrizione} — ${giocatore.cognome} ${giocatore.nome}`,
    '',
    `Importo dovuto: ${importoFmt}`,
    `Scadenza: ${scadenzaFmt}`,
    '',
    club.iban
      ? `Per effettuare il bonifico bancario:\nIBAN: ${club.iban}\nCausale: Quota ${piano.descrizione} — ${giocatore.cognome} ${giocatore.nome} — Rata ${rata.numero_rata}`
      : 'Per effettuare il pagamento si prega di contattare la segreteria.',
    '',
    'La invitiamo a regolarizzare la posizione al più presto.',
    'Per qualsiasi chiarimento siamo a sua disposizione.',
    '',
    `Cordiali saluti,`,
    `Segreteria ${club.nome}`,
  ].join('\n')

  const to = encodeURIComponent(famiglia.email)
  const subjectEnc = encodeURIComponent(subject)
  const bodyEnc = encodeURIComponent(body)

  return `mailto:${to}?subject=${subjectEnc}&body=${bodyEnc}`
}
