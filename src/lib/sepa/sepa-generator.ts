/**
 * Generatore file SEPA Credit Transfer (pain.001.001.03)
 * Formato standard bancario italiano per bonifici batch.
 * Compatibile con: UniCredit, Intesa, BancoBPM, MPS e la maggior parte delle banche italiane.
 */

/* ─── Tipi ───────────────────────────────────────────────────── */

export interface BonificoSEPA {
  id:                 string   // ID univoco (EndToEndId) — max 35 char
  nome_beneficiario:  string   // max 70 char
  iban_beneficiario:  string   // IBAN senza spazi
  importo:            number   // in euro, es. 150.00
  causale:            string   // max 140 char (Ustrd)
  riferimento?:       string   // nota interna, non inclusa nell'XML
}

export interface ConfigSEPA {
  nome_ordinante:  string   // Nome club / intestatario conto
  iban_ordinante:  string   // IBAN conto club
  bic_ordinante?:  string   // BIC/SWIFT (facoltativo ma consigliato)
  data_esecuzione: string   // YYYY-MM-DD — data valuta richiesta
  id_messaggio:    string   // ID univoco batch, max 35 char (es. "CIS-2024-03")
}

/* ─── Generatore XML ─────────────────────────────────────────── */

export function generaSEPAXML(config: ConfigSEPA, bonifici: BonificoSEPA[]): string {
  if (bonifici.length === 0) throw new Error('Nessun bonifico da includere nel file SEPA')

  const now    = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const totale = bonifici.reduce((s, b) => s + b.importo, 0).toFixed(2)
  const msgId  = config.id_messaggio.slice(0, 35)
  const pmtId  = `${msgId}-PMT`.slice(0, 35)

  const transazioni = bonifici.map((b, i) => `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${escXML(b.id.slice(0, 35) || `TXN-${i + 1}`)}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="EUR">${b.importo.toFixed(2)}</InstdAmt>
        </Amt>
        <Cdtr>
          <Nm>${escXML(b.nome_beneficiario.slice(0, 70))}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${b.iban_beneficiario.replace(/\s/g, '').toUpperCase()}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${escXML(b.causale.slice(0, 140))}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`).join('')

  const dbtrAgt = config.bic_ordinante
    ? `\n      <DbtrAgt><FinInstnId><BIC>${config.bic_ordinante.toUpperCase()}</BIC></FinInstnId></DbtrAgt>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03 pain.001.001.03.xsd">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${escXML(msgId)}</MsgId>
      <CreDtTm>${now}</CreDtTm>
      <NbOfTxs>${bonifici.length}</NbOfTxs>
      <CtrlSum>${totale}</CtrlSum>
      <InitgPty>
        <Nm>${escXML(config.nome_ordinante.slice(0, 70))}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escXML(pmtId)}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${bonifici.length}</NbOfTxs>
      <CtrlSum>${totale}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${config.data_esecuzione}</ReqdExctnDt>
      <Dbtr>
        <Nm>${escXML(config.nome_ordinante.slice(0, 70))}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${config.iban_ordinante.replace(/\s/g, '').toUpperCase()}</IBAN>
        </Id>
      </DbtrAcct>${dbtrAgt}
      ${transazioni}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`
}

/* ─── Validazione IBAN ───────────────────────────────────────── */

export function validaIBAN(iban: string): boolean {
  const clean = iban.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean)) return false
  // Sposta i primi 4 caratteri in fondo, converti lettere in numeri
  const rearranged = clean.slice(4) + clean.slice(0, 4)
  const numeric    = rearranged.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55))
  // Mod 97 senza BigInt: processa a blocchi di 9 cifre
  let remainder = 0
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = String(remainder) + numeric.slice(i, i + 7)
    remainder   = parseInt(chunk, 10) % 97
  }
  return remainder === 1
}

export function formattaIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, '').toUpperCase()
  return clean.match(/.{1,4}/g)?.join(' ') ?? clean
}

/* ─── Escape XML ─────────────────────────────────────────────── */

function escXML(s: string): string {
  return s
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;')
}
