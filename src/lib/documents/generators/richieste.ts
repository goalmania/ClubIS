import type { DatiGenerazione } from '../types'
import { wrapHtmlDocumento } from '../template-engine'

function intestazione(dati: DatiGenerazione): string {
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
    </div>`
}

function firmaPresidente(societa: { presidente_nome?: string; citta: string }): string {
  return `
    <div style="margin-top:32px;display:flex;justify-content:flex-end;">
      <div>
        <div style="font-size:11px;color:#555;margin-bottom:4px;">Il Presidente</div>
        <div style="font-size:12px;margin-bottom:4px;">${societa.presidente_nome ?? ''}</div>
        <div style="height:55px;"></div>
        <div style="width:200px;border-top:1px solid #ccc;"></div>
      </div>
    </div>`
}

// ── Richiesta Autorizzazione PA ───────────────────────────────────────
export function generaRichiestaPA(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const nascita = tesserato.data_nascita
    ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT') : '—'

  const corpo = `
    <h1 class="titolo-documento">RICHIESTA DI AUTORIZZAZIONE ALL'AMMINISTRAZIONE PUBBLICA DI APPARTENENZA<br>
      <span style="font-size:12px;font-weight:400;">(ai sensi del D.Lgs. n. 36/2021 e successive modificazioni)</span>
    </h1>

    <div class="corpo">
      Io sottoscritto/a <strong>${nome}</strong>
      nato/a il <strong>${nascita}</strong> a <strong>${tesserato.luogo_nascita ?? '—'}</strong>
      e residente in <strong>${tesserato.citta ?? '—'}</strong>
      C.F. <strong>${tesserato.codice_fiscale ?? '—'}</strong>.
    </div>

    <div class="corpo">
      ai sensi e per gli effetti delle previsioni contenute nel D.Lgs n. 28.2.2021 n. 36
      (Attuazione dell'articolo 5 della legge 8 agosto 2019, n. 86, recante riordino e riforma
      delle disposizioni in materia di enti sportivi professionistici e dilettantistici, nonché
      di lavoro sportivo),
    </div>

    <div class="corpo" style="margin:16px 0;text-align:center;"><strong>CHIEDE</strong></div>

    <div class="corpo">
      a codesta Spett.le Amministrazione, l'autorizzazione a svolgere l'attività di collaboratore
      sportivo dilettantistico in qualità di <span class="campo">dirigente sportivo (allenatore,
      istruttore, arbitro, dirigente sportivo, ecc.)</span> per la stagione sportiva ${dati.stagione}
      su incarico dell'EPS/ASD/SSD/APSSD denominata <strong>${societa.nome}</strong>,
      con sede in ${societa.citta}, CF ${societa.codice_fiscale ?? '—'},
      regolarmente iscritta nel registro RASD come da allegata stampa.
    </div>

    <div class="corpo">
      Si dichiara che l'attività da svolgere non è in conflitto o in concorrenza con gli interessi
      dell'Amministrazione e con il buon andamento della stessa e non è in conflitto con gli orari
      di servizio, in quanto verrà svolta al di fuori dei medesimi.
    </div>

    <div class="corpo">
      Per quest'attività, verranno percepiti corrispettivi monetari, quale indennità per la funzione
      espletata, nonché rimborsi-spese per la distanza chilometrica percorsa per assolvere gli
      incarichi, come da proposta di incarico che si allega alla presente.
    </div>

    <div class="corpo">
      Si rimane a disposizione per qualsiasi chiarimento e/o ulteriore integrazione documentale.
    </div>

    <div style="margin-top:32px;">
      Data ${new Date().toLocaleDateString('it-IT')}
    </div>

    <div class="firma-grid">
      <div class="firma-box">
        <div class="firma-label">Firma</div>
        <div class="firma-nome">${nome}</div>
        <div class="firma-spazio"></div>
        <div class="firma-linea"></div>
      </div>
    </div>
  `
  return wrapHtmlDocumento(corpo, `Richiesta Autorizzazione PA — ${nome}`)
}

// ── Richiesta Certificato Contestuale ────────────────────────────────
export function generaRichiestaCertificatoContestuale(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const nascita = tesserato.data_nascita
    ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT') : '—'

  const corpo = `
    ${intestazione(dati)}

    <div style="text-align:right;margin-bottom:20px;">
      <div>${societa.citta}, ${new Date().toLocaleDateString('it-IT')}</div>
      <div style="margin-top:8px;">Spett.le</div>
      <div><strong>Comune di ${tesserato.citta ?? '______________________'}</strong></div>
    </div>

    <p style="font-weight:700;text-decoration:underline;margin-bottom:16px;">
      OGGETTO: RICHIESTA CERTIFICATO ANAGRAFICO CONTESTUALE E PLURIMO DI RESIDENZA
      E STATO DI FAMIGLIA PER USO SPORTIVO
    </p>

    <div class="corpo">
      Il/La sottoscritto/a <span class="campo">${societa.presidente_nome ?? '______________________'}</span>,
      in qualità di Presidente di <strong>${societa.nome}</strong>
    </div>

    <div class="corpo" style="margin:16px 0;text-align:center;"><strong>RICHIEDO</strong></div>

    <div class="corpo">
      quanto in oggetto intestato a <strong>${nome}</strong>
      nato/a a <strong>${tesserato.luogo_nascita ?? '—'}</strong>
      il <strong>${nascita}</strong>
      e residente a <strong>${tesserato.citta ?? '—'}</strong>,
      al fine di poter procedere al tesseramento per l'attività sportiva.
    </div>

    <div class="corpo">
      <strong>Ove ciò non fosse possibile, chiede separatamente lo stato di famiglia e la residenza storica.</strong>
    </div>

    <div class="corpo">
      Ringrazio per la vostra disponibilità, Cordialmente Saluto.
    </div>

    ${firmaPresidente(societa)}
  `
  return wrapHtmlDocumento(corpo, `Richiesta Certificato Contestuale — ${nome}`)
}

// ── Richiesta Iscrizione e Frequenza Scolastica ───────────────────────
export function generaRichiestaIscrizioneScolastica(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const istituto = (dati as any).istituto_scolastico ?? '______________________________________________________'

  const corpo = `
    ${intestazione(dati)}

    <div style="text-align:right;margin-bottom:20px;">
      Al Dirigente Scolastico<br>
      Dell'Istituto Comprensivo<br>
      <strong>${istituto}</strong>
    </div>

    <p style="font-weight:700;text-decoration:underline;margin-bottom:16px;">
      Oggetto: Richiesta certificati iscrizione e frequenza scolastica ad uso sportivo
    </p>

    <div class="corpo">
      Il/La sottoscritto/a <span class="campo">${societa.presidente_nome ?? '______________________'}</span>,
      legale rappresentante di <strong>${societa.nome}</strong>.
    </div>

    <div class="corpo" style="margin:16px 0;text-align:center;"><strong>CHIEDE</strong></div>

    <div class="corpo">Il rilascio di N° 1 copia di:</div>

    <ul style="margin:8px 0 8px 20px;line-height:2;">
      <li>CERTIFICATO DI ISCRIZIONE — ANNO SCOLASTICO ${dati.stagione}</li>
      <li>CERTIFICATO DI ISCRIZIONE E FREQUENZA — ANNO SCOLASTICO ${(() => {
        const y = parseInt(dati.stagione.split('-')[0] ?? '2024') - 1
        return `${y}/${y + 1}`
      })()}</li>
    </ul>

    <div class="corpo">Per il seguente atleta:</div>
    <ul style="margin:8px 0 8px 20px;line-height:2;">
      <li><strong>${nome}</strong></li>
    </ul>

    <div class="corpo">
      Ai fini del tesseramento sportivo per la stagione ${dati.stagione}.
    </div>

    <div class="corpo" style="margin-top:16px;">
      ${societa.citta}, ${new Date().toLocaleDateString('it-IT')}
    </div>

    ${firmaPresidente(societa)}
  `
  return wrapHtmlDocumento(corpo, `Richiesta Iscrizione Scolastica — ${nome}`)
}

// ── Richiesta Storico Residenza ───────────────────────────────────────
export function generaRichiestaStoricoResidenza(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const nascita = tesserato.data_nascita
    ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT') : '—'

  const corpo = `
    ${intestazione(dati)}

    <div style="text-align:right;margin-bottom:20px;">
      <div>${societa.citta}, ${new Date().toLocaleDateString('it-IT')}</div>
      <div style="margin-top:8px;">Spett.le</div>
      <div><strong>Comune di ${tesserato.citta ?? '______________________'}</strong></div>
      <div>Ufficio Anagrafe</div>
    </div>

    <p style="font-weight:700;text-decoration:underline;margin-bottom:16px;">
      OGGETTO: RICHIESTA STORICO DI RESIDENZA PER USO SPORTIVO
    </p>

    <div class="corpo">
      Il/La sottoscritto/a <span class="campo">${societa.presidente_nome ?? '______________________'}</span>,
      in qualità di Presidente di <strong>${societa.nome}</strong>,
    </div>

    <div class="corpo" style="margin:16px 0;text-align:center;"><strong>CHIEDE</strong></div>

    <div class="corpo">
      il rilascio dello storico di residenza intestato a <strong>${nome}</strong>,
      nato/a a <strong>${tesserato.luogo_nascita ?? '—'}</strong>
      il <strong>${nascita}</strong>,
      C.F. <strong>${tesserato.codice_fiscale ?? '—'}</strong>,
      al fine di poter procedere al tesseramento sportivo per la stagione ${dati.stagione}.
    </div>

    <div class="corpo">
      Ringrazio per la disponibilità. Cordialmente.
    </div>

    ${firmaPresidente(societa)}
  `
  return wrapHtmlDocumento(corpo, `Richiesta Storico Residenza — ${nome}`)
}

// ── Nulla Osta Sportivo ───────────────────────────────────────────────
export function generaNullaOsta(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const nascita = tesserato.data_nascita
    ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT') : '—'
  const federazione   = (dati as any).federazione ?? 'Federazione Italiana Giuoco Calcio (FIGC)'
  const dataInizio    = (dati as any).data_inizio ?? '______________________'
  const dataFine      = (dati as any).data_fine ?? '______________________'
  const societa_dest  = (dati as any).societa_destinataria ?? '______________________________'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">NULLA OSTA SPORTIVO</h1>

    <div class="corpo">
      Il/La sottoscritto/a <strong>${societa.presidente_nome ?? '—'}</strong>,
      Presidente di <strong>${societa.nome}</strong>,
      con sede in ${societa.citta}${societa.indirizzo ? `, ${societa.indirizzo}` : ''},
      C.F. ${societa.codice_fiscale ?? '—'},
      affiliata alla <strong>${federazione}</strong>,
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <div class="corpo">
      di non avere nulla in contrario al trasferimento dell'atleta
      <strong>${nome}</strong>,
      nato/a a <strong>${tesserato.luogo_nascita ?? '—'}</strong>
      il <strong>${nascita}</strong>,
      C.F. <strong>${tesserato.codice_fiscale ?? '—'}</strong>,
      tesserato/a con la scrivente società,
      alla società <strong>${societa_dest}</strong>,
      per il periodo dal <strong>${dataInizio}</strong> al <strong>${dataFine}</strong>,
      per la disciplina sportiva <strong>${dati.disciplina_sportiva ?? 'Calcio'}</strong>.
    </div>

    <div class="corpo">
      Si dichiara altresì che il suddetto atleta non è gravato da vincoli di alcun genere
      e non ha debiti nei confronti della scrivente società.
    </div>

    <div style="margin-top:32px;">
      ${societa.citta}, ${new Date().toLocaleDateString('it-IT')}
    </div>

    <div class="firma-grid">
      <div class="firma-box">
        <div class="firma-label">Il Presidente</div>
        <div class="firma-nome">${societa.presidente_nome ?? '—'}</div>
        <div class="firma-spazio"></div>
        <div class="firma-linea"></div>
      </div>
    </div>
  `
  return wrapHtmlDocumento(corpo, `Nulla Osta — ${nome}`)
}

// ── Certificazione Crediti Scolastici ─────────────────────────────────
export function generaCertificazioneCrediti(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const annoScolastico = (dati as any).anno_scolastico ?? dati.stagione

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">CERTIFICAZIONE CREDITI SCOLASTICI<br>
      <span style="font-size:12px;font-weight:400;">Anno Scolastico ${annoScolastico}</span>
    </h1>

    <div class="corpo">
      Il/La sottoscritto/a <strong>${societa.presidente_nome ?? '—'}</strong>,
      in qualità di Presidente/Rappresentante Legale di <strong>${societa.nome}</strong>,
      con sede in ${societa.citta}, C.F. ${societa.codice_fiscale ?? '—'},
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>CERTIFICA</strong></div>

    <div class="corpo">
      che l'atleta <strong>${nome}</strong>,
      nato/a il ${tesserato.data_nascita ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT') : '—'},
      C.F. ${tesserato.codice_fiscale ?? '—'},
      ha partecipato regolarmente alle attività sportive organizzate da
      <strong>${societa.nome}</strong> per l'anno scolastico <strong>${annoScolastico}</strong>,
      praticando la disciplina <strong>${dati.disciplina_sportiva ?? 'Calcio'}</strong>.
    </div>

    <div class="corpo">
      La partecipazione alle attività sportive può essere valutata ai fini del riconoscimento
      di crediti scolastici, in conformità alle disposizioni normative vigenti.
    </div>

    <div class="corpo">
      La presente certificazione è rilasciata su richiesta dell'interessato per gli usi
      consentiti dalla legge.
    </div>

    <div style="margin-top:32px;">
      ${societa.citta}, ${new Date().toLocaleDateString('it-IT')}
    </div>

    <div class="firma-grid">
      <div class="firma-box">
        <div class="firma-label">Il Presidente</div>
        <div class="firma-nome">${societa.presidente_nome ?? '—'}</div>
        <div class="firma-spazio"></div>
        <div class="firma-linea"></div>
      </div>
    </div>
  `
  return wrapHtmlDocumento(corpo, `Certificazione Crediti Scolastici — ${nome}`)
}
