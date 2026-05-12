import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const REGIME_LABEL: Record<string, string> = {
  esente_art10: 'Esente art. 10 DPR 633/72',
  imponibile:   'Imponibile',
  fuori_campo:  'Fuori campo IVA',
}

function csvEscape(val: string | number | null | undefined): string {
  if (val == null) return ''
  const s = String(val)
  if (s.includes(';') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(req: NextRequest) {
  const sessionClient = createClient()

  const supabase = createAdminClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: utente } = await supabase
    .from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente?.club_id) return NextResponse.json({ error: 'Club non trovato' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const anno = sp.get('anno') ?? new Date().getFullYear().toString()
  const mese = sp.get('mese')
  const tipo  = sp.get('tipo')

  let query = supabase
    .from('registro_iva')
    .select('numero_progressivo, data_operazione, tipo, natura, controparte, imponibile, iva, totale, regime, note')
    .eq('club_id', utente.club_id)
    .gte('data_operazione', `${anno}-01-01`)
    .lte('data_operazione', `${anno}-12-31`)
    .order('numero_progressivo')

  if (mese) {
    const m = Number(mese).toString().padStart(2, '0')
    query = query
      .gte('data_operazione', `${anno}-${m}-01`)
      .lte('data_operazione', `${anno}-${m}-31`)
  }
  if (tipo && tipo !== 'tutti') {
    query = query.eq('tipo', tipo)
  }

  const { data: righe } = await query

  const header = [
    'N. Progressivo', 'Data', 'Tipo', 'Natura', 'Controparte',
    'Imponibile (EUR)', 'IVA (EUR)', 'Totale (EUR)', 'Regime', 'Note',
  ].join(';')

  const body = (righe ?? []).map(r => [
    csvEscape(r.numero_progressivo),
    csvEscape(new Date(r.data_operazione).toLocaleDateString('it-IT')),
    csvEscape(r.tipo === 'entrata' ? 'Entrata' : 'Uscita'),
    csvEscape(r.natura),
    csvEscape(r.controparte),
    csvEscape(Number(r.imponibile).toFixed(2).replace('.', ',')),
    csvEscape(Number(r.iva).toFixed(2).replace('.', ',')),
    csvEscape(Number(r.totale).toFixed(2).replace('.', ',')),
    csvEscape(REGIME_LABEL[r.regime] ?? r.regime),
    csvEscape(r.note),
  ].join(';')).join('\n')

  const totImponibile = (righe ?? []).reduce((s, r) => s + Number(r.imponibile), 0)
  const totIva        = (righe ?? []).reduce((s, r) => s + Number(r.iva), 0)
  const totTotale     = (righe ?? []).reduce((s, r) => s + Number(r.totale), 0)

  const footer = [
    csvEscape('TOTALE'), '', '', '', '',
    csvEscape(totImponibile.toFixed(2).replace('.', ',')),
    csvEscape(totIva.toFixed(2).replace('.', ',')),
    csvEscape(totTotale.toFixed(2).replace('.', ',')),
    '', '',
  ].join(';')

  const csv = `\uFEFF${header}\n${body}\n${footer}`
  const filename = `registro-iva-${anno}${mese ? `-${mese.padStart(2, '0')}` : ''}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
