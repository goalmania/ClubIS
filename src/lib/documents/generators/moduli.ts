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

function riga(etichetta: string, valore: string): string {
  return `
    <div class="campo-dato">
      <div class="etichetta">${etichetta}</div>
      <div class="valore">${valore || '&nbsp;'}</div>
    </div>`
}

// ── Scheda Atleta Anagrafica ──────────────────────────────────────────
export function generaSchedaAtleta(dati: DatiGenerazione): string {
  const { tesserato } = dati
  const nascita = tesserato.data_nascita
    ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT') : '—'

  const corpo = `
    <h1 class="titolo-documento">SCHEDA ATLETA</h1>

    <div class="griglia-dati" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:24px;">
      ${riga('Nome',            tesserato.nome)}
      ${riga('Cognome',         tesserato.cognome)}
      ${riga('Data di nascita', nascita)}
      ${riga('Codice Fiscale',  tesserato.codice_fiscale ?? '')}
      ${riga('Sesso',           '&nbsp;')}
      ${riga('Tessera',         tesserato.codice_tessera_figc ?? '')}
      ${riga('Ruolo',           tesserato.ruolo_principale?.replace(/_/g,' ') ?? '')}
      ${riga('Nazionalità',     tesserato.nazionalita_paese ?? 'ITA')}
      ${riga('Luogo di nascita', tesserato.luogo_nascita ?? '')}
    </div>

    <div style="border-top:1px solid #ccc;margin:16px 0;"></div>

    <div class="griglia-dati" style="grid-template-columns:1fr 1fr;">
      ${riga('Comune di residenza', tesserato.citta ?? '')}
      ${riga('Indirizzo',           tesserato.indirizzo ?? '')}
      ${riga('CAP',                 tesserato.cap ?? '')}
      ${riga('Provincia',           tesserato.provincia ?? '')}
      ${riga('Telefono',            tesserato.telefono_contatto ?? '')}
      ${riga('Email',               tesserato.email_contatto ?? '')}
      ${riga('Scadenza visita medica', '&nbsp;')}
      ${riga('Tesserato il',        '&nbsp;')}
    </div>
  `
  return wrapHtmlDocumento(corpo, `Scheda Atleta — ${tesserato.cognome} ${tesserato.nome}`)
}

// ── Modulo Iscrizione Tesserati ───────────────────────────────────────
export function generaModuloIscrizione(dati: DatiGenerazione): string {
  const { societa, tesserato, genitore } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const nascita = tesserato.data_nascita
    ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT') : '—'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">MODULO DI ISCRIZIONE TESSERATI<br>
      <span style="font-size:12px;font-weight:400;">Stagione Sportiva ${dati.stagione}</span>
    </h1>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;color:#333;">
      DATI ATLETA
    </div>
    <div class="griglia-dati">
      ${riga('Cognome',         tesserato.cognome)}
      ${riga('Nome',            tesserato.nome)}
      ${riga('Data di nascita', nascita)}
      ${riga('Luogo di nascita', tesserato.luogo_nascita ?? '')}
      ${riga('Codice Fiscale',  tesserato.codice_fiscale ?? '')}
      ${riga('Nazionalità',     tesserato.nazionalita_paese ?? 'Italiana')}
      ${riga('Indirizzo',       tesserato.indirizzo ?? '')}
      ${riga('Città / CAP',     `${tesserato.citta ?? ''} ${tesserato.cap ?? ''}`)}
      ${riga('Telefono',        tesserato.telefono_contatto ?? '')}
      ${riga('Email',           tesserato.email_contatto ?? '')}
    </div>

    ${tesserato.is_minorenne && genitore ? `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:16px 0 8px;color:#333;">
        DATI GENITORE / TUTORE
      </div>
      <div class="griglia-dati">
        ${riga('Cognome e Nome', `${genitore.cognome} ${genitore.nome}`)}
        ${riga('Codice Fiscale', genitore.codice_fiscale ?? '')}
        ${riga('Email',          genitore.email ?? '')}
        ${riga('Telefono',       genitore.telefono ?? '')}
      </div>
    ` : ''}

    <div style="margin-top:20px;" class="corpo">
      Il/La sottoscritto/a dichiara di aver preso visione dello Statuto e del Regolamento Interno
      di <strong>${societa.nome}</strong> e di accettarli integralmente.
    </div>

    <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:40px;">
      <div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#555;margin-bottom:4px;">Firma atleta / genitore</div>
        <div style="height:55px;"></div>
        <div style="border-top:1px solid #ccc;"></div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#555;">${societa.citta}, ${new Date().toLocaleDateString('it-IT')}</div>
      </div>
    </div>
  `
  return wrapHtmlDocumento(corpo, `Modulo Iscrizione — ${nome}`)
}

// ── Domanda Ammissione a Socio ────────────────────────────────────────
export function generaDomandaSocio(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const nascita = tesserato.data_nascita
    ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT') : '—'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">DOMANDA DI AMMISSIONE A SOCIO</h1>

    <div class="corpo">
      Il/La sottoscritto/a <strong>${nome}</strong>,
      nato/a a <strong>${tesserato.luogo_nascita ?? '—'}</strong>
      il <strong>${nascita}</strong>,
      C.F. <strong>${tesserato.codice_fiscale ?? '—'}</strong>,
      residente in <strong>${tesserato.citta ?? '—'}${tesserato.indirizzo ? `, ${tesserato.indirizzo}` : ''}</strong>,
      telefono <strong>${tesserato.telefono_contatto ?? '—'}</strong>,
      email <strong>${tesserato.email_contatto ?? '—'}</strong>,
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>CHIEDE</strong></div>

    <div class="corpo">
      di essere ammesso/a come socio/a dell'Associazione Sportiva Dilettantistica
      <strong>${societa.nome}</strong>, per la stagione sportiva ${dati.stagione}.
    </div>

    <div class="corpo">
      Il/La richiedente dichiara:
    </div>
    <ul style="margin:8px 0 12px 20px;line-height:2;">
      <li>di aver letto e accettato integralmente lo Statuto dell'Associazione;</li>
      <li>di condividere le finalità e gli scopi sociali dell'Associazione;</li>
      <li>di impegnarsi a rispettare le norme federali e il Regolamento Interno;</li>
      <li>di non essere iscritto/a ad associazioni che perseguono scopi contrari a quelli dell'Associazione.</li>
    </ul>

    <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:40px;">
      <div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#555;margin-bottom:4px;">Firma del richiedente</div>
        <div style="height:55px;"></div>
        <div style="border-top:1px solid #ccc;"></div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#555;">${societa.citta}, ${new Date().toLocaleDateString('it-IT')}</div>
      </div>
    </div>

    <div style="margin-top:32px;border-top:1px dashed #ccc;padding-top:16px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#777;margin-bottom:8px;">
        VISTO DEL CONSIGLIO DIRETTIVO (da compilare a cura della segreteria)
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="campo-dato">
          <div class="etichetta">Delibera n.</div>
          <div class="valore">&nbsp;</div>
        </div>
        <div class="campo-dato">
          <div class="etichetta">Data delibera</div>
          <div class="valore">&nbsp;</div>
        </div>
      </div>
    </div>
  `
  return wrapHtmlDocumento(corpo, `Domanda Ammissione Socio — ${nome}`)
}

// ── Convocazione Assemblea Soci ───────────────────────────────────────
export function generaConvocazioneSoci(dati: DatiGenerazione): string {
  const { societa } = dati
  const dataAssemblea = (dati as any).data_assemblea ?? '______________________'
  const oraAssemblea  = (dati as any).ora_assemblea  ?? '______'
  const sedeAssemblea = (dati as any).sede_assemblea ?? societa.citta
  const odg           = (dati as any).ordine_del_giorno ?? '1. Apertura dei lavori\n2. Varie ed eventuali'

  const odgHtml = odg.split('\n').filter(Boolean).map((v: string) => `<li>${v.replace(/^\d+\.\s*/, '')}</li>`).join('')

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">CONVOCAZIONE ASSEMBLEA SOCI<br>
      <span style="font-size:12px;font-weight:400;">Stagione ${dati.stagione}</span>
    </h1>

    <div class="corpo">
      Su incarico del Presidente, si convocano tutti i Soci all'<strong>ASSEMBLEA DEI SOCI</strong>
      che si terrà il giorno <strong>${dataAssemblea}</strong> alle ore <strong>${oraAssemblea}</strong>
      presso <strong>${sedeAssemblea}</strong>.
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>ORDINE DEL GIORNO</strong></div>
    <ol style="margin:0 0 16px 20px;line-height:2;">${odgHtml}</ol>

    <div class="corpo">
      In caso di mancanza del numero legale in prima convocazione, la seconda convocazione è fissata
      per lo stesso giorno con un'ora di ritardo e medesimo ordine del giorno.
    </div>

    <div class="corpo" style="margin-top:20px;">
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
  return wrapHtmlDocumento(corpo, `Convocazione Assemblea Soci — ${societa.nome}`)
}

// ── Modulo Giustificazione Assenza ────────────────────────────────────
export function generaModuloGiustificazioneAssenza(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const dataInizio = (dati as any).data_inizio ?? '______________________'
  const dataFine   = (dati as any).data_fine   ?? '______________________'
  const gruppo     = (dati as any).gruppo ?? (dati as any).squadra ?? '______________________'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">MODULO GIUSTIFICAZIONE ASSENZA<br>
      <span style="font-size:12px;font-weight:400;">Uso Scolastico — Stagione ${dati.stagione}</span>
    </h1>

    <div class="corpo">
      Il/La sottoscritto/a <strong>${societa.presidente_nome ?? '—'}</strong>,
      in qualità di Presidente di <strong>${societa.nome}</strong>,
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <div class="corpo">
      che l'atleta <strong>${nome}</strong>,
      C.F. <strong>${tesserato.codice_fiscale ?? '—'}</strong>,
      frequentante il gruppo <strong>${gruppo}</strong>,
      sarà impegnato/a in attività sportiva agonistica organizzata da
      <strong>${societa.nome}</strong> nel periodo:
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:16px 0;">
      <div class="campo-dato">
        <div class="etichetta">Dal</div>
        <div class="valore">${dataInizio}</div>
      </div>
      <div class="campo-dato">
        <div class="etichetta">Al</div>
        <div class="valore">${dataFine}</div>
      </div>
    </div>

    <div class="corpo">
      Si chiede pertanto di voler giustificare le eventuali assenze scolastiche dell'atleta
      nel suddetto periodo, ai sensi delle disposizioni ministeriali vigenti in materia di
      attività sportiva agonistica.
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
  return wrapHtmlDocumento(corpo, `Giustificazione Assenza — ${nome}`)
}

// ── Modulo Urine Reggio Emilia ────────────────────────────────────────
export function generaModuloUrineReggioEmilia(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const nascita = tesserato.data_nascita
    ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT') : '—'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">RICHIESTA DI ESAME DELLE URINE<br>
      <span style="font-size:12px;font-weight:400;">ASL Reggio Emilia — Controllo Antidoping</span>
    </h1>

    <div class="corpo">
      La società sportiva <strong>${societa.nome}</strong>,
      con sede in ${societa.citta}, C.F. ${societa.codice_fiscale ?? '—'},
      affiliata alla <strong>Federazione Italiana Giuoco Calcio (FIGC)</strong>,
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>RICHIEDE</strong></div>

    <div class="corpo">
      l'effettuazione dell'esame delle urine per l'atleta:
    </div>

    <div class="griglia-dati" style="margin:16px 0;">
      ${riga('Cognome',         tesserato.cognome)}
      ${riga('Nome',            tesserato.nome)}
      ${riga('Data di nascita', nascita)}
      ${riga('Luogo di nascita', tesserato.luogo_nascita ?? '')}
      ${riga('Codice Fiscale',  tesserato.codice_fiscale ?? '')}
      ${riga('Residente in',    `${tesserato.citta ?? ''} ${tesserato.indirizzo ?? ''}`)}
    </div>

    <div class="corpo">
      ai fini del tesseramento sportivo per la stagione ${dati.stagione},
      disciplina <strong>${dati.disciplina_sportiva ?? 'Calcio'}</strong>.
    </div>

    <div style="margin-top:32px;display:flex;justify-content:flex-end;">
      <div>
        <div style="font-size:11px;color:#555;margin-bottom:4px;">Firma del Presidente e Timbro</div>
        <div style="height:55px;"></div>
        <div style="width:200px;border-top:1px solid #ccc;"></div>
      </div>
    </div>
  `
  return wrapHtmlDocumento(corpo, `Modulo Urine Reggio Emilia — ${nome}`)
}

// ── Dichiarazione Volontario Dirigente ────────────────────────────────
export function generaDichiarazioneVolontarioDirigente(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const mese  = (dati as any).mese ?? '______________________'
  const spese = (dati.importo ?? 0).toFixed(2).replace('.', ',')

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">DICHIARAZIONE RIMBORSO SPESE — VOLONTARIO SPORTIVO<br>
      <span style="font-size:12px;font-weight:400;">Ruolo Dirigenziale — Mese di ${mese}</span>
    </h1>

    <div class="corpo">
      Il/La sottoscritto/a <strong>${nome}</strong>,
      C.F. <strong>${tesserato.codice_fiscale ?? '—'}</strong>,
      in qualità di volontario sportivo con ruolo dirigenziale presso
      <strong>${societa.nome}</strong>, per la stagione ${dati.stagione},
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <div class="corpo">
      di aver sostenuto nel mese di <strong>${mese}</strong> spese nell'interesse e per conto
      di <strong>${societa.nome}</strong> per un totale di <strong>€ ${spese}</strong>,
      come da documentazione allegata.
    </div>

    <div class="corpo">
      Le suddette spese sono rimborsabili ai sensi dell'art. 29, comma 2, del D.Lgs. 36/2021
      e non concorrono a formare il reddito imponibile entro il limite annuo di € 150,00.
    </div>

    <div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:40px;">
      <div class="firma-box">
        <div class="firma-label">Il Volontario</div>
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
  return wrapHtmlDocumento(corpo, `Dichiarazione Volontario Dirigente — ${nome}`)
}

// ── Dichiarazione Volontario Tecnico ─────────────────────────────────
export function generaDichiarazioneVolontarioTecnico(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const mese  = (dati as any).mese ?? '______________________'
  const spese = (dati.importo ?? 0).toFixed(2).replace('.', ',')

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">DICHIARAZIONE RIMBORSO SPESE — VOLONTARIO SPORTIVO<br>
      <span style="font-size:12px;font-weight:400;">Ruolo Tecnico — Mese di ${mese}</span>
    </h1>

    <div class="corpo">
      Il/La sottoscritto/a <strong>${nome}</strong>,
      C.F. <strong>${tesserato.codice_fiscale ?? '—'}</strong>,
      in qualità di volontario sportivo con ruolo tecnico (allenatore, istruttore) presso
      <strong>${societa.nome}</strong>, per la stagione ${dati.stagione},
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>DICHIARA</strong></div>

    <div class="corpo">
      di aver sostenuto nel mese di <strong>${mese}</strong> spese nell'interesse e per conto
      di <strong>${societa.nome}</strong> per un totale di <strong>€ ${spese}</strong>,
      come da documentazione allegata.
    </div>

    <div class="corpo">
      Le suddette spese sono rimborsabili ai sensi dell'art. 29, comma 2, del D.Lgs. 36/2021
      e non concorrono a formare il reddito imponibile entro il limite annuo di € 150,00.
    </div>

    <div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:40px;">
      <div class="firma-box">
        <div class="firma-label">Il Volontario Tecnico</div>
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
  return wrapHtmlDocumento(corpo, `Dichiarazione Volontario Tecnico — ${nome}`)
}
