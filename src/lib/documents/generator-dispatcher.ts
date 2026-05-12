import type { DatiGenerazione } from './types'
import { generaVisitaMedica }        from './generators/visita-medica'
import { generaDichiarazione730 }    from './generators/dichiarazione-730'
import { generaCoCoCo }              from './generators/cococo'
import { renderTemplate }            from './template-engine'

import {
  generaAttestazionePagamento,
  generaBandoDoteSport,
  generaDichiarazioneCompensiAnno,
  generaDichiarazioneCompensiStagione,
  generaBandoLazio,
  generaFondoDoteFamiglia,
} from './generators/bandi-attestazioni'

import {
  generaAutorizzazioneTrasporto,
  generaAutorizzazioneUscitaAutonoma,
  generaDichiarazioneRespManleva,
  generaPrestazioneVolontariaMagg,
  generaPrestazioneVolontariaMin,
  generaDichiarazioneCasellario,
} from './generators/autorizzazioni'

import {
  generaRichiestaPA,
  generaRichiestaCertificatoContestuale,
  generaRichiestaIscrizioneScolastica,
  generaRichiestaStoricoResidenza,
  generaNullaOsta,
  generaCertificazioneCrediti,
} from './generators/richieste'

import {
  generaSchedaAtleta,
  generaModuloIscrizione,
  generaDomandaSocio,
  generaConvocazioneSoci,
  generaModuloGiustificazioneAssenza,
  generaModuloUrineReggioEmilia,
  generaDichiarazioneVolontarioDirigente,
  generaDichiarazioneVolontarioTecnico,
} from './generators/moduli'

import {
  generaInformativaGDPR,
  generaLiberatoriaFotoVideo,
} from './generators/privacy'

// ── Config VM Balduzzi standard ───────────────────────────────────────
const VM_CONFIG_BASE = {
  tipo:                'agonistica' as const,
  destinatario:        'atleta'     as const,
  rifNormativo:        'balduzzi'   as const,
  tipiAffiliazione:    ['federazione'],
  campiSocietaExtra:   false,
  notaLegale:          false,
}

export async function generaDocumento(
  documentoId: string,
  varianteId:  string | null,
  configVariante: Record<string, unknown>,
  dati: DatiGenerazione,
  templateHtml?: string
): Promise<string> {

  switch (documentoId) {

    // ── VISITE MEDICHE ─────────────────────────────────────────────────
    case 'visita-medica':           // compat con vecchio ID
    case 'vm-agonistica':
      return generaVisitaMedica(dati, {
        ...VM_CONFIG_BASE,
        regione: (configVariante.regione as string | null) ?? null,
        intestazione: configVariante.regione
          ? `Regione ${configVariante.regione}`
          : null,
      } as any)

    case 'vm-agonistica-sardegna':
      return generaVisitaMedica(dati, {
        tipo: 'agonistica', destinatario: 'atleta',
        rifNormativo: 'dm_1982', tipiAffiliazione: ['federazione', 'disciplina_associata', 'ente_promozione'],
        campiSocietaExtra: true, notaLegale: false,
        intestazione: 'Regione Sardegna',
      } as any)

    case 'vm-non-agonistica':
      return generaVisitaMedica(dati, {
        ...VM_CONFIG_BASE,
        tipo: 'non_agonistica',
        rifNormativo: 'dm_1982',
      } as any)

    case 'modulo-urine':
      return generaModuloUrineReggioEmilia(dati)

    // ── RIFORMA SPORT ──────────────────────────────────────────────────
    case 'cococo-atleti':
    case 'cococo-figc-atleti':
      return generaCoCoCo(dati, 'figc_atleti')

    case 'cococo-tecnico':
    case 'cococo-figc-tecnico':
      return generaCoCoCo(dati, 'figc_tecnico')

    case 'cococo-sport':
    case 'cococo-amministrativo':
      return generaCoCoCo(dati, 'amministrativo')

    case 'richiesta-pa':
      return generaRichiestaPA(dati)

    case 'dichiarazione-volontario-dirigente':
      return generaDichiarazioneVolontarioDirigente(dati)

    case 'dichiarazione-volontario-tecnico':
      return generaDichiarazioneVolontarioTecnico(dati)

    // ── DICHIARAZIONI FISCALI ──────────────────────────────────────────
    case 'dichiarazione-730':
      return generaDichiarazione730(dati, configVariante as any)

    case 'attestazione-pagamento':
      return generaAttestazionePagamento(dati)

    case 'bando-dote-sport-2025':
      return generaBandoDoteSport(dati, 2025)

    case 'bando-dote-sport-2026':
      return generaBandoDoteSport(dati, 2026)

    case 'dichiarazione-compensi-anno':
      return generaDichiarazioneCompensiAnno(dati)

    case 'dichiarazione-compensi-stagione':
      return generaDichiarazioneCompensiStagione(dati)

    case 'bando-lazio':
      return generaBandoLazio(dati)

    case 'fondo-dote-famiglia-2025':
      return generaFondoDoteFamiglia(dati)

    // ── ISCRIZIONI E TESSERAMENTI ──────────────────────────────────────
    case 'modulo-iscrizione':
      return generaModuloIscrizione(dati)

    case 'nulla-osta':
      return generaNullaOsta(dati)

    case 'scheda-atleta':
      return generaSchedaAtleta(dati)

    case 'domanda-socio':
      return generaDomandaSocio(dati)

    case 'convocazione-soci':
      return generaConvocazioneSoci(dati)

    // ── CERTIFICAZIONI SCOLASTICHE ─────────────────────────────────────
    case 'richiesta-iscrizione-scolastica':
      return generaRichiestaIscrizioneScolastica(dati)

    case 'modulo-giustificazione-assenza':
      return generaModuloGiustificazioneAssenza(dati)

    case 'richiesta-certificato-contestuale':
      return generaRichiestaCertificatoContestuale(dati)

    case 'richiesta-storico-residenza':
      return generaRichiestaStoricoResidenza(dati)

    case 'certificazione-crediti':
      return generaCertificazioneCrediti(dati)

    // ── AUTORIZZAZIONI E CONSENSI ──────────────────────────────────────
    case 'autorizzazione-trasporto':
      return generaAutorizzazioneTrasporto(dati)

    case 'autorizzazione-uscita-autonoma':
      return generaAutorizzazioneUscitaAutonoma(dati)

    case 'dichiarazione-resp-manleva':
      return generaDichiarazioneRespManleva(dati)

    case 'prestazione-volontaria-maggiorenni':
      return generaPrestazioneVolontariaMagg(dati)

    case 'prestazione-volontaria-minorenni':
      return generaPrestazioneVolontariaMin(dati)

    case 'dichiarazione-casellario':
      return generaDichiarazioneCasellario(dati)

    // ── PRIVACY E GDPR ─────────────────────────────────────────────────
    case 'informativa-gdpr':
      return generaInformativaGDPR(dati)

    case 'liberatoria-foto-video':
      return generaLiberatoriaFotoVideo(dati)

    // ── FALLBACK ───────────────────────────────────────────────────────
    default:
      if (templateHtml) return renderTemplate(templateHtml, dati)
      return `<!DOCTYPE html><html lang="it"><body style="font-family:sans-serif;padding:40px;">
        <p>Template per "<strong>${documentoId}</strong>" non ancora disponibile.</p>
      </body></html>`
  }
}
