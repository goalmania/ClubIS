-- Bug Fix 5: Aggiorna template HTML documenti_sistema con contenuto reale

-- Dichiarazione 730
UPDATE documenti_sistema SET template_html = '<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8">
<title>Dichiarazione 730</title>
<style>
  body{font-family:"Times New Roman",serif;font-size:13px;color:#000;background:white}
  .page{max-width:720px;margin:0 auto;padding:40px 50px}
  h1{text-align:center;font-size:15px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:20px}
  .campo{font-weight:bold;border-bottom:1px solid #000;display:inline-block;min-width:80px}
  .corpo{text-align:justify;line-height:2;margin-bottom:16px}
  .firma-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:50px}
  .firma-box{border-top:1px solid #000;padding-top:8px}
  @media print{.no-print{display:none!important}}
</style></head>
<body><div class="page">
<div class="no-print" style="text-align:right;margin-bottom:20px">
  <button onclick="window.print()" style="padding:8px 18px;background:#c8f000;color:#000;border:none;cursor:pointer;font-weight:bold">Stampa / PDF</button>
</div>
<div style="text-align:center;margin-bottom:24px">
  <strong style="font-size:18px">{{club_nome}}</strong><br>
  <span style="font-size:12px;color:#555">{{club_citta}} &middot; C.F. {{club_cf}}</span>
</div>
<h1>DICHIARAZIONE AI FINI DELLA DETRAZIONE FISCALE<br>
(Art. 15, comma 1, lett. i-quinquies del TUIR &mdash; Mod. 730)</h1>
<div class="corpo">
La società sportiva dilettantistica <span class="campo">{{club_nome}}</span>,
con sede in <span class="campo">{{club_citta}}</span>,
codice fiscale <span class="campo">{{club_cf}}</span>,
</div>
<div class="corpo"><strong>DICHIARA</strong></div>
<div class="corpo">
che <span class="campo">{{cognome}} {{nome}}</span>,
nato/a il <span class="campo">{{data_nascita}}</span>,
codice fiscale <span class="campo">{{codice_fiscale}}</span>,
ha versato per attività sportive dilettantistiche
per l''anno solare <span class="campo">{{anno}}</span>
la somma di <strong>&euro; <span class="campo">{{importo}}</span></strong>.
</div>
<div class="corpo">
La presente dichiarazione è rilasciata ai fini del Mod. 730/{{anno_prossimo}}
e non costituisce ricevuta di pagamento.
</div>
<div style="margin-top:20px">Luogo e data: <span class="campo" style="min-width:200px">{{club_citta}}, {{data_oggi}}</span></div>
<div class="firma-grid">
  <div class="firma-box">
    <div style="font-size:11px;text-transform:uppercase;color:#555">Il Rappresentante Legale</div>
    <div style="margin:4px 0">{{presidente_nome}}</div>
    <div style="height:55px"></div>
    <div style="border-top:1px solid #ccc;padding-top:4px;font-size:11px;color:#555">Firma</div>
  </div>
</div>
</div></body></html>'
WHERE slug = 'dichiarazione-730-auto';

-- Modulo iscrizione
UPDATE documenti_sistema SET template_html = '<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8">
<title>Modulo Iscrizione</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#000;background:white}
  .page{max-width:720px;margin:0 auto;padding:30px 40px}
  h1{text-align:center;font-size:16px;text-transform:uppercase;margin-bottom:20px}
  .sezione{margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #ddd}
  .sezione h2{font-size:13px;text-transform:uppercase;margin-bottom:12px;color:#333}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .campo-wrap{margin-bottom:8px}
  .label{font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#666;margin-bottom:3px}
  .valore{border-bottom:1px solid #999;min-height:20px;font-size:12px;padding:2px 0}
  .firma-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:30px}
  .firma-box{border-top:1px solid #000;padding-top:6px}
  @media print{.no-print{display:none!important}}
</style></head>
<body><div class="page">
<div class="no-print" style="text-align:right;margin-bottom:20px">
  <button onclick="window.print()" style="padding:8px 18px;background:#c8f000;color:#000;border:none;cursor:pointer;font-weight:bold">Stampa / PDF</button>
</div>
<div style="text-align:center;margin-bottom:20px">
  <strong style="font-size:18px">{{club_nome}}</strong><br>
  <span style="font-size:11px;color:#555">{{club_citta}}</span>
</div>
<h1>Modulo di iscrizione &mdash; Stagione {{stagione}}</h1>
<div class="sezione">
  <h2>Dati tesserato</h2>
  <div class="grid">
    <div class="campo-wrap"><div class="label">Cognome</div><div class="valore">{{cognome}}</div></div>
    <div class="campo-wrap"><div class="label">Nome</div><div class="valore">{{nome}}</div></div>
    <div class="campo-wrap"><div class="label">Data di nascita</div><div class="valore">{{data_nascita}}</div></div>
    <div class="campo-wrap"><div class="label">Luogo di nascita</div><div class="valore">{{luogo_nascita}}</div></div>
    <div class="campo-wrap"><div class="label">Codice fiscale</div><div class="valore">{{codice_fiscale}}</div></div>
    <div class="campo-wrap"><div class="label">Ruolo</div><div class="valore">{{ruolo}}</div></div>
  </div>
</div>
<div class="sezione">
  <h2>Responsabile legale / Genitore</h2>
  <div class="grid">
    <div class="campo-wrap"><div class="label">Cognome</div><div class="valore">{{genitore_cognome}}</div></div>
    <div class="campo-wrap"><div class="label">Nome</div><div class="valore">{{genitore_nome}}</div></div>
    <div class="campo-wrap"><div class="label">Email</div><div class="valore">{{genitore_email}}</div></div>
    <div class="campo-wrap"><div class="label">Telefono</div><div class="valore">{{genitore_telefono}}</div></div>
  </div>
</div>
<div class="sezione">
  <h2>Consensi</h2>
  <div style="margin-bottom:8px">&#9744; Acconsento al trattamento dei dati personali (GDPR 2016/679)</div>
  <div style="margin-bottom:8px">&#9744; Autorizzo la pubblicazione di foto/video ai fini sportivi</div>
  <div style="margin-bottom:8px">&#9744; Dichiaro di aver preso visione del regolamento associativo</div>
</div>
<div class="firma-grid">
  <div class="firma-box">
    <div style="font-size:10px;text-transform:uppercase;color:#555">Firma tesserato / genitore</div>
    <div style="height:50px"></div>
    <div style="border-top:1px solid #ccc"></div>
  </div>
  <div class="firma-box">
    <div style="font-size:10px;text-transform:uppercase;color:#555">Per la societ&agrave; &mdash; {{presidente_nome}}</div>
    <div style="height:50px"></div>
    <div style="border-top:1px solid #ccc"></div>
  </div>
</div>
<div style="margin-top:20px;font-size:10px;color:#888;text-align:center">
  Documento generato da CIS &mdash; {{data_oggi}}
</div>
</div></body></html>'
WHERE slug = 'modulo-iscrizione';

-- Privacy/GDPR
UPDATE documenti_sistema SET template_html = '<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8">
<title>Consenso Privacy</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#000;background:white}
  .page{max-width:720px;margin:0 auto;padding:30px 40px}
  h1{text-align:center;font-size:15px;text-transform:uppercase;margin-bottom:20px}
  h2{font-size:13px;margin-top:18px;margin-bottom:8px}
  p{line-height:1.8;margin-bottom:10px;text-align:justify}
  .firma-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px}
  .firma-box{border-top:1px solid #000;padding-top:6px}
  @media print{.no-print{display:none!important}}
</style></head>
<body><div class="page">
<div class="no-print" style="text-align:right;margin-bottom:20px">
  <button onclick="window.print()" style="padding:8px 18px;background:#c8f000;color:#000;border:none;cursor:pointer;font-weight:bold">Stampa / PDF</button>
</div>
<div style="text-align:center;margin-bottom:20px">
  <strong style="font-size:18px">{{club_nome}}</strong><br>
  <span style="font-size:11px;color:#555">{{club_citta}} &middot; C.F. {{club_cf}}</span>
</div>
<h1>CONSENSO AL TRATTAMENTO DEI DATI PERSONALI<br>
<span style="font-size:12px;font-weight:normal">(ai sensi del Regolamento UE 2016/679 &mdash; GDPR)</span></h1>
<h2>Titolare del trattamento</h2>
<p>{{club_nome}}, con sede in {{club_citta}}, C.F. {{club_cf}}.</p>
<h2>Finalit&agrave; del trattamento</h2>
<p>I dati personali del tesserato vengono raccolti e trattati per le seguenti finalit&agrave;:
gestione del tesseramento sportivo, comunicazioni interne al club, adempimenti FIGC/federativi,
fatturazione e adempimenti fiscali, pubblicazione di foto e video a fini sportivi (solo con consenso esplicito).</p>
<h2>Diritti dell''interessato</h2>
<p>Il sottoscritto ha diritto di accedere ai propri dati, richiederne la rettifica o la cancellazione,
opporsi al trattamento e richiedere la portabilit&agrave; dei dati, rivolgendosi al Titolare
all''indirizzo email {{email_club}}.</p>
<h2>Dichiarazione di consenso</h2>
<p>Il/La sottoscritto/a <strong>{{cognome}} {{nome}}</strong>,
nato/a il {{data_nascita}}, C.F. {{codice_fiscale}},</p>
<p>&#9744; <strong>ACCONSENTE</strong> al trattamento dei propri dati personali per le finalit&agrave; indicate.<br>
&#9744; <strong>ACCONSENTE</strong> alla pubblicazione di foto e video per finalit&agrave; sportive e promozionali.<br>
&#9744; <strong>NON ACCONSENTE</strong> alla pubblicazione di foto e video.</p>
<div class="firma-grid">
  <div class="firma-box">
    <div style="font-size:10px;text-transform:uppercase;color:#555">Luogo e data</div>
    <div style="margin:4px 0">{{club_citta}}, {{data_oggi}}</div>
  </div>
  <div class="firma-box">
    <div style="font-size:10px;text-transform:uppercase;color:#555">Firma dell''interessato / genitore</div>
    <div style="height:45px"></div>
    <div style="border-top:1px solid #ccc"></div>
  </div>
</div>
</div></body></html>'
WHERE slug IN ('privacy-gdpr', 'consenso-privacy', 'informativa-privacy');

-- Contratto prestazione sportiva
UPDATE documenti_sistema SET template_html = '<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8">
<title>Contratto Prestazione Sportiva</title>
<style>
  body{font-family:"Times New Roman",serif;font-size:13px;color:#000;background:white}
  .page{max-width:720px;margin:0 auto;padding:40px 50px}
  h1{text-align:center;font-size:15px;text-transform:uppercase;margin-bottom:24px}
  h2{font-size:13px;margin-top:20px;margin-bottom:8px;text-transform:uppercase}
  .corpo{line-height:2;text-align:justify;margin-bottom:12px}
  .campo{font-weight:bold;border-bottom:1px solid #000;display:inline-block;min-width:80px}
  .firma-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:60px}
  .firma-box{border-top:1px solid #000;padding-top:8px}
  @media print{.no-print{display:none!important}}
</style></head>
<body><div class="page">
<div class="no-print" style="text-align:right;margin-bottom:20px">
  <button onclick="window.print()" style="padding:8px 18px;background:#c8f000;color:#000;border:none;cursor:pointer;font-weight:bold">Stampa / PDF</button>
</div>
<div style="text-align:center;margin-bottom:20px">
  <strong style="font-size:18px">{{club_nome}}</strong><br>
  <span style="font-size:11px;color:#555">{{club_citta}} &middot; C.F. {{club_cf}}</span>
</div>
<h1>CONTRATTO DI PRESTAZIONE SPORTIVA DILETTANTISTICA</h1>
<div class="corpo">
Tra la societ&agrave; sportiva dilettantistica <span class="campo">{{club_nome}}</span>,
C.F. <span class="campo">{{club_cf}}</span>, rappresentata dal Sig./Sig.ra
<span class="campo">{{presidente_nome}}</span> in qualit&agrave; di Rappresentante Legale,
</div>
<div class="corpo">e il/la Sig./Sig.ra <span class="campo">{{cognome}} {{nome}}</span>,
nato/a il <span class="campo">{{data_nascita}}</span>,
C.F. <span class="campo">{{codice_fiscale}}</span>,
</div>
<div class="corpo"><strong>si conviene e si stipula quanto segue:</strong></div>
<h2>Art. 1 &mdash; Oggetto</h2>
<div class="corpo">Il/La tesserato/a si impegna a prestare attivit&agrave; sportiva
dilettantistica in favore della societ&agrave; per la stagione sportiva <span class="campo">{{stagione}}</span>.</div>
<h2>Art. 2 &mdash; Compenso</h2>
<div class="corpo">A titolo di rimborso spese, la societ&agrave; corrisponder&agrave;
un compenso mensile di &euro; <span class="campo">{{importo_mensile}}</span>,
per un totale stagionale di &euro; <span class="campo">{{importo_totale}}</span>.</div>
<h2>Art. 3 &mdash; Durata</h2>
<div class="corpo">Il presente contratto decorre dal <span class="campo">{{data_inizio}}</span>
al <span class="campo">{{data_fine}}</span>.</div>
<h2>Art. 4 &mdash; Norme applicabili</h2>
<div class="corpo">Per quanto non previsto dal presente contratto si applicano
le norme del CONI, della FIGC e dello Statuto associativo.</div>
<div style="margin-top:20px">Letto, approvato e sottoscritto in <span class="campo">{{club_citta}}</span>,
il <span class="campo">{{data_oggi}}</span>.</div>
<div class="firma-grid">
  <div class="firma-box">
    <div style="font-size:11px;text-transform:uppercase;color:#555">Il Rappresentante Legale<br>{{presidente_nome}}</div>
    <div style="height:55px"></div>
    <div style="border-top:1px solid #ccc"></div>
  </div>
  <div class="firma-box">
    <div style="font-size:11px;text-transform:uppercase;color:#555">Il/La tesserato/a<br>{{cognome}} {{nome}}</div>
    <div style="height:55px"></div>
    <div style="border-top:1px solid #ccc"></div>
  </div>
</div>
</div></body></html>'
WHERE slug IN ('contratto-prestazione-sportiva', 'contratto-collaborazione');

-- Template generico per tutti i documenti senza template HTML valorizzato
UPDATE documenti_sistema SET template_html = '<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8">
<title>Documento</title>
<style>
  body{font-family:"Times New Roman",serif;font-size:13px;color:#000;background:white}
  .page{max-width:720px;margin:0 auto;padding:40px 50px}
  h1{text-align:center;font-size:15px;text-transform:uppercase;margin-bottom:24px}
  .corpo{line-height:2;text-align:justify;margin-bottom:16px}
  .campo{font-weight:bold;border-bottom:1px solid #000;display:inline-block;min-width:80px}
  .firma-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:60px}
  .firma-box{border-top:1px solid #000;padding-top:8px}
  @media print{.no-print{display:none!important}}
</style></head>
<body><div class="page">
<div class="no-print" style="text-align:right;margin-bottom:20px">
  <button onclick="window.print()" style="padding:8px 18px;background:#c8f000;color:#000;border:none;cursor:pointer;font-weight:bold">Stampa / PDF</button>
</div>
<div style="text-align:center;margin-bottom:20px">
  <strong style="font-size:18px">{{club_nome}}</strong><br>
  <span style="font-size:11px;color:#555">{{club_citta}} &middot; C.F. {{club_cf}}</span>
</div>
<h1>{{nome_documento}}</h1>
<div class="corpo">
Il/La sottoscritto/a <span class="campo">{{cognome}} {{nome}}</span>,
nato/a il <span class="campo">{{data_nascita}}</span>,
codice fiscale <span class="campo">{{codice_fiscale}}</span>,
tesserato/a con la societ&agrave; <span class="campo">{{club_nome}}</span>
per la stagione <span class="campo">{{stagione}}</span>,
</div>
<div class="corpo">[TESTO SPECIFICO DEL DOCUMENTO]</div>
<div style="margin-top:20px">
  Luogo e data: <span class="campo" style="min-width:180px">{{club_citta}}, {{data_oggi}}</span>
</div>
<div class="firma-grid">
  <div class="firma-box">
    <div style="font-size:11px;text-transform:uppercase;color:#555">Firma del tesserato / genitore</div>
    <div style="height:55px"></div>
    <div style="border-top:1px solid #ccc"></div>
  </div>
  <div class="firma-box">
    <div style="font-size:11px;text-transform:uppercase;color:#555">Per la societ&agrave; &mdash; {{presidente_nome}}</div>
    <div style="height:55px"></div>
    <div style="border-top:1px solid #ccc"></div>
  </div>
</div>
</div></body></html>'
WHERE template_html IS NULL OR template_html = '' OR template_html = '<html>..template..</html>';
