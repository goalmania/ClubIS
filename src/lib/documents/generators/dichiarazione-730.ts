import type { DatiGenerazione } from '../types'
import { wrapHtmlDocumento } from '../template-engine'

interface Config730 {
  modalita: 'auto' | 'manuale' | 'split'
  genitoreVuoto: boolean
  importoManuale: boolean
  splitGenitori: boolean
}

export function generaDichiarazione730(dati: DatiGenerazione, config: Config730): string {
  const { societa, tesserato, genitore } = dati
  const anno = dati.anno

  const importo = config.splitGenitori
    ? (dati.importo_split_1 ?? 0) + (dati.importo_split_2 ?? 0)
    : (dati.importo ?? 0)

  const intestatarioPrincipale = config.genitoreVuoto
    ? { nome: '', cognome: '', cf: '' }
    : (genitore && tesserato.is_minorenne)
      ? { nome: genitore.nome, cognome: genitore.cognome, cf: genitore.codice_fiscale ?? '—' }
      : { nome: tesserato.nome, cognome: tesserato.cognome, cf: tesserato.codice_fiscale ?? '—' }

  const sezioneImporto = config.splitGenitori
    ? `<div class="corpo">
        spettante per il figlio/a <span class="campo">${tesserato.cognome} ${tesserato.nome}</span>,
        C.F. <span class="campo">${tesserato.codice_fiscale ?? '—'}</span>,
        suddivisa come segue:
      </div>
      <ul style="margin:12px 0 12px 24px;line-height:2;">
        <li>&euro; <span class="campo">${(dati.importo_split_1 ?? 0).toFixed(2).replace('.', ',')}</span>
          intestata a ${dati.intestatario_split_1 ?? '________________________'}</li>
        <li>&euro; <span class="campo">${(dati.importo_split_2 ?? 0).toFixed(2).replace('.', ',')}</span>
          intestata a ${dati.intestatario_split_2 ?? '________________________'}</li>
      </ul>
      <div class="corpo">per un totale di <strong>&euro; ${importo.toFixed(2).replace('.', ',')}</strong></div>`
    : `<div class="corpo">
        pari a <strong>&euro; <span class="campo">${importo.toFixed(2).replace('.', ',')}</span></strong>.
      </div>`

  const logoHtml = societa.logo_url
    ? `<img src="${societa.logo_url}" alt="" style="height:48px;margin-bottom:8px;display:block;" onerror="this.style.display='none'"/>`
    : ''

  const corpo = `
    <div class="intestazione-club">
      <div>
        ${logoHtml}
        <div class="nome-club">${societa.nome}</div>
        <div class="dati-club">
          ${societa.citta} &middot; C.F. ${societa.codice_fiscale ?? '—'}
          ${societa.pec ? `<br>PEC: ${societa.pec}` : ''}
        </div>
      </div>
      <div style="text-align:right;font-size:11px;color:#555;">
        <div style="font-weight:600;margin-bottom:4px;">DICHIARAZIONE 730</div>
        <div>Anno solare ${anno}</div>
      </div>
    </div>

    <h1 class="titolo-documento">
      DICHIARAZIONE AI FINI DELLA DETRAZIONE FISCALE<br>
      <span style="font-size:12px;font-weight:400;">(Art. 15, comma 1, lett. i-quinquies del TUIR &mdash; Mod. 730/${anno + 1})</span>
    </h1>

    <div class="corpo">
      La società sportiva dilettantistica <span class="campo">${societa.nome}</span>,
      con sede in <span class="campo">${societa.citta}</span>,
      codice fiscale <span class="campo">${societa.codice_fiscale ?? '—'}</span>,
    </div>

    <div class="corpo"><strong>DICHIARA</strong></div>

    <div class="corpo">
      che <span class="campo">${intestatarioPrincipale.cognome} ${intestatarioPrincipale.nome}</span>,
      ${!config.genitoreVuoto ? `codice fiscale <span class="campo">${intestatarioPrincipale.cf}</span>,` : ''}
      ha versato per l'iscrizione e l'abbonamento ad attività sportive dilettantistiche
      per l'anno solare <span class="campo">${anno}</span>
      la somma di
    </div>

    ${sezioneImporto}

    <div class="corpo" style="margin-top:16px;">
      La presente dichiarazione è rilasciata ai sensi dell'art. 15, comma 1, lett. i-quinquies del TUIR
      per la compilazione del modello 730/${anno + 1} e <strong>non costituisce ricevuta di pagamento</strong>.
    </div>

    <div style="margin-top:24px;">
      Luogo e data: <span class="campo" style="min-width:200px;">${societa.citta}, ___________________</span>
    </div>

    <div class="firma-grid">
      <div class="firma-box">
        <div class="firma-label">Il Rappresentante Legale</div>
        <div class="firma-nome">${societa.presidente_nome ?? '—'}</div>
        <div class="firma-spazio"></div>
        <div class="firma-linea"></div>
      </div>
    </div>
  `

  return wrapHtmlDocumento(corpo,
    `Dichiarazione 730 — ${intestatarioPrincipale.cognome} ${intestatarioPrincipale.nome} — ${anno}`)
}
