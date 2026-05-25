import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { redirect } from 'next/navigation'
import PrintToolbar from './PrintToolbar'

const RUOLO_LABEL: Record<string, string> = {
  portiere: 'POR', difensore_centrale: 'DC', terzino: 'TRZ',
  centrocampista_difensivo: 'CDM', centrocampista: 'CEN', mezzala: 'MEZ',
  regista: 'REG', trequartista: 'TRQ', ala: 'ALA',
  seconda_punta: '2P', centravanti: 'ATT',
}

// Righe per categoria
const ROWS_DEFAULT   = 18
const ROWS_LND       = 20   // Eccellenza, Promozione, Prima/Seconda/Terza cat.
const SERIE_D_MAIN   = 18   // Titolari Serie D
const SERIE_D_RIS    = 4    // Riserve Serie D

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
function fmtDN(d: string | null) {
  if (!d) return ''
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y?.slice(2)}`
}

export default async function PrintDistintaPage({ params }: { params: { partita_id: string } }) {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  const { clubId } = ctx

  const supabase = createAdminClient()

  // Recupera la partita e la distinta in parallelo
  const [{ data: partita }, { data: distinta }] = await Promise.all([
    supabase
      .from('partite')
      .select('avversario, data_ora, competizione, giornata, casa_trasferta, campo')
      .eq('id', params.partita_id)
      .single(),
    supabase
      .from('distinte_gara')
      .select('giocatori_snapshot, staff_snapshot, generata_at, club_id')
      .eq('partita_id', params.partita_id)
      .order('versione', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!partita) redirect('/dashboard/segretario/distinte')
  if (!distinta) redirect(`/dashboard/segretario/distinte/${params.partita_id}`)

  // Usa il club_id della distinta (sempre corretto) con fallback all'utente
  const resolvedClubId = (distinta as any).club_id ?? clubId

  const { data: clubRaw } = await supabase
    .from('clubs')
    .select('nome, logo_url, colore_primario, categoria')
    .eq('id', resolvedClubId)
    .single()

  const club = clubRaw
  const categoria = club?.categoria ?? ''
  const isSerieD  = categoria === 'serie_d'
  const isLND     = CAT_LND.includes(categoria)

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

  // ── SERIE D ────────────────────────────────────────────────────────
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
          fontSize: 8.5, boxShadow: '0 2px 24px rgba(0,0,0,0.18)',
          padding: '7mm 7mm 5mm',
        }}>

          {/* ── Intestazione ───────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 3 }}>
            <tbody>
              <tr>
                {/* Logo SERIE D */}
                <td style={{ verticalAlign: 'middle', width: 56 }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: '50%',
                    background: '#000', color: '#fff',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, fontWeight: 900, lineHeight: 1.1,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    <span style={{ fontSize: 9 }}>SERIE</span>
                    <span style={{ fontSize: 16 }}>D</span>
                  </div>
                </td>

                {/* Info gara */}
                <td style={{ verticalAlign: 'top', paddingLeft: 6 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 8 }}>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 700, paddingRight: 4, whiteSpace: 'nowrap' }}>SOCIETÀ:</td>
                        <td style={{ borderBottom: '1px solid #000', width: '70%', fontWeight: 600 }}>{club?.nome ?? ''}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, paddingRight: 4, whiteSpace: 'nowrap', paddingTop: 2 }}>Elenco calciatori che partecipano alla gara:</td>
                        <td style={{ borderBottom: '1px solid #000', fontWeight: 600, paddingTop: 2 }}>{partita.avversario}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, paddingRight: 4, whiteSpace: 'nowrap', paddingTop: 2 }}>valevole per:</td>
                        <td style={{ borderBottom: '1px solid #000', paddingTop: 2 }}>
                          {partita.competizione ?? 'Campionato Nazionale Serie D'}
                          {partita.giornata ? ` — Giornata ${partita.giornata}` : ''}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, paddingRight: 4, paddingTop: 2, whiteSpace: 'nowrap' }}>in programma il:</td>
                        <td style={{ paddingTop: 2 }}>
                          <span style={{ borderBottom: '1px solid #000', paddingRight: 16 }}>{fmtData}</span>
                          <span style={{ fontWeight: 700, marginLeft: 10 }}>ore:</span>
                          <span style={{ borderBottom: '1px solid #000', paddingLeft: 4, paddingRight: 16 }}>{fmtOra}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, paddingRight: 4, paddingTop: 2, whiteSpace: 'nowrap' }}>campo:</td>
                        <td style={{ borderBottom: '1px solid #000', paddingTop: 2 }}>{partita.campo ?? ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>

                {/* Copia */}
                <td style={{ verticalAlign: 'top', textAlign: 'right', width: 120, fontSize: 7, paddingLeft: 8 }}>
                  <div style={{ border: '1px solid #000', padding: '3px 5px', display: 'inline-block', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 6.5 }}>Copia da allegare al</div>
                    <div style={{ fontWeight: 900, fontSize: 8, textTransform: 'uppercase' }}>Rapporto di Gara</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Tabella calciatori ─────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 7.5 }}>
            <thead>
              <tr style={{ background: '#000', color: '#fff' }}>
                <th style={{ ...sdTh, width: 20 }} rowSpan={2}>N°</th>
                <th style={{ ...sdTh, textAlign: 'left' }} rowSpan={2}>Cognome e Nome</th>
                <th style={{ ...sdTh }} colSpan={3}>Data di nascita</th>
                <th style={{ ...sdTh, width: 22 }} rowSpan={2}>Cap.<br/>V.C.</th>
                <th style={{ ...sdTh, width: 52 }} rowSpan={2}>N° Matricola<br/>F.I.G.C.</th>
                <th style={{ ...sdTh }} colSpan={3}>Documento d&apos;identificazione</th>
              </tr>
              <tr style={{ background: '#d0d0d0', color: '#000' }}>
                <th style={{ ...sdSubTh, width: 18 }}>G</th>
                <th style={{ ...sdSubTh, width: 18 }}>M</th>
                <th style={{ ...sdSubTh, width: 22 }}>A</th>
                <th style={{ ...sdSubTh, width: 32 }}>Tipo</th>
                <th style={{ ...sdSubTh, width: 62 }}>Numero</th>
                <th style={{ ...sdSubTh }}>Rilasciato da</th>
              </tr>
            </thead>
            <tbody>
              {titolari.map((g: any, i: number) => (
                <tr key={g.id ?? i}>
                  <td style={{ ...sdTd, textAlign: 'center', fontWeight: 700 }}>{g.numero_maglia ?? i + 1}</td>
                  <td style={{ ...sdTd, fontWeight: 600 }}>{(g.cognome ?? '').toUpperCase()} {g.nome ?? ''}</td>
                  {fmtDN(g.data_nascita).split('/').map((v, j) => (
                    <td key={j} style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace' }}>{v}</td>
                  ))}
                  <td style={{ ...sdTd }}></td>
                  <td style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace', fontSize: 7.5 }}>{g.numero_matricola_figc ?? ''}</td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                </tr>
              ))}
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
                <td colSpan={10} style={{ background: '#000', color: '#fff', fontWeight: 700, fontSize: 7, textTransform: 'uppercase', padding: '2px 5px', letterSpacing: '0.05em' }}>
                  Calciatori di Riserva
                </td>
              </tr>
              {riserve.map((g: any, i: number) => (
                <tr key={`ris${g.id ?? i}`} style={{ background: '#fafafa' }}>
                  <td style={{ ...sdTd, textAlign: 'center', fontWeight: 700 }}>{g.numero_maglia ?? SERIE_D_MAIN + i + 1}</td>
                  <td style={{ ...sdTd, fontWeight: 600 }}>{(g.cognome ?? '').toUpperCase()} {g.nome ?? ''}</td>
                  {fmtDN(g.data_nascita).split('/').map((v, j) => (
                    <td key={j} style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace' }}>{v}</td>
                  ))}
                  <td style={sdTd}></td>
                  <td style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace', fontSize: 7.5 }}>{g.numero_matricola_figc ?? ''}</td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                </tr>
              ))}
              {Array.from({ length: vuotiRis }).map((_, i) => (
                <tr key={`vr${i}`} style={{ background: '#fafafa' }}>
                  <td style={{ ...sdTd, height: 14 }}></td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Staff ──────────────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', fontSize: 7.5 }}>
            <thead>
              <tr style={{ background: '#555', color: '#fff' }}>
                <th style={{ ...sdTh, textAlign: 'left', width: '35%' }}>Persone ammesse nel recinto di gioco</th>
                <th style={{ ...sdTh, width: '20%' }}>N° Tessera F.I.G.C.</th>
                <th style={{ ...sdTh }} colSpan={3}>Documento d&apos;identificazione</th>
              </tr>
              <tr style={{ background: '#d0d0d0', color: '#000' }}>
                <th style={sdSubTh}></th>
                <th style={sdSubTh}></th>
                <th style={{ ...sdSubTh, width: 32 }}>Tipo</th>
                <th style={{ ...sdSubTh, width: 62 }}>Numero</th>
                <th style={sdSubTh}>Rilasciato da</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Dirigente Accompagnatore Ufficiale', staff.dirigente],
                [isCasa ? 'Dirigente addetto all\'arbitro (solo gare in casa)' : 'Dirigente addetto all\'arbitro', ''],
                ['Medico Sociale', staff.medico],
                ['Allenatore', staff.allenatore],
                ['Allenatore in seconda', staff.vice_allenatore],
                ['Massaggiatore', ''],
              ].map(([ruolo, nome]) => (
                <tr key={ruolo}>
                  <td style={{ ...sdTd, fontSize: 7.5 }}>
                    <span style={{ fontWeight: 600 }}>{ruolo}</span>
                    {ruolo.includes('arbitro') && !isCasa
                      ? <span style={{ color: '#888', fontSize: 6.5 }}> (solo Campionato Nazionale Serie D per gare in casa)</span>
                      : null}
                  </td>
                  <td style={{ ...sdTd, fontWeight: 600 }}>{nome ?? ''}</td>
                  <td style={sdTd}></td>
                  <td style={sdTd}></td>
                  <td style={sdTd}></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Dichiarazione + Firme ──────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 5, fontSize: 7 }}>
            <tbody>
              <tr>
                <td style={{ width: '55%', paddingRight: 10, verticalAlign: 'bottom', lineHeight: 1.35 }}>
                  Il sottoscritto Dirigente Accompagnatore Ufficiale dichiara, ai sensi dell&apos;Art. 61 N.O.I.F., che i calciatori sopraelencati sono regolarmente tesserati e partecipano alla gara sotto la responsabilità della società.
                </td>
                <td style={{ width: '22%', textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #000', height: 26, marginBottom: 3 }} />
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 7 }}>L&apos;Arbitro</div>
                </td>
                <td style={{ width: '23%', textAlign: 'center', paddingLeft: 8 }}>
                  <div style={{ borderBottom: '1px solid #000', height: 26, marginBottom: 3 }} />
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 7 }}>Il Dirigente Accompagnatore Ufficiale</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Note quadruplice copia ─────────────────────────────── */}
          <div style={{ marginTop: 4, fontSize: 6.5, color: '#333', lineHeight: 1.4, borderTop: '1px solid #ccc', paddingTop: 3 }}>
            Questa distinta deve essere consegnata all&apos;arbitro in <strong>quadruplice copia</strong>, prima dell&apos;inizio della gara, unitamente all&apos;ultimo tabulato dei calciatori tesserati rilasciato dalla F.I.G.C., alle tessere federali, laddove previste, ed ai documenti d&apos;identificazione.
          </div>
          <div style={{ marginTop: 3, display: 'flex', justifyContent: 'flex-end', fontSize: 6.5, color: '#aaa' }}>
            Generata il {new Date(distinta.generata_at).toLocaleDateString('it-IT')} · ClubIS
          </div>
        </div>
      </>
    )
  }

  // ── ECCELLENZA / CATEGORIE LND ──────────────────────────────────────
  if (isLND) {
    const TOTAL_ROWS = ROWS_LND
    const righeVuote = Math.max(0, TOTAL_ROWS - giocatori.length)

    return (
      <>
        <style>{globalStyles}</style>
        <PrintToolbar />

        <div id="print-root" style={{
          width: '210mm', margin: '60px auto 32px',
          background: '#fff', color: '#000',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: 8.5, boxShadow: '0 2px 24px rgba(0,0,0,0.18)',
          padding: '8mm 8mm 6mm',
        }}>

          {/* ── Intestazione ───────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
            <tbody>
              <tr>
                <td style={{ verticalAlign: 'middle', width: 56 }}>
                  {club?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={club.logo_url} alt="Logo" style={{ width: 50, height: 50, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 50, height: 50, border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700 }}>LOGO</div>
                  )}
                </td>
                <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                  <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#333' }}>
                    Lega Nazionale Dilettanti — F.I.G.C.
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000', marginTop: 2 }}>
                    DISTINTA ELENCO GIOCATORI
                  </div>
                  <div style={{ fontSize: 8, color: '#444', marginTop: 2 }}>
                    {partita.competizione ?? 'Campionato'}
                    {partita.giornata ? ` — Giornata ${partita.giornata}` : ''}
                  </div>
                </td>
                <td style={{ width: 56 }} />
              </tr>
            </tbody>
          </table>

          <div style={{ height: 2, background: '#000', marginBottom: 4 }} />

          {/* ── Dati gara ──────────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: 4, fontSize: 8.5 }}>
            <tbody>
              <tr>
                <td style={{ ...sdCell, width: '60%' }}>
                  <span style={{ fontWeight: 700 }}>Denominazione Società: </span>
                  <span style={{ fontWeight: 600 }}>{club?.nome ?? ''}</span>
                </td>
                <td style={{ ...sdCell }}>
                  <span style={{ fontWeight: 700 }}>Campionato disputato il: </span>{fmtData}
                </td>
              </tr>
              <tr>
                <td style={{ ...sdCell }}>
                  <span style={{ fontWeight: 700 }}>Avversario: </span>
                  <span style={{ fontWeight: 600 }}>{partita.avversario}</span>
                </td>
                <td style={{ ...sdCell }}>
                  <span style={{ fontWeight: 700 }}>Ore: </span>{fmtOra}
                  {partita.campo ? <><span style={{ fontWeight: 700, marginLeft: 12 }}>Campo: </span>{partita.campo}</> : null}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Tabella giocatori ──────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 7.5 }}>
            <thead>
              <tr style={{ background: '#000', color: '#fff' }}>
                <th style={{ ...sdTh, width: 18 }}>N°</th>
                <th style={{ ...sdTh, textAlign: 'left', width: '27%' }}>Cognome e Nome</th>
                <th style={{ ...sdTh, width: 44 }}>Data<br/>Nasc.</th>
                <th style={{ ...sdTh, width: '22%' }} colSpan={3}>Documento di Identificazione</th>
                <th style={{ ...sdTh, width: '17%' }}>Tessera / Doc.<br/>FIGC n°</th>
                <th style={{ ...sdTh, width: 40 }}>Matricola<br/>F.I.G.C.</th>
                <th style={{ ...sdTh, width: 22 }}>Amm.</th>
                <th style={{ ...sdTh, width: 22 }}>Esp.</th>
              </tr>
              <tr style={{ background: '#e0e0e0', color: '#000' }}>
                <th style={sdSubTh}></th>
                <th style={sdSubTh}></th>
                <th style={sdSubTh}>(GG/MM/AA)</th>
                <th style={{ ...sdSubTh, width: 28 }}>Tipo</th>
                <th style={{ ...sdSubTh, width: 52 }}>Numero</th>
                <th style={sdSubTh}>Rilasciato da</th>
                <th style={sdSubTh}></th>
                <th style={sdSubTh}></th>
                <th style={sdSubTh}></th>
                <th style={sdSubTh}></th>
              </tr>
            </thead>
            <tbody>
              {giocatori.map((g: any, i: number) => (
                <tr key={g.id ?? i} style={{ background: i % 2 === 0 ? '#fff' : '#f6f6f6' }}>
                  <td style={{ ...sdTd, textAlign: 'center', fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ ...sdTd, fontWeight: 600 }}>{(g.cognome ?? '').toUpperCase()} {g.nome ?? ''}</td>
                  <td style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace' }}>{fmtDN(g.data_nascita)}</td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                  <td style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace', fontSize: 7.5 }}>{g.codice_tessera_figc ?? ''}</td>
                  <td style={{ ...sdTd, textAlign: 'center', fontFamily: 'monospace', fontSize: 7.5 }}>{g.numero_matricola_figc ?? ''}</td>
                  <td style={sdTd}></td><td style={sdTd}></td>
                </tr>
              ))}
              {Array.from({ length: righeVuote }).map((_, i) => (
                <tr key={`v${i}`} style={{ background: (giocatori.length + i) % 2 === 0 ? '#fff' : '#f6f6f6' }}>
                  <td style={{ ...sdTd, textAlign: 'center', color: '#ccc', fontSize: 7 }}>{giocatori.length + i + 1}</td>
                  <td style={{ ...sdTd, height: 14 }}></td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                  <td style={sdTd}></td><td style={sdTd}></td><td style={sdTd}></td>
                  <td style={sdTd}></td><td style={sdTd}></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Staff ──────────────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none', fontSize: 7.5 }}>
            <thead>
              <tr style={{ background: '#000', color: '#fff' }}>
                <th style={{ ...sdTh, textAlign: 'left', width: '22%' }}>Ruolo</th>
                <th style={{ ...sdTh, textAlign: 'left', width: '32%' }}>Cognome e Nome</th>
                <th style={{ ...sdTh, width: '23%' }}>Documento d&apos;identità</th>
                <th style={{ ...sdTh, width: '23%' }}>Tessera Imp. F.I.G.C. n°</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Dirigente addetto arbitro', staff.dirigente],
                ['Allenatore',               staff.allenatore],
                ['Medico Sociale',            staff.medico],
                ['Massaggiatore',             ''],
              ].map(([ruolo, nome]) => (
                <tr key={ruolo}>
                  <td style={{ ...sdTd, fontWeight: 600 }}>{ruolo}</td>
                  <td style={{ ...sdTd }}>{nome ?? ''}</td>
                  <td style={sdTd}></td>
                  <td style={sdTd}></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Dirigente + Firme ──────────────────────────────────── */}
          <div style={{ border: '1px solid #000', borderTop: 'none', padding: '3px 5px', fontSize: 7.5 }}>
            <span style={{ fontWeight: 700 }}>Dirigente accompagnatore ufficiale della squadra Signor: </span>
            <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 180 }}>{staff.dirigente ?? ''}</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 5, fontSize: 7 }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', paddingRight: 8, verticalAlign: 'bottom', lineHeight: 1.35 }}>
                  Il sottoscritto Dirigente accompagnatore ufficiale dichiara che i giocatori non compresi nell&apos;ultimo elenco dei calciatori tesserati che si allega per visione, partecipano alla gara sotto la responsabilità propria e della Società di appartenenza, giusto quanto disposto dall&apos;art.61 n°5 delle N.O.I.F.
                </td>
                <td style={{ width: '25%', textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #000', height: 26, marginBottom: 3 }} />
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 7 }}>Dirigente Arbitro</div>
                  <div style={{ fontSize: 6.5, color: '#555' }}>Firma</div>
                </td>
                <td style={{ width: '25%', textAlign: 'center', paddingLeft: 8 }}>
                  <div style={{ borderBottom: '1px solid #000', height: 26, marginBottom: 3 }} />
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 7 }}>Il Dirigente Accompagnatore</div>
                  <div style={{ fontSize: 6.5, color: '#555' }}>Firma</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 4, border: '1px solid #aaa', padding: '3px 5px', fontSize: 6.5, color: '#333' }}>
            Questo elenco deve essere consegnato all&apos;arbitro in <strong>QUADRUPLICE COPIA</strong>, prima dell&apos;inizio della gara, unitamente ai vari documenti (identità e tessere FIGC e/o riconoscimento calciatori).
          </div>
          <div style={{ marginTop: 3, fontSize: 6.5, color: '#444', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>COPIA DA ALLEGARE AL:</span>
            {['Rapporto di gara', 'Copia Arbitro', 'Copia annotazioni ammoniti/espulsi', 'Copia Società avversaria'].map(label => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, border: '1px solid #000' }} />
                {label}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 3, display: 'flex', justifyContent: 'flex-end', fontSize: 6.5, color: '#aaa' }}>
            Generata il {new Date(distinta.generata_at).toLocaleDateString('it-IT')} · ClubIS
          </div>
        </div>
      </>
    )
  }

  // ── FORMATO BRANDED (categorie non LND) ────────────────────────────
  const righeVuote = Math.max(0, ROWS_DEFAULT - giocatori.length)

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

        {/* ── Intestazione ───────────────────────────────────────────── */}
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

// ── Stili condivisi branded ──────────────────────────────────────────
const cellInfo: React.CSSProperties = { border: '1px solid #ccc', padding: '4px 8px', fontSize: 11, verticalAlign: 'middle' }
const thS: React.CSSProperties = { padding: '5px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', border: '1px solid #555' }
const tdS: React.CSSProperties = { padding: '3px 6px', fontSize: 11, border: '1px solid #ddd', verticalAlign: 'middle' }

// ── Stili LND / Serie D ──────────────────────────────────────────────
const sdCell: React.CSSProperties = { border: '1px solid #000', padding: '3px 6px', verticalAlign: 'middle' }
const sdTh: React.CSSProperties = { padding: '3px 4px', fontWeight: 700, fontSize: 7, textAlign: 'center', border: '1px solid #555', textTransform: 'uppercase', letterSpacing: '0.03em' }
const sdSubTh: React.CSSProperties = { padding: '2px 4px', fontWeight: 600, fontSize: 6.5, textAlign: 'center', border: '1px solid #aaa', color: '#333' }
const sdTd: React.CSSProperties = { padding: '2px 4px', fontSize: 8, border: '1px solid #ccc', verticalAlign: 'middle' }
