import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PrintToolbar from './PrintToolbar'

const RUOLO_LABEL: Record<string, string> = {
  portiere: 'POR', difensore_centrale: 'DC', terzino: 'TRZ',
  centrocampista_difensivo: 'CDM', centrocampista: 'CEN', mezzala: 'MEZ',
  regista: 'REG', trequartista: 'TRQ', ala: 'ALA',
  seconda_punta: '2P', centravanti: 'ATT',
}

const TOTAL_ROWS = 18

// Garantisce che il colore sia un hex valido, altrimenti usa il default
function hex(v: string | null | undefined, def: string) {
  return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : def
}

// Calcola se il testo sopra un colore deve essere bianco o nero
function textColor(bg: string) {
  const r = parseInt(bg.slice(1, 3), 16)
  const g = parseInt(bg.slice(3, 5), 16)
  const b = parseInt(bg.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#000000' : '#ffffff'
}

export default async function PrintDistintaPage({ params }: { params: { partita_id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente) redirect('/auth/errore')

  const [{ data: partita }, { data: distinta }, { data: clubBase }, { data: clubColors }] = await Promise.all([
    supabase
      .from('partite')
      .select('avversario, data_ora, competizione, giornata, casa_trasferta, campo')
      .eq('id', params.partita_id)
      .single(),
    supabase
      .from('distinte_gara')
      .select('giocatori_snapshot, staff_snapshot, generata_at')
      .eq('partita_id', params.partita_id)
      .order('versione', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Campi sempre presenti
    supabase
      .from('clubs')
      .select('nome, logo_url')
      .eq('id', utente.club_id)
      .single(),
    // Colori hex — aggiunti via migration 20260507_fix037; se non ancora applicata restituisce null
    supabase
      .from('clubs')
      .select('colore_primario, colore_secondario')
      .eq('id', utente.club_id)
      .single(),
  ])

  const club = { ...clubBase, ...clubColors }

  if (!partita) redirect('/dashboard/segretario/distinte')
  if (!distinta) redirect(`/dashboard/segretario/distinte/${params.partita_id}`)

  const primario   = hex(club?.colore_primario,   '#1a1a2e')
  const secondario = hex(club?.colore_secondario,  '#ffffff')
  const testoPrim  = textColor(primario)

  const giocatori = ((distinta.giocatori_snapshot as any[]) ?? [])
    .sort((a, b) => (a.numero_maglia ?? 99) - (b.numero_maglia ?? 99))
  const staff      = (distinta.staff_snapshot ?? {}) as Record<string, string>
  const righeVuote = Math.max(0, TOTAL_ROWS - giocatori.length)

  const dataPartita = new Date(partita.data_ora)
  const fmtData = dataPartita.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtOra  = dataPartita.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const tipoGara = partita.casa_trasferta === 'casa' ? 'Gara Casalinga'
    : partita.casa_trasferta === 'trasferta' ? 'Gara in Trasferta' : '—'

  return (
    <>
      {/* Stili globali: nasconde il chrome del dashboard, definisce @page */}
      <style>{`
        body { background: #f0f0f0 !important; margin: 0; padding: 0; }
        #__next > *:not(#print-root),
        nav, aside, header, [data-sidebar], [class*="sidebar"], [class*="Sidebar"],
        [class*="nav"], [class*="Nav"], [class*="layout"], [class*="Layout"] {
          display: none !important;
        }
        @media print {
          @page { size: A4 portrait; margin: 12mm 10mm; }
          body { background: #fff !important; }
          .no-print { display: none !important; }
          #print-root { box-shadow: none !important; }
        }
      `}</style>

      <PrintToolbar />

      <div id="print-root" style={{
        width: '210mm', margin: '60px auto 32px',
        background: '#fff', color: '#000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 11, boxShadow: '0 2px 24px rgba(0,0,0,0.18)',
        padding: '12mm 12mm 10mm',
      }}>

        {/* ── Intestazione ─────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <tbody>
            <tr>
              {/* Logo + nome club */}
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
              {/* Titolo documento */}
              <td style={{ verticalAlign: 'middle', textAlign: 'right', paddingBottom: 8 }}>
                <div style={{
                  display: 'inline-block',
                  background: primario,
                  color: testoPrim,
                  padding: '8px 18px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Distinta di Gara
                  </div>
                  <div style={{ fontSize: 8, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.85 }}>
                    Modulo Ufficiale
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Fascia colore primario */}
        <div style={{ height: 4, background: primario, marginBottom: 10 }} />

        {/* ── Dati gara ─────────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${primario}`, marginBottom: 12 }}>
          <tbody>
            <tr style={{ background: primario, color: testoPrim }}>
              <td style={{ ...cellInfo, borderColor: primario, fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em' }} colSpan={4}>
                Informazioni Gara
              </td>
            </tr>
            <tr>
              <td style={{ ...cellInfo, width: 90, fontWeight: 700, background: '#f7f7f7', color: '#000' }}>Avversario</td>
              <td style={{ ...cellInfo, fontWeight: 700, fontSize: 12, color: '#000' }}>{partita.avversario}</td>
              <td style={{ ...cellInfo, width: 70, fontWeight: 700, background: '#f7f7f7', color: '#000' }}>Tipo</td>
              <td style={{ ...cellInfo, color: '#000' }}>{tipoGara}</td>
            </tr>
            <tr>
              <td style={{ ...cellInfo, fontWeight: 700, background: '#f7f7f7', color: '#000' }}>Data</td>
              <td style={{ ...cellInfo, color: '#000' }}>{fmtData}</td>
              <td style={{ ...cellInfo, fontWeight: 700, background: '#f7f7f7', color: '#000' }}>Ora</td>
              <td style={{ ...cellInfo, color: '#000' }}>{fmtOra}</td>
            </tr>
            <tr>
              <td style={{ ...cellInfo, fontWeight: 700, background: '#f7f7f7', color: '#000' }}>Campo</td>
              <td style={{ ...cellInfo, color: '#000' }} colSpan={3}>{partita.campo ?? '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* ── Lista giocatori ───────────────────────────────────────── */}
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#000', marginBottom: 4 }}>
          Elenco Calciatori ({giocatori.length} / {TOTAL_ROWS})
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
                <td style={{ ...tdS, textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#000' }}>
                  {g.numero_maglia ?? '—'}
                </td>
                <td style={{ ...tdS, fontWeight: 600, color: '#000' }}>
                  {(g.cognome ?? '').toUpperCase()} {g.nome ?? ''}
                </td>
                <td style={{ ...tdS, textAlign: 'center', fontFamily: 'monospace', color: '#000' }}>
                  {RUOLO_LABEL[g.ruolo_principale ?? ''] ?? g.ruolo_principale ?? '—'}
                </td>
                <td style={{ ...tdS, textAlign: 'center', fontFamily: 'monospace', fontSize: 10, color: '#000' }}>
                  {g.codice_tessera_figc ?? ''}
                </td>
                <td style={{ ...tdS, textAlign: 'center', color: '#000' }}></td>
                <td style={{ ...tdS, height: 20 }}></td>
              </tr>
            ))}
            {Array.from({ length: righeVuote }).map((_, i) => (
              <tr key={`v${i}`} style={{ background: (giocatori.length + i) % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td style={{ ...tdS, height: 20 }}></td>
                <td style={tdS}></td>
                <td style={tdS}></td>
                <td style={tdS}></td>
                <td style={tdS}></td>
                <td style={tdS}></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Staff tecnico ─────────────────────────────────────────── */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#000', marginBottom: 4 }}>
            Staff Tecnico e Dirigenziale
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${primario}` }}>
            <tbody>
              <tr>
                {[
                  ['Allenatore',    staff.allenatore],
                  ['Vice All.',     staff.vice_allenatore],
                  ['Medico',        staff.medico],
                  ['Dirigente Acc.',staff.dirigente],
                ].map(([role, name]) => (
                  <td key={role} style={{ border: `1px solid ${primario}`, padding: '4px 8px', width: '25%', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{role}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#000', marginTop: 2, minHeight: 13 }}>{name ?? ''}</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Firme ─────────────────────────────────────────────────── */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { role: 'Allenatore',               name: staff.allenatore },
            { role: 'Dirigente Accompagnatore',  name: staff.dirigente  },
            { role: 'Segretario',                name: ''               },
          ].map(({ role, name }) => (
            <div key={role} style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: `1.5px solid ${primario}`, height: 34, marginBottom: 5 }} />
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#000' }}>{role}</div>
              {name && <div style={{ fontSize: 9, color: '#444', marginTop: 2 }}>{name}</div>}
            </div>
          ))}
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div style={{ marginTop: 14, borderTop: `1px solid ${primario}`, paddingTop: 5, display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#777' }}>
          <span>Ai sensi del Regolamento Gare FIGC e delle norme federali vigenti, il sottoscritto dichiara la correttezza dei dati riportati.</span>
          <span style={{ whiteSpace: 'nowrap', marginLeft: 12 }}>
            Generata il {new Date(distinta.generata_at).toLocaleDateString('it-IT')} · ClubIS
          </span>
        </div>
      </div>
    </>
  )
}

// ── Stili condivisi ──────────────────────────────────────────────────
const cellInfo: React.CSSProperties = {
  border: '1px solid #ccc', padding: '4px 8px', fontSize: 11, verticalAlign: 'middle',
}
const thS: React.CSSProperties = {
  padding: '5px 6px', fontSize: 9, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  textAlign: 'center', border: '1px solid #555',
}
const tdS: React.CSSProperties = {
  padding: '3px 6px', fontSize: 11,
  border: '1px solid #ddd', verticalAlign: 'middle',
}
