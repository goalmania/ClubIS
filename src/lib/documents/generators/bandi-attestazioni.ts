import type { DatiGenerazione } from '../types'
import { wrapHtmlDocumento } from '../template-engine'

// ── Helper intestazione club ──────────────────────────────────────────
function intestazione(dati: DatiGenerazione, dxHtml = ''): string {
  const { societa } = dati
  const logo = societa.logo_url
    ? `<img src="${societa.logo_url}" alt="" style="height:48px;margin-bottom:6px;display:block;" onerror="this.style.display='none'"/>`
    : ''
  return `
    <div class="intestazione-club">
      <div>
        ${logo}
        <div class="nome-club">${societa.nome}</div>
        <div class="dati-club">
          ${[societa.citta, societa.indirizzo].filter(Boolean).join(' · ')}
          ${societa.codice_fiscale ? `<br>C.F. ${societa.codice_fiscale}` : ''}
          ${societa.pec ? `<br>PEC: ${societa.pec}` : ''}
        </div>
      </div>
      ${dxHtml ? `<div style="text-align:right;font-size:11px;color:#555;">${dxHtml}</div>` : ''}
    </div>`
}

function firmaSemplice(societa: { presidente_nome?: string; citta: string }): string {
  return `
    <div style="margin-top:32px;">
      <span style="font-size:12px;">
        ${societa.citta}, ${new Date().toLocaleDateString('it-IT')}
      </span>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:8px;">
      <div>
        <div style="font-size:11px;color:#555;margin-bottom:4px;">Firma</div>
        <div style="width:200px;border-top:1px solid #1a1a1a;margin-top:50px;"></div>
      </div>
    </div>`
}

// ── Attestazione Pagamento e Frequenza ────────────────────────────────
export function generaAttestazionePagamento(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const importo = (dati.importo ?? 0).toFixed(2).replace('.', ',')
  const pres = societa.presidente_nome ?? '______________________________'
  const cf   = tesserato.codice_fiscale ?? '—'
  const nome = `${tesserato.nome} ${tesserato.cognome}`

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">ATTESTAZIONE DI PAGAMENTO E FREQUENZA</h1>

    <div class="corpo">
      Il/La sottoscritto/a <span class="campo">${pres}</span>,
      Presidente di <strong>${societa.nome}</strong>
      con sede legale in ${societa.citta}${societa.indirizzo ? `, ${societa.indirizzo}` : ''},
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <div class="corpo">
      Che è in corso di validità l'iscrizione al "Registro Nazionale delle Associazioni e Società
      Sportive dilettantistiche del CONI" o alla sezione CIP del Registro,
      per la stagione sportiva ${dati.stagione}.
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA INOLTRE</strong></div>

    <div class="corpo">
      Di aver ricevuto da <strong>${nome}</strong> — CF ${cf} —
      la somma di <strong>Euro <span class="campo">${importo}</span></strong>,
      quale corrispettivo per l'iscrizione dell'atleta <strong>${nome}</strong> — CF ${cf} —
      relativo al corso di <strong>${dati.disciplina_sportiva ?? 'Calcio'}</strong>
      per la stagione sportiva ${dati.stagione}.
    </div>

    <div class="corpo">
      Dichiara inoltre che il tesserato ha partecipato attivamente alle iniziative organizzate
      dall'associazione durante tutta la stagione.
    </div>

    ${firmaSemplice(societa)}
  `
  return wrapHtmlDocumento(corpo, `Attestazione Pagamento — ${nome}`)
}

// ── Bando Dote Sport (2025 e 2026) ────────────────────────────────────
export function generaBandoDoteSport(dati: DatiGenerazione, anno: 2025 | 2026): string {
  const { societa, tesserato } = dati
  const importo = (dati.importo ?? 0).toFixed(2).replace('.', ',')
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const cf   = tesserato.codice_fiscale ?? '—'

  const decreto = anno === 2025
    ? "D.D.S 3228/2025 dell'11 Marzo 2025"
    : 'D.d.s. 23 gennaio 2026 - n. 716'

  const logo = societa.logo_url
    ? `<img src="${societa.logo_url}" alt="" style="height:48px;margin-bottom:6px;display:block;" onerror="this.style.display='none'"/>`
    : ''

  const corpo = `
    ${logo ? `<div style="text-align:center;margin-bottom:16px;">${logo}</div>` : ''}

    <h1 class="titolo-documento">BANDO DOTE SPORT ${anno}</h1>
    <div style="text-align:center;font-size:12px;color:#555;margin-bottom:24px;">${decreto}</div>

    <h1 class="titolo-documento">ATTESTAZIONE DI PAGAMENTO E FREQUENZA</h1>

    <div class="corpo">
      Il sottoscritto <span class="campo">${societa.presidente_nome ?? '______________________________'}</span>
      (CF: <span class="campo">${societa.presidente_cf ?? '______________________________'}</span>)
      Presidente del <strong>${societa.nome}</strong>
      con sede legale in ${societa.citta}${societa.indirizzo ? ` (${societa.indirizzo})` : ''} —
      C.F. ${societa.codice_fiscale ?? '—'}
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <div class="corpo">
      Che è in corso di validità l'iscrizione al "Registro Nazionale delle Associazioni e Società
      Sportive dilettantistiche del CONI" o alla sezione CIP del Registro,
      per la stagione sportiva ${dati.stagione}.
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA INOLTRE</strong></div>

    <div class="corpo">
      Di aver ricevuto da <strong>${nome}</strong> — CF ${cf} —
      la somma di <strong>Euro <span class="campo">${importo}</span></strong>,
      quale corrispettivo per l'iscrizione del minore <strong>${nome}</strong> — CF ${cf} —
      relativo al corso di <strong>${dati.disciplina_sportiva ?? 'Calcio'}</strong>
      per la stagione sportiva ${dati.stagione},
      della durata di mesi 10, dal 01/09/${anno === 2025 ? anno : anno - 1} al 30/06/${anno === 2025 ? anno + 1 : anno}.
    </div>

    ${firmaSemplice(societa)}
  `
  return wrapHtmlDocumento(corpo, `Bando Dote Sport ${anno} — ${nome}`)
}

// ── Dichiarazione compensi anno solare ───────────────────────────────
export function generaDichiarazioneCompensiAnno(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const anno = (dati as any).anno_compenso ?? dati.anno
  const nome = `${tesserato.nome} ${tesserato.cognome}`

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">DICHIARAZIONE DI PAGAMENTO COMPENSI<br>Anno Solare ${anno}</h1>

    <div class="corpo">
      Il/La sottoscritto/a <strong>${societa.presidente_nome ?? '—'}</strong>,
      in qualità di Presidente/Rappresentante Legale dell'A.S.D. / S.S.D.
      <strong>${societa.nome}</strong>, con sede in ${societa.citta},
      C.F. ${societa.codice_fiscale ?? '—'},
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <div class="corpo">
      di aver corrisposto al Sig./Sig.ra <strong>${nome}</strong>,
      C.F. <span class="campo">${tesserato.codice_fiscale ?? '—'}</span>,
      nel corso dell'anno solare <strong>${anno}</strong>, compensi per prestazioni sportive
      dilettantistiche ai sensi del D.Lgs. 36/2021 e successive modificazioni.
    </div>

    <div class="corpo">
      La presente dichiarazione è rilasciata su richiesta dell'interessato per gli usi consentiti
      dalla legge.
    </div>

    ${firmaSemplice(societa)}
  `
  return wrapHtmlDocumento(corpo, `Dichiarazione Compensi ${anno} — ${nome}`)
}

// ── Dichiarazione compensi stagione ──────────────────────────────────
export function generaDichiarazioneCompensiStagione(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">DICHIARAZIONE DI PAGAMENTO COMPENSI<br>Stagione Sportiva ${dati.stagione}</h1>

    <div class="corpo">
      Il/La sottoscritto/a <strong>${societa.presidente_nome ?? '—'}</strong>,
      in qualità di Presidente/Rappresentante Legale dell'A.S.D. / S.S.D.
      <strong>${societa.nome}</strong>, con sede in ${societa.citta},
      C.F. ${societa.codice_fiscale ?? '—'},
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <div class="corpo">
      di aver corrisposto al Sig./Sig.ra <strong>${nome}</strong>,
      C.F. <span class="campo">${tesserato.codice_fiscale ?? '—'}</span>,
      nel corso della stagione sportiva <strong>${dati.stagione}</strong>, compensi per
      prestazioni sportive dilettantistiche ai sensi del D.Lgs. 36/2021 e successive modificazioni.
    </div>

    <div class="corpo">
      La presente dichiarazione è rilasciata su richiesta dell'interessato per gli usi consentiti
      dalla legge.
    </div>

    ${firmaSemplice(societa)}
  `
  return wrapHtmlDocumento(corpo, `Dichiarazione Compensi Stagione ${dati.stagione} — ${nome}`)
}

// ── Bando Lazio ──────────────────────────────────────────────────────
export function generaBandoLazio(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const importo = (dati.importo ?? 0).toFixed(2).replace('.', ',')
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const cf   = tesserato.codice_fiscale ?? '—'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">ATTESTAZIONE DI PAGAMENTO E FREQUENZA<br>
      <span style="font-size:12px;font-weight:400;">Bando Regione Lazio — Stagione ${dati.stagione}</span>
    </h1>

    <div class="corpo">
      Il/La sottoscritto/a <span class="campo">${societa.presidente_nome ?? '______________________'}</span>
      (CF: <span class="campo">${societa.presidente_cf ?? '______________________'}</span>)
      Presidente di <strong>${societa.nome}</strong>,
      con sede in ${societa.citta}${societa.indirizzo ? `, ${societa.indirizzo}` : ''},
      C.F. ${societa.codice_fiscale ?? '—'},
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <div class="corpo">
      Che è in corso di validità l'iscrizione al "Registro Nazionale delle Associazioni e Società
      Sportive dilettantistiche del CONI" o alla sezione CIP del Registro per la stagione
      sportiva ${dati.stagione}.
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA INOLTRE</strong></div>

    <div class="corpo">
      Di aver ricevuto da <strong>${nome}</strong> — CF ${cf} —
      la somma di <strong>Euro <span class="campo">${importo}</span></strong>,
      quale corrispettivo per l'iscrizione dell'atleta <strong>${nome}</strong> — CF ${cf} —
      relativo al corso di <strong>${dati.disciplina_sportiva ?? 'Calcio'}</strong>
      per la stagione sportiva ${dati.stagione}.
    </div>

    <div class="corpo">
      Dichiara inoltre che il tesserato ha partecipato attivamente alle iniziative organizzate
      dall'associazione durante tutta la stagione.
    </div>

    ${firmaSemplice(societa)}
  `
  return wrapHtmlDocumento(corpo, `Bando Lazio — ${nome}`)
}

// ── Fondo Dote Famiglia 2025 ─────────────────────────────────────────
export function generaFondoDoteFamiglia(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const importo      = (dati.importo ?? 0).toFixed(2).replace('.', ',')
  const codicecorso  = (dati as any).codice_corso ?? '______________________'
  const dataInizio   = (dati as any).data_inizio_corso ?? '______________________'
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const cf   = tesserato.codice_fiscale ?? '—'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">FONDO DOTE FAMIGLIA 2025<br>
      <span style="font-size:12px;font-weight:400;">Attestazione di Pagamento e Frequenza</span>
    </h1>

    <div class="corpo">
      Il/La sottoscritto/a <span class="campo">${societa.presidente_nome ?? '______________________'}</span>
      (CF: <span class="campo">${societa.presidente_cf ?? '______________________'}</span>)
      Presidente di <strong>${societa.nome}</strong>,
      con sede in ${societa.citta}${societa.indirizzo ? `, ${societa.indirizzo}` : ''},
      C.F. ${societa.codice_fiscale ?? '—'},
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <div class="corpo">
      Che è in corso di validità l'iscrizione al "Registro Nazionale delle Associazioni e Società
      Sportive dilettantistiche del CONI" o alla sezione CIP del Registro per la stagione
      sportiva ${dati.stagione}.
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA INOLTRE</strong></div>

    <div class="corpo">
      Di aver ricevuto da <strong>${nome}</strong> — CF ${cf} —
      la somma di <strong>Euro <span class="campo">${importo}</span></strong>
      quale corrispettivo per l'iscrizione dell'atleta <strong>${nome}</strong> — CF ${cf} —
      al corso di <strong>${dati.disciplina_sportiva ?? 'Calcio'}</strong>
      (Codice corso: <strong>${codicecorso}</strong>),
      con inizio attività il <strong>${dataInizio}</strong>,
      per la stagione sportiva ${dati.stagione}.
    </div>

    <div class="corpo">
      Dichiara inoltre che il tesserato ha partecipato attivamente alle iniziative organizzate
      dall'associazione.
    </div>

    ${firmaSemplice(societa)}
  `
  return wrapHtmlDocumento(corpo, `Fondo Dote Famiglia 2025 — ${nome}`)
}
