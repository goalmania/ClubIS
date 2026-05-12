import { formatData, formatEuro } from '@/lib/helpers'
import type { DatiGenerazione } from './types'

export function renderTemplate(templateHtml: string, dati: DatiGenerazione): string {
  const PLACEHOLDER_MAP: Record<string, string> = {
    // Società
    '{{club_nome}}':          dati.societa.nome,
    '{{club_nome_esteso}}':   dati.societa.nome_esteso ?? dati.societa.nome,
    '{{club_citta}}':         dati.societa.citta,
    '{{club_indirizzo}}':     dati.societa.indirizzo ?? '—',
    '{{club_cf}}':            dati.societa.codice_fiscale ?? '—',
    '{{club_piva}}':          dati.societa.partita_iva ?? '—',
    '{{club_pec}}':           dati.societa.pec ?? '—',
    '{{club_iban}}':          dati.societa.iban ?? '—',
    '{{presidente_nome}}':    dati.societa.presidente_nome ?? '—',
    '{{presidente_cf}}':      dati.societa.presidente_cf ?? '—',
    '{{club_logo}}':          dati.societa.logo_url ?? '',

    // Tesserato
    '{{nome}}':               dati.tesserato.nome,
    '{{cognome}}':            dati.tesserato.cognome,
    '{{nome_completo}}':      `${dati.tesserato.cognome} ${dati.tesserato.nome}`,
    '{{data_nascita}}':       formatData(dati.tesserato.data_nascita),
    '{{luogo_nascita}}':      dati.tesserato.luogo_nascita ?? '—',
    '{{codice_fiscale}}':     dati.tesserato.codice_fiscale ?? '—',
    '{{tessera_figc}}':       dati.tesserato.codice_tessera_figc ?? '—',
    '{{ruolo}}':              dati.tesserato.ruolo_principale?.replace(/_/g, ' ') ?? '—',
    '{{nazionalita}}':        dati.tesserato.nazionalita_paese ?? 'Italia',
    '{{indirizzo_atleta}}':   dati.tesserato.indirizzo ?? '—',
    '{{citta_atleta}}':       dati.tesserato.citta ?? '—',
    '{{cap_atleta}}':         dati.tesserato.cap ?? '—',
    '{{provincia_atleta}}':   dati.tesserato.provincia ?? '—',

    // Genitore
    '{{genitore_nome}}':      dati.genitore?.nome ?? '—',
    '{{genitore_cognome}}':   dati.genitore?.cognome ?? '—',
    '{{genitore_nome_completo}}': dati.genitore
      ? `${dati.genitore.cognome} ${dati.genitore.nome}` : '—',
    '{{genitore_cf}}':        dati.genitore?.codice_fiscale ?? '—',
    '{{genitore_relazione}}': dati.genitore?.relazione ?? 'genitore',

    // Date e stagione
    '{{stagione}}':           dati.stagione,
    '{{data_oggi}}':          new Date().toLocaleDateString('it-IT'),
    '{{anno}}':               dati.anno.toString(),
    '{{anno_prossimo}}':      (dati.anno + 1).toString(),
    '{{mese}}':               dati.mese ?? '',

    // Finanziari
    '{{importo}}':            dati.importo ? `${dati.importo.toFixed(2).replace('.', ',')}` : '0,00',
    '{{importo_euro}}':       dati.importo ? formatEuro(dati.importo) : '€ 0,00',
    '{{compenso_lordo}}':     dati.compenso_lordo ? dati.compenso_lordo.toFixed(2).replace('.', ',') : '0,00',
    '{{compenso_netto}}':     dati.compenso_netto ? dati.compenso_netto.toFixed(2).replace('.', ',') : '0,00',
    '{{compenso_ritenuta}}':  dati.compenso_ritenuta ? dati.compenso_ritenuta.toFixed(2).replace('.', ',') : '0,00',

    // Campi extra
    '{{disciplina_sportiva}}': dati.disciplina_sportiva ?? 'Calcio',
    '{{tipo_contratto}}':      dati.tipo_contratto ?? '—',
  }

  let risultato = templateHtml

  Object.entries(PLACEHOLDER_MAP).forEach(([placeholder, valore]) => {
    risultato = risultato.replaceAll(placeholder, valore)
  })

  // Placeholder non trovati → trattino
  risultato = risultato.replace(/\{\{[^}]+\}\}/g, '—')

  return risultato
}

export const CSS_BASE_DOCUMENTO = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', 'Times New Roman', serif;
    font-size: 13px;
    color: #1a1a1a;
    background: white;
    line-height: 1.6;
  }

  .page {
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 50px;
  }

  .intestazione-club {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 20px;
    border-bottom: 2px solid #1a1a1a;
    margin-bottom: 28px;
  }

  .intestazione-club .nome-club {
    font-family: serif;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  .intestazione-club .dati-club {
    font-size: 11px;
    color: #555;
    margin-top: 4px;
    line-height: 1.5;
  }

  .intestazione-regionale {
    text-align: center;
    font-weight: bold;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
    color: #333;
  }

  h1.titolo-documento {
    text-align: center;
    font-size: 14px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 24px;
    line-height: 1.4;
  }

  .corpo { text-align: justify; line-height: 2; margin-bottom: 14px; }
  .campo { font-weight: 600; border-bottom: 1px solid #1a1a1a; display: inline-block; min-width: 60px; }

  .checkbox-group { margin-bottom: 16px; }
  .checkbox-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
  .checkbox-box { width: 14px; height: 14px; border: 1px solid #333; flex-shrink: 0; margin-top: 2px; }

  .griglia-dati { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 16px; }
  .campo-dato { padding: 8px 0; border-bottom: 1px solid #eee; }
  .campo-dato .etichetta { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #777; margin-bottom: 3px; }
  .campo-dato .valore { font-size: 12px; border-bottom: 1px solid #999; min-height: 18px; padding-bottom: 2px; }

  .firma-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 50px; }
  .firma-box { border-top: 1px solid #1a1a1a; padding-top: 8px; }
  .firma-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #555; margin-bottom: 3px; }
  .firma-nome { font-size: 12px; margin-bottom: 4px; }
  .firma-spazio { height: 55px; }
  .firma-linea { border-top: 1px solid #ccc; }

  .nota-legale { font-size: 10px; color: #555; margin-top: 20px; padding-top: 12px; border-top: 1px solid #ddd; line-height: 1.5; }

  .footer-doc { margin-top: 30px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 9px; color: #aaa; text-align: center; }

  @media print {
    .no-print { display: none !important; }
    @page { margin: 1.5cm; size: A4; }
  }
`

export function wrapHtmlDocumento(corpo: string, titoloPagina: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titoloPagina}</title>
  <style>${CSS_BASE_DOCUMENTO}</style>
</head>
<body>
  <div class="page">
    <div class="no-print" style="text-align:right;margin-bottom:20px;">
      <button onclick="window.print()" style="padding:9px 20px;background:#c8f000;color:#000;border:none;cursor:pointer;font-family:sans-serif;font-weight:600;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;">
        &#8998; Stampa / Salva PDF
      </button>
    </div>
    ${corpo}
    <div class="footer-doc">
      Documento generato da ClubIS &mdash; The Intelligence System &middot; ${new Date().toLocaleDateString('it-IT')}
    </div>
  </div>
</body>
</html>`
}
