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
        </div>
      </div>
    </div>`
}

function firmaGenitori(label1 = 'Firma padre', label2 = 'Firma madre'): string {
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:50px;">
      <div>
        <div style="font-size:11px;color:#555;margin-bottom:4px;">${label1}</div>
        <div style="height:55px;"></div>
        <div style="border-top:1px solid #ccc;"></div>
      </div>
      <div>
        <div style="font-size:11px;color:#555;margin-bottom:4px;">${label2}</div>
        <div style="height:55px;"></div>
        <div style="border-top:1px solid #ccc;"></div>
      </div>
    </div>`
}

// ── Autorizzazione al Trasporto ───────────────────────────────────────
export function generaAutorizzazioneTrasporto(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nomeAtleta = `${tesserato.nome} ${tesserato.cognome}`

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">AUTORIZZAZIONE AL TRASPORTO</h1>

    <div class="corpo">
      Con la presente, i sottoscritti
    </div>
    <div style="border-bottom:1px solid #1a1a1a;min-height:24px;margin-bottom:8px;"></div>

    <div class="corpo">
      in qualità di genitori<sup>(*)</sup>, dichiarano di autorizzare
      <strong>${societa.nome}</strong> ad accompagnare il/la figlio/a
      <strong>${nomeAtleta}</strong>, iscritto/a a <strong>${societa.nome}</strong>,
      a qualsiasi partita, allenamento, manifestazione od altro evento inerente l'attività
      sportiva e ricreativa per la stagione ${dati.stagione}, esonerando
      <strong>${societa.nome}</strong> da ogni responsabilità derivante dal trasporto del
      minore e rinunciando fin da ora a qualunque azione, pretesa, diritto o indennizzo nei
      confronti delle stesse in relazione alla suddetta responsabilità.
    </div>

    <div class="corpo">
      Dichiarano inoltre di essere informati e consapevoli delle modalità e delle persone
      incaricate del trasporto.
    </div>

    <div class="corpo" style="margin-top:20px;">
      Luogo e data: ${societa.citta}, ${new Date().toLocaleDateString('it-IT')}
    </div>
    <div class="corpo">Firma di entrambi i genitori<sup>(*)</sup></div>

    ${firmaGenitori()}

    <div class="nota-legale">
      <sup>(*)</sup> esercenti la patria potestà o altra persona che ne fa le veci<br>
      In fede
    </div>
  `
  return wrapHtmlDocumento(corpo, `Autorizzazione Trasporto — ${nomeAtleta}`)
}

// ── Autorizzazione Uscita Autonoma ────────────────────────────────────
export function generaAutorizzazioneUscitaAutonoma(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nomeAtleta = `${tesserato.nome} ${tesserato.cognome}`
  const corso = (dati as any).corso ?? (dati as any).squadra ?? '______________________'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">AUTORIZZAZIONE USCITA AUTONOMA ATLETA<br>
      <span style="font-size:12px;font-weight:400;">${societa.nome}</span>
    </h1>

    <div class="corpo">
      I sottoscritti <span class="campo" style="min-width:180px;">&nbsp;</span> e
      <span class="campo" style="min-width:180px;">&nbsp;</span> aventi la potestà genitoriale
      dell'atleta <strong>${nomeAtleta}</strong>, frequentante il corso <strong>${corso}</strong>
      di <strong>${societa.nome}</strong>
    </div>

    <div style="display:grid;grid-template-columns:80px 1fr;gap:8px;margin:12px 0;">
      <div style="font-weight:700;font-size:11px;">VISTO</div>
      <div class="corpo">l'art. 19-bis comma 1, della Legge n. 172/2017;</div>
      <div style="font-weight:700;font-size:11px;">CONSIDERATA</div>
      <div class="corpo">l'età e il grado di autonomia di nostro/a figlio/a, nonché lo specifico contesto territoriale e scolastico nel quale opera;</div>
    </div>

    <div class="corpo">Nell'ambito di un processo volto alla auto-responsabilizzazione del minore</div>

    <div class="corpo" style="margin:12px 0;"><strong>DICHIARANO</strong></div>

    <ul style="margin:0 0 12px 20px;line-height:2;">
      <li>di essere consapevoli che la presente autorizzazione esonera il personale di <strong>${societa.nome}</strong> da ogni responsabilità connessa all'adempimento dell'obbligo di vigilanza;</li>
      <li>di aver valutato le caratteristiche del percorso casa-${societa.nome} e dei potenziali pericoli, e che il proprio figlio/a lo conosce e lo ha già percorso autonomamente senza accompagnatori;</li>
      <li>di aver valutato la capacità di autonomia, le caratteristiche e il comportamento abituale del proprio figlio/a, e che il proprio figlio/a ha già manifestato autonomia e capacità di evitare situazioni di rischio;</li>
    </ul>

    <div class="corpo"><strong>AUTORIZZANO</strong></div>
    <ul style="margin:0 0 12px 20px;line-height:2;">
      <li>il proprio figlio/a ad uscire autonomamente da <strong>${societa.nome}</strong>, senza la presenza di accompagnatori, alla fine degli allenamenti, gare o altri eventi e, previa comunicazione da parte di <strong>${societa.nome}</strong>, anche in caso di uscita anticipata;</li>
    </ul>

    <div class="corpo"><strong>SI IMPEGNANO A</strong></div>
    <ul style="margin:0 0 12px 20px;line-height:2;">
      <li>controllare i tempi di percorrenza anche tramite cellulare, le abitudini del proprio figlio/a per evitare eventuali pericoli;</li>
      <li>dare chiare istruzioni affinché il proprio figlio/a, all'uscita di ${societa.nome}, rientri direttamente alla propria abitazione, senza divagazioni;</li>
      <li>informare tempestivamente ${societa.nome} qualora le condizioni di sicurezza si dovessero modificare;</li>
      <li>ricordare costantemente al proprio figlio/a la necessità di corretti comportamenti e il rispetto del codice della strada.</li>
    </ul>

    <div class="corpo" style="margin-top:16px;">
      Data ${new Date().toLocaleDateString('it-IT')}
    </div>

    ${firmaGenitori()}
  `
  return wrapHtmlDocumento(corpo, `Uscita Autonoma — ${nomeAtleta}`)
}

// ── Dichiarazione Responsabilità e Manleva ────────────────────────────
export function generaDichiarazioneRespManleva(dati: DatiGenerazione): string {
  const { societa, tesserato, genitore } = dati
  const nomeAtleta = `${tesserato.nome} ${tesserato.cognome}`
  const nomeGen = genitore ? `${genitore.nome} ${genitore.cognome}` : '______________________________'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">DICHIARAZIONE DI RESPONSABILITÀ E MANLEVA</h1>

    <div class="corpo">
      Il/La sottoscritto/a <span class="campo">${nomeGen}</span>,
      in qualità di genitore/tutore dell'atleta <strong>${nomeAtleta}</strong>,
      nato/a il ${tesserato.data_nascita ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT') : '—'},
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <div class="corpo">
      di sollevare e manlevare <strong>${societa.nome}</strong>, i suoi dirigenti, collaboratori
      e tecnici da qualsiasi responsabilità civile e penale per danni a persone o cose che
      possano derivare dalla partecipazione dell'atleta alle attività sportive organizzate dalla
      società per la stagione ${dati.stagione}.
    </div>

    <div class="corpo">
      Il/La sottoscritto/a dichiara di essere a conoscenza delle caratteristiche e dei rischi
      connessi alla pratica sportiva e di accettarli pienamente.
    </div>

    <div class="corpo">
      Data: ${societa.citta}, ${new Date().toLocaleDateString('it-IT')}
    </div>

    ${firmaGenitori('Firma genitore/tutore', '')}
  `
  return wrapHtmlDocumento(corpo, `Responsabilità e Manleva — ${nomeAtleta}`)
}

// ── Prestazione Volontaria Maggiorenni ────────────────────────────────
export function generaPrestazioneVolontariaMagg(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const nascita = tesserato.data_nascita
    ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT') : '—'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">DICHIARAZIONE DI PRESTAZIONE VOLONTARIA<br>
      <span style="font-size:12px;font-weight:400;">Art. 29 D.Lgs. 36/2021 — Atleta Maggiorenne</span>
    </h1>

    <div class="corpo">
      Il/La sottoscritto/a <strong>${nome}</strong>,
      nato/a il <strong>${nascita}</strong> a <strong>${tesserato.luogo_nascita ?? '—'}</strong>,
      C.F. <strong>${tesserato.codice_fiscale ?? '—'}</strong>,
      residente in <strong>${tesserato.citta ?? '—'}</strong>,
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <div class="corpo">
      di svolgere in favore di <strong>${societa.nome}</strong> prestazione sportiva a titolo
      <strong>volontario e gratuito</strong>, ai sensi dell'art. 29 del D.Lgs. 28 febbraio 2021
      n. 36 (Riforma dello Sport), senza alcuna forma di compenso o rimborso spese di carattere
      continuativo, per la stagione sportiva <strong>${dati.stagione}</strong>.
    </div>

    <div class="corpo">
      Il/La dichiarante è consapevole che la presente dichiarazione è resa ai sensi degli artt.
      46 e 47 del D.P.R. 445/2000 e che le dichiarazioni mendaci sono punite ai sensi del
      Codice Penale.
    </div>

    <div style="margin-top:32px;">
      ${societa.citta}, ${new Date().toLocaleDateString('it-IT')}
    </div>

    <div class="firma-grid">
      <div class="firma-box">
        <div class="firma-label">Il Dichiarante</div>
        <div class="firma-nome">${nome}</div>
        <div class="firma-spazio"></div>
        <div class="firma-linea"></div>
      </div>
      <div class="firma-box">
        <div class="firma-label">Il Presidente</div>
        <div class="firma-nome">${societa.presidente_nome ?? '—'}</div>
        <div class="firma-spazio"></div>
        <div class="firma-linea"></div>
      </div>
    </div>
  `
  return wrapHtmlDocumento(corpo, `Prestazione Volontaria Maggiorenni — ${nome}`)
}

// ── Prestazione Volontaria Minorenni ─────────────────────────────────
export function generaPrestazioneVolontariaMin(dati: DatiGenerazione): string {
  const { societa, tesserato, genitore } = dati
  const nomeAtleta = `${tesserato.nome} ${tesserato.cognome}`
  const nascita = tesserato.data_nascita
    ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT') : '—'
  const nomeGen = genitore ? `${genitore.nome} ${genitore.cognome}` : '______________________________'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">DICHIARAZIONE DI PRESTAZIONE VOLONTARIA<br>
      <span style="font-size:12px;font-weight:400;">Art. 29 D.Lgs. 36/2021 — Atleta Minorenne</span>
    </h1>

    <div class="corpo">
      Il/La sottoscritto/a <span class="campo">${nomeGen}</span>,
      in qualità di genitore/tutore dell'atleta <strong>${nomeAtleta}</strong>,
      nato/a il <strong>${nascita}</strong>, C.F. <strong>${tesserato.codice_fiscale ?? '—'}</strong>,
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <div class="corpo">
      che il/la proprio/a figlio/a svolge in favore di <strong>${societa.nome}</strong>
      prestazione sportiva a titolo <strong>volontario e gratuito</strong>, ai sensi dell'art. 29
      del D.Lgs. 28 febbraio 2021 n. 36 (Riforma dello Sport), senza alcuna forma di compenso o
      rimborso spese di carattere continuativo, per la stagione sportiva
      <strong>${dati.stagione}</strong>.
    </div>

    <div class="corpo">
      Il/La dichiarante è consapevole che la presente dichiarazione è resa ai sensi degli artt.
      46 e 47 del D.P.R. 445/2000 e che le dichiarazioni mendaci sono punite ai sensi del
      Codice Penale.
    </div>

    <div style="margin-top:32px;">
      ${societa.citta}, ${new Date().toLocaleDateString('it-IT')}
    </div>

    <div class="firma-grid">
      <div class="firma-box">
        <div class="firma-label">Il Genitore / Tutore</div>
        <div class="firma-nome">${nomeGen}</div>
        <div class="firma-spazio"></div>
        <div class="firma-linea"></div>
      </div>
      <div class="firma-box">
        <div class="firma-label">Il Presidente</div>
        <div class="firma-nome">${societa.presidente_nome ?? '—'}</div>
        <div class="firma-spazio"></div>
        <div class="firma-linea"></div>
      </div>
    </div>
  `
  return wrapHtmlDocumento(corpo, `Prestazione Volontaria Minorenni — ${nomeAtleta}`)
}

// ── Dichiarazione Sostitutiva Casellario Giudiziale ───────────────────
export function generaDichiarazioneCasellario(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const nascita = tesserato.data_nascita
    ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT') : '—'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">DICHIARAZIONE SOSTITUTIVA DEL CASELLARIO GIUDIZIALE<br>
      <span style="font-size:12px;font-weight:400;">Art. 46 D.P.R. 28 dicembre 2000 n. 445</span>
    </h1>

    <div class="corpo">
      Il/La sottoscritto/a <strong>${nome}</strong>,
      nato/a a <strong>${tesserato.luogo_nascita ?? '—'}</strong>
      il <strong>${nascita}</strong>,
      C.F. <strong>${tesserato.codice_fiscale ?? '—'}</strong>,
      residente in <strong>${tesserato.citta ?? '—'}${tesserato.indirizzo ? `, ${tesserato.indirizzo}` : ''}</strong>,
    </div>

    <div class="corpo">
      consapevole delle sanzioni penali richiamate dall'art. 76 del D.P.R. 445/2000 in caso di
      dichiarazioni mendaci, e della decadenza dai benefici eventualmente conseguiti,
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <ul style="margin:0 0 12px 20px;line-height:2;">
      <li>di non aver riportato condanne penali e di non avere procedimenti penali in corso a proprio carico;</li>
      <li>di non essere sottoposto a misure di prevenzione;</li>
      <li>di non essere destinatario di provvedimenti che riguardino l'applicazione di misure di sicurezza e di misure di prevenzione;</li>
      <li>di non avere precedenti penali ostativi all'esercizio di attività sportive con minori, ai sensi della Legge 4 giugno 2010, n. 96 e del D.Lgs. 39/2014.</li>
    </ul>

    <div class="corpo">
      La presente dichiarazione è resa ai fini del tesseramento sportivo con
      <strong>${societa.nome}</strong> per la stagione ${dati.stagione}.
    </div>

    <div style="margin-top:32px;">
      ${societa.citta}, ${new Date().toLocaleDateString('it-IT')}
    </div>

    <div class="firma-grid">
      <div class="firma-box">
        <div class="firma-label">Il Dichiarante</div>
        <div class="firma-nome">${nome}</div>
        <div class="firma-spazio"></div>
        <div class="firma-linea"></div>
      </div>
    </div>

    <div class="nota-legale">
      Ai sensi dell'art. 38 D.P.R. 445/2000, la presente dichiarazione è sottoscritta dall'interessato
      in presenza del dipendente addetto ovvero allegando copia di un documento di identità in corso di validità.
    </div>
  `
  return wrapHtmlDocumento(corpo, `Dichiarazione Casellario — ${nome}`)
}
