import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { rata_id: string } }
) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: rata, error } = await supabase
    .from('rate_pagamento')
    .select(`
      id, numero_rata, importo, scadenza, stato,
      data_pagamento, metodo_pagamento, ricevuta_numero, note,
      sconto_id, sconto_importo, importo_originale, importo_scontato,
      piano_id(
        descrizione, importo_totale,
        famiglie(nome, cognome, codice_fiscale),
        giocatori(nome, cognome, codice_fiscale),
        club_id
      )
    `)
    .eq('id', params.rata_id)
    .single()

  if (error || !rata) return NextResponse.json({ error: 'Rata non trovata' }, { status: 404 })

  const piano = (rata as any).piano_id
  const famiglia = piano?.famiglie
  const giocatore = piano?.giocatori
  const clubId = piano?.club_id

  const { data: club } = await supabase
    .from('clubs')
    .select('nome, nome_esteso, citta, indirizzo, codice_fiscale, piva, iban, email_ufficiale')
    .eq('id', clubId)
    .single()

  // Sconto info
  const hasSconto = (rata as any).sconto_id && Number((rata as any).sconto_importo) > 0
  let scontoNome = ''
  if (hasSconto) {
    const { data: scontoData } = await supabase
      .from('sconti_listino')
      .select('nome')
      .eq('id', (rata as any).sconto_id)
      .single()
    scontoNome = scontoData?.nome ?? 'Sconto'
  }
  const importoOriginale = Number((rata as any).importo_originale ?? rata.importo)
  const importoScontato = Number((rata as any).importo_scontato ?? rata.importo)
  const scontoImporto = Number((rata as any).sconto_importo ?? 0)

  const importoFmt = Number(rata.importo).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
  const dataPagFmt = rata.data_pagamento
    ? new Date(rata.data_pagamento).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'
  const metodoLabel: Record<string, string> = {
    contanti: 'Contanti', bonifico: 'Bonifico bancario', stripe: 'Pagamento online (Stripe)', altro: 'Altro',
  }

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>Ricevuta ${rata.ricevuta_numero ?? ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #111; background: white; padding: 40px; max-width: 680px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #111; margin-bottom: 28px; }
    .club-name { font-size: 20px; font-weight: 700; }
    .club-sub { font-size: 11px; color: #666; margin-top: 4px; }
    .ricevuta-label { text-align: right; }
    .ricevuta-label .num { font-size: 22px; font-weight: 700; color: #111; }
    .ricevuta-label .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 10px; font-weight: 600; }
    .row { display: flex; gap: 16px; margin-bottom: 6px; }
    .lbl { font-size: 11px; color: #888; min-width: 140px; }
    .val { font-size: 13px; font-weight: 500; }
    .importo-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px 20px; margin: 24px 0; display: flex; justify-content: space-between; align-items: center; }
    .importo-box .amount { font-size: 28px; font-weight: 700; color: #16a34a; }
    .importo-box .causale { font-size: 12px; color: #555; }
    .firme { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 60px; }
    .firma-line { border-top: 1px solid #111; padding-top: 8px; font-size: 10px; color: #888; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; font-size: 10px; color: #999; text-align: center; }
    @media print {
      body { padding: 20px; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="club-name">${club?.nome ?? 'Club'}</div>
      ${club?.nome_esteso ? `<div class="club-sub">${club.nome_esteso}</div>` : ''}
      ${club?.indirizzo ? `<div class="club-sub">${club.indirizzo}${club.citta ? ', ' + club.citta : ''}</div>` : (club?.citta ? `<div class="club-sub">${club.citta}</div>` : '')}
      ${club?.codice_fiscale ? `<div class="club-sub">C.F.: ${club.codice_fiscale}</div>` : ''}
      ${club?.piva ? `<div class="club-sub">P.IVA: ${club.piva}</div>` : ''}
    </div>
    <div class="ricevuta-label">
      <div class="lbl">Ricevuta n.</div>
      <div class="num">${rata.ricevuta_numero ?? '—'}</div>
      <div class="club-sub" style="margin-top:6px;">${dataPagFmt}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dati del pagante</div>
    <div class="row"><span class="lbl">Nominativo</span><span class="val">${famiglia?.cognome ?? ''} ${famiglia?.nome ?? ''}</span></div>
    ${famiglia?.codice_fiscale ? `<div class="row"><span class="lbl">Codice fiscale</span><span class="val">${famiglia.codice_fiscale}</span></div>` : ''}
    <div class="row"><span class="lbl">Per conto di</span><span class="val">${giocatore?.cognome ?? ''} ${giocatore?.nome ?? ''}</span></div>
    ${giocatore?.codice_fiscale ? `<div class="row"><span class="lbl">C.F. tesserato</span><span class="val">${giocatore.codice_fiscale}</span></div>` : ''}
  </div>

  <div class="importo-box">
    <div class="causale">
      <div style="font-weight:600; margin-bottom:4px;">${piano?.descrizione ?? 'Quota associativa'}</div>
      <div>Rata n. ${rata.numero_rata} — ${metodoLabel[rata.metodo_pagamento ?? ''] ?? rata.metodo_pagamento ?? '—'}</div>
      ${rata.note ? `<div style="margin-top:4px; font-style:italic;">${rata.note}</div>` : ''}
    </div>
    <div class="amount">${importoFmt}</div>
  </div>

  ${hasSconto ? `
  <div style="border-top:1px solid #eee;padding-top:10px;margin-top:10px;">
    <div style="display:flex;justify-content:space-between;font-size:13px;color:#666;margin-bottom:4px;">
      <span>Importo originale:</span>
      <span>€${importoOriginale.toFixed(2)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:13px;color:#16a34a;margin-bottom:4px;">
      <span>Sconto applicato (${scontoNome}):</span>
      <span>- €${scontoImporto.toFixed(2)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;margin-top:6px;padding-top:6px;border-top:1px solid #eee;">
      <span>Importo da pagare:</span>
      <span>€${importoScontato.toFixed(2)}</span>
    </div>
  </div>` : ''}


  ${club?.iban ? `
  <div class="section">
    <div class="section-title">Dati bancari del club</div>
    <div class="row"><span class="lbl">IBAN</span><span class="val" style="font-family:monospace;">${club.iban}</span></div>
  </div>` : ''}

  <div class="firme">
    <div class="firma-line">Firma segreteria</div>
    <div class="firma-line">Timbro societario</div>
  </div>

  <div class="footer">
    Documento generato da ClubIS — The Intelligence System &nbsp;|&nbsp;
    ${club?.email_ufficiale ?? ''} &nbsp;|&nbsp;
    Il presente documento vale come ricevuta di pagamento
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
