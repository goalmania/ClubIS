export interface CalcoloCompenso {
  importo_lordo: number
  importo_precedente: number
  supera_soglia: boolean
  importo_esente: number
  importo_imponibile: number
  ritenuta: number
  importo_netto: number
  soglia_residua: number
}

export function calcolaCompenso(
  importoLordo: number,
  importoPrecedente: number,
  soglia: number = 5000,
  aliquota: number = 0.23
): CalcoloCompenso {
  const totaleDopoQuesto = importoPrecedente + importoLordo
  const superaSoglia = totaleDopoQuesto > soglia

  let importoEsente: number
  let importoImponibile: number

  if (!superaSoglia) {
    importoEsente = importoLordo
    importoImponibile = 0
  } else if (importoPrecedente >= soglia) {
    importoEsente = 0
    importoImponibile = importoLordo
  } else {
    importoEsente = soglia - importoPrecedente
    importoImponibile = importoLordo - importoEsente
  }

  const ritenuta = importoImponibile * aliquota
  const importoNetto = importoLordo - ritenuta

  return {
    importo_lordo: importoLordo,
    importo_precedente: importoPrecedente,
    supera_soglia: superaSoglia,
    importo_esente: importoEsente,
    importo_imponibile: importoImponibile,
    ritenuta: Math.round(ritenuta * 100) / 100,
    importo_netto: Math.round(importoNetto * 100) / 100,
    soglia_residua: Math.max(0, soglia - importoPrecedente),
  }
}

export function generaHTMLAutocertificazione(dati: {
  collaboratore: { nome: string; cognome: string; codice_fiscale: string; indirizzo?: string }
  club: { nome: string; codice_fiscale?: string; presidente_nome?: string }
  compenso: CalcoloCompenso & { descrizione: string; anno: number; data_pagamento?: string }
}): string {
  const { collaboratore, club, compenso } = dati

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Autocertificazione compenso — ${collaboratore.cognome} ${collaboratore.nome}</title>
  <style>
    body { font-family: 'Times New Roman', serif; color: #000; background: white;
      font-size: 13px; line-height: 1.8; margin: 0; }
    .page { max-width: 720px; margin: 0 auto; padding: 40px 50px; }
    h1 { font-size: 16px; font-weight: bold; text-align: center;
         text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .sottotitolo { font-size: 12px; text-align: center; color: #555; margin-bottom: 32px; }
    .corpo { text-align: justify; margin-bottom: 20px; }
    .campo { font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 1px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #999; padding: 7px 12px; font-size: 12px; }
    th { background: #f5f5f5; font-weight: bold; text-align: left; }
    .totale td { font-weight: bold; background: #f9f9f9; }
    .firma-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 50px; }
    .firma-box { border-top: 1px solid #000; padding-top: 8px; }
    .firma-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #555; }
    .firma-spazio { height: 55px; }
    @media print { .no-print { display:none; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="no-print" style="text-align:right;margin-bottom:20px;">
      <button onclick="window.print()" style="padding:8px 18px;background:#c8f000;
        color:#000;border:none;cursor:pointer;font-weight:bold;">Stampa / PDF</button>
    </div>

    <h1>Autocertificazione compenso sportivo</h1>
    <div class="sottotitolo">
      Ai sensi del D.Lgs. 36/2021 (Riforma dello Sport) — Anno ${compenso.anno}
    </div>

    <div class="corpo">
      Il/La sottoscritto/a <span class="campo">${collaboratore.cognome} ${collaboratore.nome}</span>,
      nato/a il __________________, codice fiscale <span class="campo">${collaboratore.codice_fiscale}</span>,
      residente in <span class="campo">${collaboratore.indirizzo ?? '___________________________'}</span>,
    </div>

    <div class="corpo">
      in qualità di collaboratore/collaboratrice sportiva della società
      <span class="campo">${club.nome}</span>
      (C.F. ${club.codice_fiscale ?? '_______________'}),
    </div>

    <div class="corpo">
      <strong>DICHIARA</strong> di aver percepito per attività sportiva dilettantistica
      relativa all'anno ${compenso.anno} i seguenti compensi:
    </div>

    <table>
      <thead>
        <tr>
          <th>Descrizione</th>
          <th style="text-align:right;">Importo lordo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${compenso.descrizione}</td>
          <td style="text-align:right;">€ ${compenso.importo_lordo.toFixed(2)}</td>
        </tr>
        ${compenso.importo_precedente > 0 ? `
        <tr>
          <td style="color:#666;font-size:11px;">Compensi precedenti ${compenso.anno} (dallo stesso sodalizio)</td>
          <td style="text-align:right;color:#666;font-size:11px;">€ ${compenso.importo_precedente.toFixed(2)}</td>
        </tr>` : ''}
        <tr class="totale">
          <td>Totale compensi ${compenso.anno}</td>
          <td style="text-align:right;">€ ${(compenso.importo_lordo + compenso.importo_precedente).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    ${compenso.supera_soglia ? `
    <table>
      <thead><tr><th colspan="2">Calcolo ritenuta d'acconto</th></tr></thead>
      <tbody>
        <tr><td>Quota esente (fino a €5.000)</td>
            <td style="text-align:right;">€ ${compenso.importo_esente.toFixed(2)}</td></tr>
        <tr><td>Quota imponibile (oltre soglia)</td>
            <td style="text-align:right;">€ ${compenso.importo_imponibile.toFixed(2)}</td></tr>
        <tr><td>Ritenuta d'acconto (23%)</td>
            <td style="text-align:right;color:red;">- € ${compenso.ritenuta.toFixed(2)}</td></tr>
        <tr class="totale"><td>Importo netto da pagare</td>
            <td style="text-align:right;">€ ${compenso.importo_netto.toFixed(2)}</td></tr>
      </tbody>
    </table>` : `
    <div class="corpo">
      I compensi percepiti rientrano nella <strong>soglia di esenzione di €5.000,00</strong>
      prevista per l'anno ${compenso.anno}: <strong>non è dovuta ritenuta d'acconto</strong>.
      Importo netto: <strong>€ ${compenso.importo_netto.toFixed(2)}</strong>.
    </div>`}

    <div class="corpo" style="margin-top:20px;">
      Il/La sottoscritto/a dichiara sotto la propria responsabilità che le informazioni
      sopra riportate sono veritiere e si impegna a comunicare tempestivamente qualsiasi
      variazione rilevante ai fini fiscali.
    </div>

    <div style="margin-top:24px;">
      Luogo e data: <span class="campo" style="min-width:200px;display:inline-block;">
        ____________________
      </span>
    </div>

    <div class="firma-grid">
      <div class="firma-box">
        <div class="firma-label">Firma del collaboratore/collaboratrice</div>
        <div style="font-size:12px;margin:4px 0;">${collaboratore.cognome} ${collaboratore.nome}</div>
        <div class="firma-spazio"></div>
        <div style="border-top:1px solid #ccc;"></div>
      </div>
      <div class="firma-box">
        <div class="firma-label">Per la società sportiva — Il Presidente</div>
        <div style="font-size:12px;margin:4px 0;">${club.presidente_nome ?? '___________________________'}</div>
        <div class="firma-spazio"></div>
        <div style="border-top:1px solid #ccc;"></div>
      </div>
    </div>
  </div>
</body>
</html>`
}
