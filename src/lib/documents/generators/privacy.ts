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

// ── Informativa GDPR ─────────────────────────────────────────────────
export function generaInformativaGDPR(dati: DatiGenerazione): string {
  const { societa, tesserato } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const federazione = (dati as any).federazione ?? 'Federazione Italiana Giuoco Calcio (FIGC)'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">INFORMATIVA SUL TRATTAMENTO DEI DATI PERSONALI<br>
      <span style="font-size:12px;font-weight:400;">Ai sensi degli artt. 13-14 del Regolamento UE 2016/679 (GDPR)</span>
    </h1>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:12px 0 6px;">
      1. Titolare del trattamento
    </div>
    <div class="corpo">
      <strong>${societa.nome}</strong>, C.F. ${societa.codice_fiscale ?? '—'},
      con sede in ${societa.citta}${societa.indirizzo ? `, ${societa.indirizzo}` : ''}.
      ${societa.pec ? `PEC: ${societa.pec}.` : ''}
      Affiliata alla <strong>${federazione}</strong>.
    </div>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:12px 0 6px;">
      2. Dati trattati
    </div>
    <div class="corpo">
      Dati anagrafici, di contatto, sanitari (certificati medici e idoneità sportiva),
      immagini e video, dati di pagamento e documentazione fiscale.
    </div>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:12px 0 6px;">
      3. Finalità e base giuridica
    </div>
    <div class="corpo">
      a) Gestione del rapporto associativo e sportivo (esecuzione contratto / rapporto associativo);<br>
      b) Adempimenti federali e di tesseramento (obbligo legale);<br>
      c) Adempimenti fiscali e previdenziali (obbligo legale);<br>
      d) Comunicazioni istituzionali (legittimo interesse);<br>
      e) Utilizzo di immagini e video per comunicazioni del club (consenso esplicito).
    </div>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:12px 0 6px;">
      4. Conservazione dei dati
    </div>
    <div class="corpo">
      I dati sono conservati per la durata del rapporto associativo e per i termini previsti
      dalla normativa fiscale (10 anni) e federale. I dati sanitari sono conservati per il
      periodo di validità del certificato medico.
    </div>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:12px 0 6px;">
      5. Destinatari dei dati
    </div>
    <div class="corpo">
      I dati possono essere comunicati a: federazioni sportive affiliate, CONI/Sport e Salute,
      istituti bancari per gestione pagamenti, commercialisti, enti previdenziali e assistenziali,
      autorità sanitarie (per certificati medici). I dati non vengono venduti a terzi.
    </div>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:12px 0 6px;">
      6. Diritti dell'interessato
    </div>
    <div class="corpo">
      L'interessato ha il diritto di: accesso, rettifica, cancellazione ("diritto all'oblio"),
      limitazione del trattamento, portabilità dei dati, opposizione al trattamento.
      Può proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali
      (www.garanteprivacy.it).
    </div>

    <div style="margin-top:24px;border-top:1px solid #ccc;padding-top:16px;">
      <div style="font-size:11px;font-weight:700;margin-bottom:8px;">FIRMA PER PRESA VISIONE</div>
      <div class="corpo">
        Il/La sottoscritto/a <strong>${nome}</strong> dichiara di aver ricevuto e letto
        la presente informativa.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:16px;">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#555;margin-bottom:4px;">
            ${tesserato.is_minorenne ? 'Firma genitore/tutore' : 'Firma del tesserato'}
          </div>
          <div style="height:55px;"></div>
          <div style="border-top:1px solid #ccc;"></div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:#555;">${societa.citta}, ${new Date().toLocaleDateString('it-IT')}</div>
        </div>
      </div>
    </div>
  `
  return wrapHtmlDocumento(corpo, `Informativa GDPR — ${nome}`)
}

// ── Liberatoria Privacy Foto e Video ─────────────────────────────────
export function generaLiberatoriaFotoVideo(dati: DatiGenerazione): string {
  const { societa, tesserato, genitore } = dati
  const nome = `${tesserato.nome} ${tesserato.cognome}`
  const firmatario = tesserato.is_minorenne && genitore
    ? `${genitore.nome} ${genitore.cognome}`
    : nome
  const qualita = tesserato.is_minorenne
    ? 'genitore/tutore legale'
    : 'atleta maggiorenne'

  const corpo = `
    ${intestazione(dati)}

    <h1 class="titolo-documento">LIBERATORIA — PRIVACY FOTO E VIDEO<br>
      <span style="font-size:12px;font-weight:400;">Ai sensi dell'art. 96 Legge 22.04.1941 n. 633 e GDPR 2016/679</span>
    </h1>

    <div class="corpo">
      Il/La sottoscritto/a <strong>${firmatario}</strong>,
      in qualità di ${qualita}${tesserato.is_minorenne ? ` dell'atleta <strong>${nome}</strong>` : ''},
    </div>

    <div class="corpo" style="margin:16px 0;"><strong>AUTORIZZA</strong></div>

    <div class="corpo">
      la società sportiva <strong>${societa.nome}</strong> a fotografare e riprendere
      ${tesserato.is_minorenne ? `il/la proprio/a figlio/a <strong>${nome}</strong>` : 'il/la sottoscritto/a'}
      durante le attività sportive, allenamenti, gare e manifestazioni organizzate dal club,
      e a utilizzare tali immagini e video per le seguenti finalità:
    </div>

    <ul style="margin:8px 0 12px 20px;line-height:2;">
      <li>Comunicazioni e aggiornamenti sui canali social ufficiali del club (Instagram, Facebook, YouTube, TikTok);</li>
      <li>Sito web ufficiale del club;</li>
      <li>Comunicati stampa e rassegne fotografiche;</li>
      <li>Materiale promozionale e divulgativo non a fini commerciali;</li>
      <li>Archivio storico del club.</li>
    </ul>

    <div class="corpo">
      Le immagini e i video non saranno ceduti a terzi né utilizzati per finalità commerciali
      senza esplicito e separato consenso. Il presente consenso può essere revocato in qualsiasi
      momento inviando comunicazione scritta a <strong>${societa.nome}</strong>.
    </div>

    <div class="corpo">
      La presente liberatoria ha validità per l'intera stagione sportiva ${dati.stagione}
      e si intende tacitamente rinnovata per le stagioni successive salvo revoca espressa.
    </div>

    <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:40px;">
      <div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#555;margin-bottom:4px;">
          Firma ${tesserato.is_minorenne ? 'genitore/tutore' : 'atleta'}
        </div>
        <div style="font-size:12px;margin-bottom:4px;">${firmatario}</div>
        <div style="height:55px;"></div>
        <div style="border-top:1px solid #ccc;"></div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#555;">${societa.citta}, ${new Date().toLocaleDateString('it-IT')}</div>
      </div>
    </div>
  `
  return wrapHtmlDocumento(corpo, `Liberatoria Foto e Video — ${nome}`)
}
