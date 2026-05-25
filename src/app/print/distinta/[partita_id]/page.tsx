import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import PrintToolbar from './PrintToolbar'

// Righe per categoria
const SERIE_D_MAIN = 18
const SERIE_D_RIS  = 4

// Categorie che usano il modulo LND (Eccellenza e inferiori)
const CAT_LND = ['eccellenza', 'promozione', 'prima_categoria', 'seconda_categoria', 'terza_categoria']

function hex(v: string | null | undefined, def: string) {
  return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : def
}
function textColor(bg: string) {
  const r = parseInt(bg.slice(1, 3), 16)
  const g = parseInt(bg.slice(3, 5), 16)
  const b = parseInt(bg.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#000000' : '#ffffff'
}
function fmtDN(d: string | null): [string, string, string] {
  if (!d) return ['', '', '']
  const [y, m, dd] = d.split('-')
  return [dd ?? '', m ?? '', y?.slice(2) ?? '']
}

export default async function PrintDistintaPage({ params }: { params: { partita_id: string } }) {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  const { clubId } = ctx

  const supabase = createAdminClient()

  const [{ data: partita }, { data: distinta }] = await Promise.all([
    supabase
      .from('partite')
      .select('avversario, data_ora, competizione, giornata, casa_trasferta, campo, club_id')
      .eq('id', params.partita_id)
      .single(),
    supabase
      .from('distinte_gara')
      .select('giocatori_snapshot, staff_snapshot, generata_at')
      .eq('partita_id', params.partita_id)
      .order('versione', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!partita) redirect('/dashboard/segretario/distinte')
  if (!distinta) redirect(`/dashboard/segretario/distinte/${params.partita_id}`)

  const resolvedClubId = (partita as any).club_id ?? clubId

  const { data: clubRaw } = await supabase
    .from('clubs')
    .select('nome, logo_url, colore_primario, categoria')
    .eq('id', resolvedClubId)
    .single()

  const club = clubRaw
  const categoria = club?.categoria ?? ''
  const isSerieD = categoria === 'serie_d'
  const isLND    = CAT_LND.includes(categoria)

  const primario  = hex(club?.colore_primario, '#1a1a2e')
  const testoPrim = textColor(primario)

  const giocatori = ((distinta.giocatori_snapshot as any[]) ?? [])
    .sort((a, b) => (a.numero_maglia ?? 99) - (b.numero_maglia ?? 99))
  const staff = (distinta.staff_snapshot ?? {}) as Record<string, string>

  const dataPartita = new Date(partita.data_ora)
  const fmtData = dataPartita.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtOra  = dataPartita.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  const globalStyles = `
    body { background: #f0f0f0 !important; margin: 0; padding: 0; }
    #__next > *:not(#print-root),
    nav, aside, header, [data-sidebar], [class*="sidebar"], [class*="Sidebar"],
    [class*="nav"], [class*="Nav"], [class*="layout"], [class*="Layout"] {
      display: none !important;
    }
    @media print {
      @page { size: A4 portrait; margin: 10mm 8mm; }
      body { background: #fff !important; }
      .no-print { display: none !important; }
      #print-root { box-shadow: none !important; }
    }
  `

  // ── SERIE D ────────────────────────────────────────────────────────────
  if (isSerieD) {
    const titolari  = giocatori.slice(0, SERIE_D_MAIN)
    const riserve   = giocatori.slice(SERIE_D_MAIN)
    const vuotiMain = Math.max(0, SERIE_D_MAIN - titolari.length)
    const vuotiRis  = Math.max(0, SERIE_D_RIS  - riserve.length)
    const isCasa    = partita.casa_trasferta === 'casa'

    return (
      <>
        <style>{globalStyles}</style>
        <PrintToolbar />

        <div id="print-root" style={{
          width: '210mm', margin: '60px auto 32px',
          background: '#fff', color: '#000',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: 8, boxShadow: '0 2px 24px rgba(0,0,0,0.18)',
          padding: '6mm 7mm 5mm',
        }}>

          {/* ── Copia rapporto (top right) */}
          <div style={{ textAlign: 'right', fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
            COPIA DA ALLEGARE AL RAPPORTO DI GARA
          </div>

          {/* ── Intestazione ──────────────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
            <tbody>
              <tr>
                {/* Logo SERIE D */}
                <td style={{ verticalAlign: 'middle', width: 58, paddingRight: 6 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: '#000', color: '#fff',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1.1,
                  }}>
                    <span style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SERIE</span>
                    <span style={{ fontSize: 18, fontWeight: 900 }}>D</span>
                  </div>
                </td>

                {/* Info gara */}
                <td style={{ verticalAlign: 'top' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 8 }}>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 700, paddingRight: 4, whiteSpace: 'nowrap', width: 1 }}>SOCIETÀ</td>
                        <td style={{ borderBottom: '1px solid #000', fontWeight: 600, paddingBottom: 1 }}>{club?.nome ?? ''}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, paddingRight: 4, whiteSpace: 'nowrap', paddingTop: 3 }}>Elenco dei calciatori che partecipano alla gara</td>
                        <td style={{ borderBottom: '1px solid #000', paddingTop: 3, fontWeight: 600 }}>{partita.avversario}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, paddingRight: 4, whiteSpace: 'nowrap', paddingTop: 3 }}>valevole per</td>
                        <td style={{ borderBottom: '1px solid #000', paddingTop: 3 }}>
                          {partita.competizione ?? 'Campionato Nazionale Serie D'}
                          {partita.giornata ? ` — Giornata ${partita.giornata}` : ''}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, paddingRight: 4, paddingTop: 3, whiteSpace: 'nowrap' }}>in programma</td>
                        <td style={{ paddingTop: 3 }}>
                          <span style={{ borderBottom: '1px solid #000', paddingRight: 60 }}>{fmtData}</span>
                          <span style={{ fontWeight: 700, marginLeft: 10 }}>a</span>
                          <span style={{ borderBottom: '1px solid #000', paddingLeft: 6, paddingRight: 60, marginLeft: 4 }}>{partita.campo ?? ''}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, paddingRight: 4, paddingTop: 3, whiteSpace: 'nowrap' }}>campo</td>
                        <td style={{ paddingTop: 3 }}>
                          <span style={{ borderBottom: '1px solid #000', paddingRight: 80 }}>{partita.campo ?? ''}</span>
                          <span style={{ fontWeight: 700, marginLeft: 10 }}>ore</span>
                          <span style={{ borderBottom: '1px solid #000', paddingLeft: 6, paddingRight: 40, marginLeft: 4 }}>{fmtOra}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Tabella calciatori ──────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 7.5 }}>
            <thead>
              <tr style={{ background: '#000', color: '#fff' }}>
                <th style={{ ...sdTh, width: 18 }} rowSpan={2}>N°</th>
                <th style={{ ...sdTh }} colSpan={3}>Data di nascita</th>
                <th style={{ ...sdTh, textAlign: 'left' }} rowSpan={2}>Cognome e Nome</th>
                <th style={{ ...sdTh, width: 24 }} rowSpan={2}>Cap.<br/>V.C.<br/>Under</th>
                <th style={{ ...sdTh, width: 52 }} rowSpan={2}>N° Matricola<br/>F.I.G.C.</th>
                <th style={{ ...sdTh }} colSpan={3}>Documento d&apos;identificazione</th>
              </tr>
              <tr style={{ background: '#d0d0d0', color: '#000' }}>
                <th style={{ ...sdSubTh, width: 16 }}>G</th>
                <th style={{ ...sdSubTh, width: 16 }}>M</th>
                <th style={{ ...sdSubTh, width: 20 }}>A</th>
                <th style={{ ...sdSubTh, width: 30 }}>Tipo</th>
                <th style={{ ...sdSubTh, width: 60 }}>Numero</th>
                <th style={{ ...sdSubTh }}>Rilasciato</th>
              </tr>
            </thead>
            <tbody>
              {titolari.map((g: any, i: number) => {
                const [dd, mm, aa] = fmtDN(g.data_nascita)
                return (
                  <tr key={g.id ?? i}>
                    <td style={{ ...sdTd, textAlign: 'center', fontWeight: 700 }}>{g.numero_maglia ?? i + 1}</td>
                    <td style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace' }}>{dd}</td>
                    <td style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace' }}>{mm}</td>
                    <td style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace' }}>{aa}</td>
                    <td style={{ ...sdTd, fontWeight: 600 }}>{(g.cognome ?? '').toUpperCase()} {g.nome ?? ''}</td>
                    <td style={sdTd}></td>
                    <td style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace', fontSize: 7 }}>{g.numero_matricola_figc ?? ''}</td>
                    <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                  </tr>
                )
              })}
              {Array.from({ length: vuotiMain }).map((_, i) => (
                <tr key={`vm${i}`}>
                  <td style={{ ...sdTd, height: 14 }}></td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                </tr>
              ))}

              {/* Riserve */}
              <tr>
                <td colSpan={10} style={{
                  background: '#000', color: '#fff', fontWeight: 700,
                  fontSize: 7, textTransform: 'uppercase', padding: '2px 5px',
                  letterSpacing: '0.05em',
                }}>
                  Calciatori di Riserva
                </td>
              </tr>
              {riserve.map((g: any, i: number) => {
                const [dd, mm, aa] = fmtDN(g.data_nascita)
                return (
                  <tr key={`ris${g.id ?? i}`}>
                    <td style={{ ...sdTd, textAlign: 'center', fontWeight: 700 }}>{g.numero_maglia ?? SERIE_D_MAIN + i + 1}</td>
                    <td style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace' }}>{dd}</td>
                    <td style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace' }}>{mm}</td>
                    <td style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace' }}>{aa}</td>
                    <td style={{ ...sdTd, fontWeight: 600 }}>{(g.cognome ?? '').toUpperCase()} {g.nome ?? ''}</td>
                    <td style={sdTd}></td>
                    <td style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace', fontSize: 7 }}>{g.numero_matricola_figc ?? ''}</td>
                    <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                  </tr>
                )
              })}
              {Array.from({ length: vuotiRis }).map((_, i) => (
                <tr key={`vr${i}`}>
                  <td style={{ ...sdTd, height: 14 }}></td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Persone ammesse nel recinto di gioco ───────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', fontSize: 7.5 }}>
            <thead>
              <tr style={{ background: '#000', color: '#fff' }}>
                <th style={{ ...sdTh, textAlign: 'left', width: '38%' }}>Persone ammesse nel recinto di gioco</th>
                <th style={{ ...sdTh, width: '20%' }}>N° Tessera F.I.G.C.</th>
                <th style={{ ...sdTh }} colSpan={3}>Documento d&apos;identificazione</th>
              </tr>
              <tr style={{ background: '#d0d0d0', color: '#000' }}>
                <th style={sdSubTh}></th>
                <th style={sdSubTh}></th>
                <th style={{ ...sdSubTh, width: 30 }}>Tipo</th>
                <th style={{ ...sdSubTh, width: 60 }}>Numero</th>
                <th style={sdSubTh}>Rilasciato</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['Dirigente Accompagnatore Ufficiale', staff.dirigente ?? ''],
                [isCasa
                  ? 'Dirigente addetto all\'Arbitro\n(solo Campionato Nazionale Serie D per gare disputate in casa)'
                  : 'Dirigente addetto all\'Arbitro',
                  ''],
                ['Medico Sociale', staff.medico ?? ''],
                ['Allenatore', staff.allenatore ?? ''],
                ['Allenatore in seconda', staff.vice_allenatore ?? ''],
                ['Massaggiatore', ''],
              ] as [string, string][]).map(([ruolo, nome]) => (
                <tr key={ruolo}>
                  <td style={{ ...sdTd, fontSize: 7, lineHeight: 1.3 }}>
                    {ruolo.split('\n').map((line, i) => (
                      <span key={i} style={{ display: 'block', fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#000' : '#555', fontSize: i === 0 ? 7 : 6 }}>
                        {line}
                      </span>
                    ))}
                    {nome ? <span style={{ color: '#444', fontSize: 6.5 }}>{nome}</span> : null}
                  </td>
                  <td style={sdTd}></td>
                  <td style={sdTd}></td>
                  <td style={sdTd}></td>
                  <td style={sdTd}></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Nota ammissione ──────────────────────────────────────────── */}
          <div style={{ border: '1px solid #000', borderTop: 'none', padding: '2px 5px', fontSize: 6.5, lineHeight: 1.4 }}>
            Le persone qui sopra elencate possono essere ammesse solo se munite delle prescritte tessere F.I.G.C. valide per l&apos;annata in corso.
          </div>

          {/* ── Dichiarazione + Firme ──────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 5, fontSize: 7 }}>
            <tbody>
              <tr>
                <td style={{ width: '52%', paddingRight: 10, verticalAlign: 'bottom', lineHeight: 1.4 }}>
                  Il sottoscritto Dirigente Accompagnatore Ufficiale dichiara, ai sensi dell&apos;Art. 61 N.O.I.F., che i calciatori sopraelencati sono regolarmente tesserati e partecipano alla gara sotto la responsabilità della società.
                </td>
                <td style={{ width: '22%', textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #000', height: 28, marginBottom: 3 }} />
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 7 }}>L&apos;Arbitro</div>
                </td>
                <td style={{ width: '26%', textAlign: 'center', paddingLeft: 8 }}>
                  <div style={{ borderBottom: '1px solid #000', height: 28, marginBottom: 3 }} />
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 7 }}>Il Dirigente Accompagnatore Ufficiale</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Note quadruplice copia ──────────────────────────────────── */}
          <div style={{ marginTop: 4, fontSize: 6.5, color: '#000', lineHeight: 1.4, borderTop: '1px solid #000', paddingTop: 3 }}>
            Questa distinta deve essere consegnata all&apos;arbitro in <strong>quadruplice copia</strong>, prima dell&apos;inizio della gara, unitamente all&apos;ultimo tabulato dei calciatori tesserati rilasciato dalla F.I.G.C., alle tessere federali, laddove previste, ed ai documenti d&apos;identificazione.
          </div>
          <div style={{ marginTop: 2, display: 'flex', justifyContent: 'flex-end', fontSize: 6, color: '#aaa' }}>
            Generata il {new Date(distinta.generata_at).toLocaleDateString('it-IT')} · ClubIS
          </div>
        </div>
      </>
    )
  }

  // ── ECCELLENZA / CATEGORIE LND ──────────────────────────────────────────
  if (isLND) {
    const TOTAL_ROWS = 20
    const righeVuote = Math.max(0, TOTAL_ROWS - giocatori.length)

    return (
      <>
        <style>{globalStyles}</style>
        <PrintToolbar />

        <div id="print-root" style={{
          width: '210mm', margin: '60px auto 32px',
          background: '#fff', color: '#000',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: 8, boxShadow: '0 2px 24px rgba(0,0,0,0.18)',
          padding: '6mm 7mm 5mm',
        }}>

          {/* ── Intestazione ───────────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 5 }}>
            <tbody>
              <tr>
                {/* Logo ITALIA / FIGC sinistra */}
                <td style={{ width: 68, verticalAlign: 'middle', textAlign: 'center' }}>
                  <div style={{
                    width: 60, height: 60, border: '2px solid #003087', borderRadius: 4,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', color: '#003087',
                  }}>
                    <div style={{ fontSize: 6.5, fontWeight: 900, letterSpacing: '0.12em' }}>★ ★ ★ ★</div>
                    <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1 }}>ITALIA</div>
                    <div style={{ fontSize: 14, marginTop: 1 }}>⚽</div>
                  </div>
                </td>
                {/* Titolo */}
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    DISTINTA ELENCO GIOCATORI
                  </div>
                </td>
                {/* Logo FIGC destra */}
                <td style={{ width: 68, verticalAlign: 'middle', textAlign: 'center' }}>
                  <div style={{
                    width: 60, height: 60, border: '2px solid #003087', borderRadius: 4,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', color: '#003087',
                  }}>
                    <div style={{ fontSize: 6.5, fontWeight: 900, letterSpacing: '0.12em' }}>★ ★ ★ ★</div>
                    <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1 }}>FIGC</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Denominazione Società ───────────────────────────────────── */}
          <div style={{ marginBottom: 6, fontSize: 8.5 }}>
            <em>Denominazione Società e Timbro:</em>
            <span style={{
              borderBottom: '1px solid #000', display: 'inline-block',
              minWidth: 220, marginLeft: 8, fontWeight: 600,
            }}>{club?.nome ?? ''}</span>
          </div>

          {/* ── Dati gara ──────────────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: 0, fontSize: 8 }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '3px 6px', width: '50%' }}>
                  Distinta Giocatori partecipanti alla gara:&nbsp;
                  <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 50 }}></span>
                  <span style={{ margin: '0 4px' }}>-</span>
                  <span style={{ fontWeight: 600 }}>{partita.avversario}</span>
                </td>
                <td style={{ border: '1px solid #000', padding: '3px 6px' }}>
                  &nbsp;
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '3px 6px' }}>
                  Campionato&nbsp;
                  <span style={{ fontWeight: 600 }}>
                    {partita.competizione ?? ''}{partita.giornata ? ` — Giornata ${partita.giornata}` : ''}
                  </span>
                </td>
                <td style={{ border: '1px solid #000', padding: '3px 6px' }}>
                  da disputare il:&nbsp;
                  <span style={{ fontWeight: 600 }}>{fmtData}</span>
                  <span style={{ marginLeft: 12 }}>a:</span>
                  <span style={{ fontWeight: 600, marginLeft: 4 }}>{partita.campo ?? ''}</span>
                  <span style={{ marginLeft: 12, fontWeight: 600 }}>{fmtOra}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Tabella giocatori ──────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', fontSize: 7 }}>
            <thead>
              <tr style={{ background: '#fff', color: '#000' }}>
                <th style={{ ...lndTh, width: 26 }} rowSpan={2}>N.<br/>Maglia</th>
                <th style={{ ...lndTh }} colSpan={3}>Data Nascita</th>
                <th style={{ ...lndTh, textAlign: 'left' }} rowSpan={2}>Cognome e Nome</th>
                <th style={{ ...lndTh, width: 36 }} rowSpan={2}>Capit.<br/>Libero</th>
                <th style={{ ...lndTh, width: 52 }} rowSpan={2}>Matricola<br/>F.I.G.C.</th>
                <th style={{ ...lndTh }} colSpan={3}>Documento di identificazione</th>
                <th style={{ ...lndTh, width: 26 }} rowSpan={2}>Espulsi</th>
                <th style={{ ...lndTh, width: 32 }} rowSpan={2}>Ammoniti</th>
              </tr>
              <tr style={{ background: '#fff', color: '#000' }}>
                <th style={{ ...lndSubTh, width: 16 }}>G</th>
                <th style={{ ...lndSubTh, width: 16 }}>M</th>
                <th style={{ ...lndSubTh, width: 20 }}>A</th>
                <th style={{ ...lndSubTh, width: 28 }}>Tipo</th>
                <th style={{ ...lndSubTh, width: 52 }}>Numero</th>
                <th style={{ ...lndSubTh }}>Rilasciato</th>
              </tr>
            </thead>
            <tbody>
              {giocatori.map((g: any, i: number) => {
                const [dd, mm, aa] = fmtDN(g.data_nascita)
                const isRow12 = i + 1 === 12
                return (
                  <tr key={g.id ?? i} style={{ background: isRow12 ? '#e0e0e0' : '#fff' }}>
                    <td style={{ ...lndTd, textAlign: 'center', fontWeight: 700 }}>{g.numero_maglia ?? i + 1}</td>
                    <td style={{ ...lndTd, textAlign: 'center', fontFamily: 'monospace' }}>{dd}</td>
                    <td style={{ ...lndTd, textAlign: 'center', fontFamily: 'monospace' }}>{mm}</td>
                    <td style={{ ...lndTd, textAlign: 'center', fontFamily: 'monospace' }}>{aa}</td>
                    <td style={{ ...lndTd, fontWeight: 600 }}>{(g.cognome ?? '').toUpperCase()} {g.nome ?? ''}</td>
                    <td style={lndTd}></td>
                    <td style={{ ...lndTd, textAlign: 'center', fontFamily: 'monospace', fontSize: 6.5 }}>{g.numero_matricola_figc ?? ''}</td>
                    <td style={lndTd}></td>
                    <td style={lndTd}></td>
                    <td style={lndTd}></td>
                    <td style={lndTd}></td>
                    <td style={lndTd}></td>
                  </tr>
                )
              })}
              {Array.from({ length: righeVuote }).map((_, i) => {
                const rowNum = giocatori.length + i + 1
                const isRow12 = rowNum === 12
                return (
                  <tr key={`v${i}`} style={{ background: isRow12 ? '#e0e0e0' : '#fff' }}>
                    <td style={{ ...lndTd, textAlign: 'center', color: '#999', fontSize: 6.5, height: 14 }}>{rowNum}</td>
                    <td style={lndTd}></td><td style={lndTd}></td><td style={lndTd}></td>
                    <td style={lndTd}></td><td style={lndTd}></td><td style={lndTd}></td>
                    <td style={lndTd}></td><td style={lndTd}></td><td style={lndTd}></td>
                    <td style={lndTd}></td><td style={lndTd}></td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* ── Sezione Dirigente accompagnatore ───────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', fontSize: 7.5 }}>
            <tbody>
              <tr>
                <td colSpan={4} style={{ border: '1px solid #000', padding: '3px 6px' }}>
                  <strong>Dirigente accompagnatore ufficiale della squadra Signor:</strong>{' '}
                  <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 180 }}>{staff.dirigente ?? ''}</span>
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '3px 6px', width: '38%' }}>
                  Documento d&apos;identità:
                </td>
                <td style={{ border: '1px solid #000', padding: '3px 6px', width: '12%' }}></td>
                <td style={{ border: '1px solid #000', padding: '3px 6px', width: '32%' }}>
                  Tessera Impersonale F.I.G.C. n°:
                </td>
                <td style={{ border: '1px solid #000', padding: '3px 6px', width: '18%' }}></td>
              </tr>
              {([
                ['Dirigente addetto arbitro:', ''],
                ['Allenatore', staff.allenatore ?? ''],
                ['Medico Sociale', staff.medico ?? ''],
                ['Massaggiatore', ''],
              ] as [string, string][]).map(([ruolo, nome]) => (
                <tr key={ruolo}>
                  <td style={{ border: '1px solid #000', padding: '3px 6px', fontSize: 7.5 }} colSpan={2}>
                    {ruolo}{nome ? <span style={{ marginLeft: 4, fontWeight: 600 }}>{nome}</span> : null}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '3px 6px', fontSize: 7.5 }} colSpan={2}>
                    Documento e/o Tessera FIGC n°
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Dichiarazione ──────────────────────────────────────────── */}
          <div style={{ fontSize: 6.5, marginTop: 4, lineHeight: 1.45 }}>
            Il sottoscritto Dirigente accompagnatore ufficiale dichiara che i giocatori non compresi nell&apos;ultimo elenco dei calciatori tesserati che si allega per visione, partecipano alla gara sotto la responsabilità propria e della Società di appartenenza, giusto quanto disposto dall&apos;art.61 n°5 delle N.O.I.F.
          </div>

          {/* ── Firme ──────────────────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', paddingRight: 10 }}>
                  <div style={{ background: '#c8c8c8', textAlign: 'center', padding: '2px 4px', fontWeight: 700, fontSize: 7, textTransform: 'uppercase', marginBottom: 14 }}>
                    DIRIGENTE ARBITRO
                  </div>
                  <div style={{ borderBottom: '1px solid #000', height: 0 }} />
                  <div style={{ fontSize: 6.5, marginTop: 2 }}>Firma</div>
                </td>
                <td style={{ width: '50%', paddingLeft: 10 }}>
                  <div style={{ background: '#c8c8c8', textAlign: 'center', padding: '2px 4px', fontWeight: 700, fontSize: 7, textTransform: 'uppercase', marginBottom: 14 }}>
                    IL DIRIGENTE ACCOMPAGNATORE
                  </div>
                  <div style={{ borderBottom: '1px solid #000', height: 0 }} />
                  <div style={{ fontSize: 6.5, marginTop: 2 }}>Firma</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Note finali ────────────────────────────────────────────── */}
          <div style={{ marginTop: 5, fontSize: 6.5, lineHeight: 1.45 }}>
            Questo elenco deve essere consegnato all&apos;arbitro in <strong>QUADRUPLICE COPIA</strong>, prima dell&apos;inizio della gara, unitamente ai vari documenti (identità e tessere FIGC e/o riconoscimento calciatori).
          </div>
          <div style={{ marginTop: 3, fontSize: 6.5, fontWeight: 700 }}>
            COPIA DA ALLEGARE AL:{' '}
            {['Rapporto di gara', 'Copia Arbitro', 'Copia annotazioni ammoniti/espulsi', 'Copia Società avversaria'].map(label => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 8, fontWeight: 400 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, border: '1px solid #000', verticalAlign: 'middle' }} />
                {label}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 2, display: 'flex', justifyContent: 'flex-end', fontSize: 6, color: '#aaa' }}>
            Generata il {new Date(distinta.generata_at).toLocaleDateString('it-IT')} · ClubIS
          </div>
        </div>
      </>
    )
  }

  // ── FORMATO BRANDED (categorie non LND, non Serie D) ───────────────────
  const ROWS_DEFAULT = 18
  const righeVuote = Math.max(0, ROWS_DEFAULT - giocatori.length)

  const RUOLO_LABEL: Record<string, string> = {
    portiere: 'POR', difensore_centrale: 'DC', terzino: 'TRZ',
    centrocampista_difensivo: 'CDM', centrocampista: 'CEN', mezzala: 'MEZ',
    regista: 'REG', trequartista: 'TRQ', ala: 'ALA',
    seconda_punta: '2P', centravanti: 'ATT',
  }

  return (
    <>
      <style>{globalStyles}</style>
      <PrintToolbar />

      <div id="print-root" style={{
        width: '210mm', margin: '60px auto 32px',
        background: '#fff', color: '#000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 11, boxShadow: '0 2px 24px rgba(0,0,0,0.18)',
        padding: '12mm 12mm 10mm',
      }}>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'middle', width: '55%', paddingBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {club?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={club.logo_url} alt="Logo" style={{ width: 58, height: 58, objectFit: 'contain' }} />
                  ) : (
                    <div style={{
                      width: 58, height: 58, border: `2px solid ${primario}`, borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, fontWeight: 700, textAlign: 'center', lineHeight: 1.2, color: primario,
                    }}>LOGO<br/>CLUB</div>
                  )}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#000' }}>
                      {club?.nome ?? 'Club'}
                    </div>
                    <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>
                      {partita.competizione ?? 'Campionato'}
                      {partita.giornata ? ` — Giornata ${partita.giornata}` : ''}
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ verticalAlign: 'middle', textAlign: 'right', paddingBottom: 8 }}>
                <div style={{ display: 'inline-block', background: primario, color: testoPrim, padding: '8px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Distinta di Gara</div>
                  <div style={{ fontSize: 8, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.85 }}>Modulo Ufficiale</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ height: 4, background: primario, marginBottom: 10 }} />

        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${primario}`, marginBottom: 12 }}>
          <tbody>
            <tr style={{ background: primario, color: testoPrim }}>
              <td style={{ ...cellInfo, borderColor: primario, fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em' }} colSpan={4}>Informazioni Gara</td>
            </tr>
            <tr>
              <td style={{ ...cellInfo, width: 90, fontWeight: 700, background: '#f7f7f7' }}>Avversario</td>
              <td style={{ ...cellInfo, fontWeight: 700, fontSize: 12 }}>{partita.avversario}</td>
              <td style={{ ...cellInfo, width: 70, fontWeight: 700, background: '#f7f7f7' }}>Tipo</td>
              <td style={cellInfo}>{partita.casa_trasferta === 'casa' ? 'Gara Casalinga' : partita.casa_trasferta === 'trasferta' ? 'Gara in Trasferta' : '—'}</td>
            </tr>
            <tr>
              <td style={{ ...cellInfo, fontWeight: 700, background: '#f7f7f7' }}>Data</td>
              <td style={cellInfo}>{fmtData}</td>
              <td style={{ ...cellInfo, fontWeight: 700, background: '#f7f7f7' }}>Ora</td>
              <td style={cellInfo}>{fmtOra}</td>
            </tr>
            <tr>
              <td style={{ ...cellInfo, fontWeight: 700, background: '#f7f7f7' }}>Campo</td>
              <td style={cellInfo} colSpan={3}>{partita.campo ?? '—'}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
          Elenco Calciatori ({giocatori.length} / {ROWS_DEFAULT})
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${primario}` }}>
          <thead>
            <tr style={{ background: primario, color: testoPrim }}>
              <th style={{ ...thS, borderColor: primario }}>N°</th>
              <th style={{ ...thS, textAlign: 'left', width: '35%', borderColor: primario }}>Cognome e Nome</th>
              <th style={{ ...thS, borderColor: primario }}>Ruolo</th>
              <th style={{ ...thS, width: '20%', borderColor: primario }}>Tessera FIGC</th>
              <th style={{ ...thS, width: '4%', borderColor: primario }}>C</th>
              <th style={{ ...thS, width: '18%', borderColor: primario }}>Firma</th>
            </tr>
          </thead>
          <tbody>
            {giocatori.map((g: any, i: number) => (
              <tr key={g.id ?? i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td style={{ ...tdS, textAlign: 'center', fontWeight: 700, fontSize: 12 }}>{g.numero_maglia ?? '—'}</td>
                <td style={{ ...tdS, fontWeight: 600 }}>{(g.cognome ?? '').toUpperCase()} {g.nome ?? ''}</td>
                <td style={{ ...tdS, textAlign: 'center', fontFamily: 'monospace' }}>{RUOLO_LABEL[g.ruolo_principale ?? ''] ?? g.ruolo_principale ?? '—'}</td>
                <td style={{ ...tdS, textAlign: 'center', fontFamily: 'monospace', fontSize: 10 }}>{g.codice_tessera_figc ?? ''}</td>
                <td style={{ ...tdS, textAlign: 'center' }}></td>
                <td style={{ ...tdS, height: 20 }}></td>
              </tr>
            ))}
            {Array.from({ length: righeVuote }).map((_, i) => (
              <tr key={`v${i}`} style={{ background: (giocatori.length + i) % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td style={{ ...tdS, height: 20 }}></td>
                <td style={tdS}></td><td style={tdS}></td>
                <td style={tdS}></td><td style={tdS}></td><td style={tdS}></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Staff Tecnico e Dirigenziale</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${primario}` }}>
            <tbody>
              <tr>
                {[['Allenatore', staff.allenatore], ['Vice All.', staff.vice_allenatore], ['Medico', staff.medico], ['Dirigente Acc.', staff.dirigente]].map(([role, name]) => (
                  <td key={role} style={{ border: `1px solid ${primario}`, padding: '4px 8px', width: '25%', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{role}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, minHeight: 13 }}>{name ?? ''}</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[{ role: 'Allenatore', name: staff.allenatore }, { role: 'Dirigente Accompagnatore', name: staff.dirigente }, { role: 'Segretario', name: '' }].map(({ role, name }) => (
            <div key={role} style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: `1.5px solid ${primario}`, height: 34, marginBottom: 5 }} />
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{role}</div>
              {name && <div style={{ fontSize: 9, color: '#444', marginTop: 2 }}>{name}</div>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, borderTop: `1px solid ${primario}`, paddingTop: 5, display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#777' }}>
          <span>Ai sensi del Regolamento Gare FIGC e delle norme federali vigenti, il sottoscritto dichiara la correttezza dei dati riportati.</span>
          <span style={{ whiteSpace: 'nowrap', marginLeft: 12 }}>Generata il {new Date(distinta.generata_at).toLocaleDateString('it-IT')} · ClubIS</span>
        </div>
      </div>
    </>
  )
}

// ── Stili branded ────────────────────────────────────────────────────────
const cellInfo: React.CSSProperties = { border: '1px solid #ccc', padding: '4px 8px', fontSize: 11, verticalAlign: 'middle' }
const thS: React.CSSProperties = { padding: '5px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', border: '1px solid #555' }
const tdS: React.CSSProperties = { padding: '3px 6px', fontSize: 11, border: '1px solid #ddd', verticalAlign: 'middle' }

// ── Stili Serie D ────────────────────────────────────────────────────────
const sdTh: React.CSSProperties = { padding: '3px 4px', fontWeight: 700, fontSize: 7, textAlign: 'center', border: '1px solid #555', textTransform: 'uppercase', letterSpacing: '0.03em' }
const sdSubTh: React.CSSProperties = { padding: '2px 4px', fontWeight: 600, fontSize: 6.5, textAlign: 'center', border: '1px solid #aaa', color: '#333' }
const sdTd: React.CSSProperties = { padding: '2px 4px', fontSize: 7.5, border: '1px solid #ccc', verticalAlign: 'middle' }

// ── Stili LND ────────────────────────────────────────────────────────────
const lndTh: React.CSSProperties = { padding: '3px 3px', fontWeight: 700, fontSize: 6.5, textAlign: 'center', border: '1px solid #000', textTransform: 'uppercase', lineHeight: 1.2, background: '#fff' }
const lndSubTh: React.CSSProperties = { padding: '2px 3px', fontWeight: 600, fontSize: 6, textAlign: 'center', border: '1px solid #000', background: '#fff' }
const lndTd: React.CSSProperties = { padding: '2px 3px', fontSize: 7, border: '1px solid #000', verticalAlign: 'middle' }
