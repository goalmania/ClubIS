/**
 * Calcolo del saldo stimato del portafoglio FIGC.
 *
 * Il portafoglio FIGC (tesseramenti.figc.it) è un wallet prepagato: ogni
 * operazione di tesseramento valida consuma credito nel momento in cui
 * viene lavorata dal Comitato, e quel credito non torna indietro se il
 * giocatore viene in seguito svincolato — per questo il calcolo conta
 * TUTTI i tesseramenti dalla prima ricarica registrata in poi, a
 * prescindere dallo stato attuale (attivo/cessato/sospeso).
 *
 * "in_prova" non è una registrazione FIGC formale: costo zero finché non
 * si trasforma in un tesseramento vero (definitivo/prestito).
 * "compartecipazione" segue il costo di un tesseramento definitivo: sul
 * portale non esiste una tariffa dedicata diversa.
 */

export interface CostiTesseramento {
  costo_definitivo: number
  costo_prestito: number
}

export interface RicaricaPortafoglio {
  importo: number
  data: string // YYYY-MM-DD
}

export interface TesseramentoPortafoglio {
  tipo: string
  created_at: string // ISO timestamp
}

export function costoTesseramento(tipo: string, costi: CostiTesseramento): number {
  if (tipo === 'prestito') return costi.costo_prestito
  if (tipo === 'in_prova') return 0
  return costi.costo_definitivo // definitivo, compartecipazione, svincolo
}

export interface SaldoPortafoglio {
  saldo: number | null
  totalRicaricato: number
  costoTesseramenti: number
  tesseramentiConteggiati: number
}

export function calcolaSaldoPortafoglio(
  ricariche: RicaricaPortafoglio[],
  tesseramenti: TesseramentoPortafoglio[],
  costi: CostiTesseramento,
): SaldoPortafoglio {
  const totalRicaricato = ricariche.reduce((s, r) => s + Number(r.importo), 0)

  if (ricariche.length === 0) {
    return { saldo: null, totalRicaricato: 0, costoTesseramenti: 0, tesseramentiConteggiati: 0 }
  }

  // Conta solo i tesseramenti da quando è iniziato il tracciamento
  // (prima ricarica registrata) — i costi precedenti erano coperti da
  // ricariche non tracciate nel sistema.
  const dataInizio = ricariche.reduce((min, r) => (r.data < min ? r.data : min), ricariche[0].data)
  const tessConteggiati = tesseramenti.filter(t => t.created_at.split('T')[0] >= dataInizio)
  const costoTesseramenti = tessConteggiati.reduce((s, t) => s + costoTesseramento(t.tipo, costi), 0)

  return {
    saldo: totalRicaricato - costoTesseramenti,
    totalRicaricato,
    costoTesseramenti,
    tesseramentiConteggiati: tessConteggiati.length,
  }
}
