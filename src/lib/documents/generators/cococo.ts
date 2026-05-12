import type { DatiGenerazione } from '../types'
import { wrapHtmlDocumento } from '../template-engine'

type TipoCoCoCo = 'atleti' | 'tecnico' | 'amministrativo' | 'figc_atleti' | 'figc_tecnico'

const TITOLI_COCOCO: Record<TipoCoCoCo, string> = {
  atleti:         'CONTRATTO DI COLLABORAZIONE COORDINATA E CONTINUATIVA — ATLETA SPORTIVO',
  tecnico:        'CONTRATTO DI COLLABORAZIONE COORDINATA E CONTINUATIVA — LAVORATORE SPORTIVO (TECNICO)',
  amministrativo: 'CONTRATTO DI COLLABORAZIONE COORDINATA E CONTINUATIVA — COLLABORATORE AMMINISTRATIVO-GESTIONALE',
  figc_atleti:    'CONTRATTO DI COLLABORAZIONE COORDINATA E CONTINUATIVA — ATLETA FIGC',
  figc_tecnico:   'CONTRATTO DI COLLABORAZIONE COORDINATA E CONTINUATIVA — LAVORATORE SPORTIVO FIGC',
}

const NOTE_FIGC: Partial<Record<TipoCoCoCo, string>> = {
  figc_atleti:  'Il presente contratto è conforme ai modelli condivisi dalla F.I.G.C. per i propri tesserati.',
  figc_tecnico: 'Il presente contratto è conforme ai modelli condivisi dalla F.I.G.C. per i propri tecnici.',
}

export function generaCoCoCo(dati: DatiGenerazione, tipo: TipoCoCoCo): string {
  const { societa, tesserato } = dati
  const isFIGC = tipo.startsWith('figc_')
  const isAtleta = tipo.includes('atleti')

  const dataNascitaFmt = tesserato.data_nascita
    ? new Date(tesserato.data_nascita).toLocaleDateString('it-IT')
    : '—'

  const ruoloCollaboratore = isAtleta
    ? `svolgere attività sportiva dilettantistica in qualità di atleta praticante la disciplina sportiva di <span class="campo">${dati.disciplina_sportiva ?? 'Calcio'}</span>`
    : `prestare la propria opera in qualità di ${tipo === 'tecnico' || tipo === 'figc_tecnico' ? 'tecnico sportivo' : 'collaboratore amministrativo-gestionale'}`

  const noteEsenzioneFiscale = dati.compenso_lordo
    ? (dati.compenso_lordo <= 5000
        ? "Il compenso rientra nella soglia di esenzione fiscale di &euro;5.000,00 (D.Lgs. 36/2021 art. 36 co. 1) &mdash; nessuna ritenuta d'acconto applicata."
        : "Per la parte eccedente &euro;5.000,00, si applica la ritenuta d'acconto del 23% ai sensi del D.Lgs. 36/2021.")
    : ''

  const corpo = `
    <div class="intestazione-club">
      <div>
        <div class="nome-club">${societa.nome}</div>
        <div class="dati-club">
          ${societa.citta} &middot; C.F. ${societa.codice_fiscale ?? '—'}
        </div>
      </div>
    </div>

    <h1 class="titolo-documento">${TITOLI_COCOCO[tipo]}</h1>

    ${isFIGC && NOTE_FIGC[tipo]
      ? `<div style="text-align:center;font-size:11px;color:#555;margin-bottom:20px;font-style:italic;">${NOTE_FIGC[tipo]}</div>`
      : ''}

    <div class="corpo">
      <strong>TRA</strong><br>
      La società sportiva <span class="campo">${societa.nome}</span>,
      con sede in <span class="campo">${societa.citta}</span>,
      codice fiscale <span class="campo">${societa.codice_fiscale ?? '—'}</span>,
      partita IVA <span class="campo">${societa.partita_iva ?? '—'}</span>,
      in persona del Presidente <span class="campo">${societa.presidente_nome ?? '—'}</span>,
      di seguito denominata "Committente",
    </div>

    <div class="corpo">
      <strong>E</strong><br>
      Il/La sig./sig.ra <span class="campo">${tesserato.cognome} ${tesserato.nome}</span>,
      nato/a a <span class="campo">${tesserato.luogo_nascita ?? '—'}</span>
      il <span class="campo">${dataNascitaFmt}</span>,
      codice fiscale <span class="campo">${tesserato.codice_fiscale ?? '—'}</span>,
      residente in <span class="campo">${tesserato.citta ?? '—'}</span>,
      di seguito denominato/a "Collaboratore",
    </div>

    <div class="corpo"><strong>SI CONVIENE E SI STIPULA QUANTO SEGUE</strong></div>

    <div class="corpo">
      <strong>Art. 1 &mdash; Oggetto</strong><br>
      Il Committente affida al Collaboratore, che accetta, l'incarico di
      ${ruoloCollaboratore},
      ai sensi del D.Lgs. 36/2021 e successive modificazioni (Riforma dello Sport).
    </div>

    <div class="corpo">
      <strong>Art. 2 &mdash; Durata</strong><br>
      Il presente contratto ha la durata della stagione sportiva <span class="campo">${dati.stagione}</span>,
      con decorrenza da <span class="campo">_______________</span> fino al <span class="campo">_______________</span>,
      salvo diverso accordo tra le parti.
    </div>

    <div class="corpo">
      <strong>Art. 3 &mdash; Compenso</strong><br>
      Per lo svolgimento dell'attività di cui all'art. 1, il Committente corrisponderà al Collaboratore
      un compenso lordo di <strong>&euro; <span class="campo">${dati.compenso_lordo ? dati.compenso_lordo.toFixed(2).replace('.', ',') : '_______________'}</span></strong>
      ${dati.compenso_lordo ? `(importo netto: &euro; ${(dati.compenso_netto ?? 0).toFixed(2).replace('.', ',')})` : ''},
      corrisposto con le seguenti modalità: <span class="campo">_______________</span>.
      ${noteEsenzioneFiscale ? `<br><br>${noteEsenzioneFiscale}` : ''}
    </div>

    <div class="corpo">
      <strong>Art. 4 &mdash; Obblighi del Collaboratore</strong><br>
      Il Collaboratore si impegna a svolgere le prestazioni con diligenza, professionalità e nel rispetto
      del Regolamento interno della società e delle norme federali applicabili.
      Il Collaboratore è tenuto a mantenere la riservatezza sulle informazioni societarie.
    </div>

    <div class="corpo">
      <strong>Art. 5 &mdash; Trattamento dati personali</strong><br>
      I dati personali del Collaboratore sono trattati dalla società nel rispetto del Regolamento UE
      2016/679 (GDPR) e del D.Lgs. 196/2003, esclusivamente per le finalità connesse al presente contratto.
    </div>

    <div style="margin-top:20px;">
      Luogo e data: <span class="campo" style="min-width:200px;">${societa.citta}, ___________________</span>
    </div>

    <div class="firma-grid">
      <div class="firma-box">
        <div class="firma-label">Il Collaboratore</div>
        <div class="firma-nome">${tesserato.cognome} ${tesserato.nome}</div>
        <div class="firma-spazio"></div>
        <div class="firma-linea"></div>
      </div>
      <div class="firma-box">
        <div class="firma-label">Per il Committente &mdash; Il Presidente</div>
        <div class="firma-nome">${societa.presidente_nome ?? '—'}</div>
        <div class="firma-spazio"></div>
        <div class="firma-linea"></div>
      </div>
    </div>
  `

  return wrapHtmlDocumento(corpo,
    `${TITOLI_COCOCO[tipo]} — ${tesserato.cognome} ${tesserato.nome}`)
}
