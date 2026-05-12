import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StampaPrintButton from './StampaPrintButton'

export default async function StampaPage({
  params,
}: {
  params: { partita_id: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (!utente) redirect('/auth/errore')

  const [{ data: partita }, { data: distinta }, { data: club }] = await Promise.all([
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
    supabase
      .from('clubs')
      .select('nome')
      .eq('id', utente.club_id)
      .single(),
  ])

  if (!partita) redirect('/dashboard/segretario/distinte')
  if (!distinta) redirect(`/dashboard/segretario/distinte/${params.partita_id}`)

  const giocatori = (distinta.giocatori_snapshot as any[]) ?? []
  const staff = (distinta.staff_snapshot ?? {}) as Record<string, string>
  const righeVuote = Math.max(0, 18 - giocatori.length)

  const dataPartita = new Date(partita.data_ora)
  const fmtData = dataPartita.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const fmtOra = dataPartita.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .distinta-wrap { padding: 0 !important; }
        }
        .dt { width: 100%; border-collapse: collapse; margin-top: 14px; }
        .dt th, .dt td { border: 1px solid #aaa; padding: 5px 8px; font-size: 11px; }
        .dt th { background: #efefef; font-weight: 700; text-align: left; }
        .dt td.firma { height: 32px; }
      `}</style>

      {/* Toolbar schermo — nascosta in stampa */}
      <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <StampaPrintButton />
        <Link
          href={`/dashboard/segretario/distinte/${params.partita_id}`}
          className="btn btn-ghost btn-sm"
        >
          ← Modifica
        </Link>
        <Link href="/dashboard/segretario/distinte" className="btn btn-ghost btn-sm">
          Lista distinte
        </Link>
      </div>

      {/* Foglio distinta */}
      <div
        className="distinta-wrap"
        style={{
          maxWidth: 760,
          margin: '0 auto',
          background: 'white',
          color: '#000',
          fontFamily: 'Arial, Helvetica, sans-serif',
          padding: '24px',
          border: '1px solid var(--border)',
          borderRadius: 8,
        }}
      >
        {/* Intestazione */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 14, borderBottom: '2px solid #222', marginBottom: 18 }}>
          <div style={{
            width: 60, height: 60, flexShrink: 0,
            border: '1px solid #bbb', borderRadius: 6,
            background: '#f5f5f5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, color: '#888', textAlign: 'center', lineHeight: 1.3,
          }}>
            LOGO<br />CLUB
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{club?.nome ?? 'Club'}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Distinta Gara Ufficiale
            </div>
          </div>
        </div>

        {/* Dati partita */}
        <div style={{ border: '1px solid #ddd', borderRadius: 4, padding: '10px 14px', marginBottom: 18, background: '#fafafa' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', fontSize: 12 }}>
            <div><strong>Avversario:</strong> {partita.avversario}</div>
            <div><strong>Data:</strong> {fmtData}</div>
            <div><strong>Ora:</strong> {fmtOra}</div>
            <div><strong>Campo:</strong> {partita.campo ?? '—'}</div>
            {partita.competizione && <div><strong>Competizione:</strong> {partita.competizione}</div>}
            {partita.giornata && <div><strong>Giornata:</strong> G{partita.giornata}</div>}
          </div>
        </div>

        {/* Tabella giocatori */}
        <table className="dt">
          <thead>
            <tr>
              <th style={{ width: 36 }}>N°</th>
              <th style={{ width: '22%' }}>Cognome</th>
              <th style={{ width: '22%' }}>Nome</th>
              <th style={{ width: 130 }}>N° Tessera FIGC</th>
              <th>Firma</th>
            </tr>
          </thead>
          <tbody>
            {giocatori.map((g: any, i: number) => (
              <tr key={g.id ?? i}>
                <td style={{ fontWeight: 700, textAlign: 'center' }}>{g.numero_maglia ?? i + 1}</td>
                <td style={{ fontWeight: 600 }}>{(g.cognome ?? '').toUpperCase()}</td>
                <td>{g.nome ?? ''}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{g.codice_tessera_figc ?? ''}</td>
                <td className="firma"></td>
              </tr>
            ))}
            {Array.from({ length: righeVuote }).map((_, i) => (
              <tr key={`v${i}`} style={{ height: 26 }}>
                <td></td><td></td><td></td><td></td><td></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Staff */}
        {Object.values(staff).some(Boolean) && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Staff tecnico
            </div>
            <table className="dt">
              <tbody>
                {staff.allenatore && (
                  <tr><td style={{ fontWeight: 600, width: 160 }}>Allenatore</td><td>{staff.allenatore}</td></tr>
                )}
                {staff.vice_allenatore && (
                  <tr><td style={{ fontWeight: 600 }}>Vice Allenatore</td><td>{staff.vice_allenatore}</td></tr>
                )}
                {staff.medico && (
                  <tr><td style={{ fontWeight: 600 }}>Medico</td><td>{staff.medico}</td></tr>
                )}
                {staff.dirigente && (
                  <tr><td style={{ fontWeight: 600 }}>Dirigente Acc.</td><td>{staff.dirigente}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Firme */}
        <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            ['Allenatore', staff.allenatore],
            ['Dirigente', staff.dirigente],
            ['Segretario', ''],
          ].map(([role, name]) => (
            <div key={role} style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #333', height: 36, marginBottom: 6 }}></div>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{role}</div>
              {name && <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{name}</div>}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, fontSize: 9, color: '#aaa', textAlign: 'right' }}>
          Generata il{' '}
          {new Date(distinta.generata_at).toLocaleDateString('it-IT')} · ClubIS
        </div>
      </div>
    </>
  )
}
