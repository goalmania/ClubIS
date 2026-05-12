import type { DatiGenerazione } from '../types'
import { wrapHtmlDocumento } from '../template-engine'

interface ConfigVisita {
  regione?: string | null
  asl?: string
  tipo: 'agonistica' | 'non_agonistica'
  destinatario: 'atleta' | 'tecnico'
  rifNormativo: 'balduzzi' | 'dm_1982'
  intestazione?: string | null
  tipiAffiliazione: string[]
  campiSocietaExtra: boolean
  notaLegale: boolean
  fascia_eta?: string
}

const RIF_NORMATIVI = {
  balduzzi: 'D.M. 24 aprile 2013 (c.d. "Balduzzi") e Decreto del Fare L. 98/2013 art. 42-bis',
  dm_1982:  'D.M. Sanità 18 febbraio 1982 e Circolare Ministeriale 31 gennaio 1983 n. 7',
}

const OPZIONI_AFFILIAZIONE: Record<string, string> = {
  federazione:          'Federazione Sportiva Nazionale',
  disciplina_associata: 'Disciplina Sportiva Associata',
  ente_promozione:      'Ente di Promozione Sportiva',
}

export function generaVisitaMedica(dati: DatiGenerazione, config: ConfigVisita): string {
  const { societa, tesserato } = dati

  const headerRegionale = config.intestazione
    ? `<div class="intestazione-regionale">${config.intestazione}</div>`
    : ''

  const titolo = config.tipo === 'agonistica'
    ? "RICHIESTA DI VISITA MEDICA PER L'IDONEITÀ SPORTIVA AGONISTICA"
    : "RICHIESTA DI VISITA MEDICA PER L'IDONEITÀ SPORTIVA NON AGONISTICA"

  const campiSocieta = config.campiSocietaExtra
    ? `<div class="griglia-dati">
        <div class="campo-dato"><div class="etichetta">Denominazione società</div><div class="valore">${societa.nome}</div></div>
        <div class="campo-dato"><div class="etichetta">Sede legale</div><div class="valore">${societa.indirizzo ?? ''}, ${societa.citta}</div></div>
        <div class="campo-dato"><div class="etichetta">Telefono</div><div class="valore">&nbsp;</div></div>
        <div class="campo-dato"><div class="etichetta">PEC</div><div class="valore">${societa.pec ?? ''}</div></div>
        <div class="campo-dato"><div class="etichetta">Codice fiscale</div><div class="valore">${societa.codice_fiscale ?? ''}</div></div>
        <div class="campo-dato"><div class="etichetta">Sport praticato</div><div class="valore">${dati.disciplina_sportiva ?? 'Calcio'}</div></div>
      </div>`
    : `<div class="corpo">
        La sottoscritta <strong>${societa.nome}</strong>, con sede in ${societa.citta},
        C.F. ${societa.codice_fiscale ?? '—'},
        sport praticato: <strong>${dati.disciplina_sportiva ?? 'Calcio'}</strong>,
      </div>`

  const checkboxAffiliazione = config.tipiAffiliazione.map(tipo => `
    <div class="checkbox-row">
      <div class="checkbox-box"></div>
      <span>${OPZIONI_AFFILIAZIONE[tipo] ?? tipo}</span>
    </div>`).join('')

  const titoloSezionePersona = config.destinatario === 'atleta'
    ? "DATI DELL'ATLETA"
    : 'DATI DEL TECNICO/DIRIGENTE'

  const dataNascitaFmt = tesserato.data_nascita
    ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT')
    : ''

  const campiPersona = `
    <div style="margin-bottom:16px;">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;color:#333">
        ${titoloSezionePersona}
      </div>
      <div class="griglia-dati">
        <div class="campo-dato"><div class="etichetta">Cognome</div><div class="valore">${tesserato.cognome}</div></div>
        <div class="campo-dato"><div class="etichetta">Nome</div><div class="valore">${tesserato.nome}</div></div>
        <div class="campo-dato"><div class="etichetta">Nato/a a</div><div class="valore">${tesserato.luogo_nascita ?? ''}</div></div>
        <div class="campo-dato"><div class="etichetta">Il</div><div class="valore">${dataNascitaFmt}</div></div>
        <div class="campo-dato"><div class="etichetta">Codice Fiscale</div><div class="valore">${tesserato.codice_fiscale ?? ''}</div></div>
        <div class="campo-dato"><div class="etichetta">Residente in</div><div class="valore">${tesserato.citta ?? ''} (${tesserato.provincia ?? ''})</div></div>
      </div>
    </div>`

  const tipoRichiesta = `
    <div style="margin-bottom:16px;">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;color:#333">
        TIPO DI RICHIESTA
      </div>
      <div class="checkbox-group">
        <div class="checkbox-row"><div class="checkbox-box"></div><span>Prima affiliazione</span></div>
        <div class="checkbox-row"><div class="checkbox-box"></div><span>Rinnovo annuale</span></div>
        <div class="checkbox-row"><div class="checkbox-box"></div><span>Cambio società</span></div>
      </div>
    </div>`

  const tipoAffiliazione = `
    <div style="margin-bottom:16px;">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;color:#333">
        AFFILIATA A
      </div>
      <div class="checkbox-group">${checkboxAffiliazione}</div>
    </div>`

  const notaLegale = config.notaLegale
    ? `<div class="nota-legale">
        <strong>N.B.</strong> La visita medica per l'idoneità sportiva agonistica viene effettuata ai sensi del
        ${RIF_NORMATIVI[config.rifNormativo]}.
        Il medico esaminatore è tenuto al rispetto delle disposizioni vigenti in materia di segreto professionale.
        I dati forniti saranno trattati nel rispetto del Regolamento UE 2016/679 (GDPR).
      </div>`
    : ''

  const logoHtml = societa.logo_url
    ? `<img src="${societa.logo_url}" alt="" style="height:50px;margin-bottom:8px;display:block;" onerror="this.style.display='none'"/>`
    : ''

  const corpo = `
    <div class="intestazione-club">
      <div>
        ${logoHtml}
        <div class="nome-club">${societa.nome}</div>
        <div class="dati-club">
          ${societa.citta}${societa.indirizzo ? ` · ${societa.indirizzo}` : ''}
          ${societa.codice_fiscale ? `<br>C.F. ${societa.codice_fiscale}` : ''}
        </div>
      </div>
      <div style="text-align:right;font-size:11px;color:#555;">
        <div style="font-weight:600;margin-bottom:4px;">RICHIESTA VISITA MEDICA</div>
        <div>Stagione ${dati.stagione}</div>
      </div>
    </div>

    ${headerRegionale}

    <h1 class="titolo-documento">${titolo}</h1>

    <div class="corpo">
      Il/La presidente della società sportiva <strong>${societa.nome}</strong>,
      con sede in <strong>${societa.citta}</strong>,
      C.F. <span class="campo">${societa.codice_fiscale ?? '—'}</span>,
      praticante la disciplina sportiva <span class="campo">${dati.disciplina_sportiva ?? 'Calcio'}</span>,
    </div>

    <div class="corpo"><strong>CHIEDE</strong></div>

    <div class="corpo">
      che l'atleta/tecnico sopra indicato/a sia sottoposto/a a visita medica per l'accertamento dell'idoneità
      all'attività sportiva <strong>${config.tipo === 'agonistica' ? 'AGONISTICA' : 'NON AGONISTICA'}</strong>.
    </div>

    ${campiPersona}
    ${tipoRichiesta}
    ${tipoAffiliazione}

    <div style="margin-top:20px;">
      <span style="font-size:12px;">Luogo e data: </span>
      <span class="campo" style="min-width:200px;">${societa.citta}, ___________________</span>
    </div>

    <div class="firma-grid">
      <div class="firma-box">
        <div class="firma-label">Il Presidente della Società</div>
        <div class="firma-nome">${societa.presidente_nome ?? '—'}</div>
        <div class="firma-spazio"></div>
        <div class="firma-linea"></div>
      </div>
    </div>

    ${notaLegale}
  `

  return wrapHtmlDocumento(corpo, `Richiesta Visita Medica — ${tesserato.cognome} ${tesserato.nome}`)
}
