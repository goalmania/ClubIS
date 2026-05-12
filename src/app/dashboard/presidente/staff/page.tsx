import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PresidenteStaffPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: utente, error: utenteError } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
  if (utenteError || !utente) redirect('/auth/errore')
  const { data: staff } = await supabase
    .from('utenti')
    .select('id, nome, cognome, ruolo, email, telefono, attivo, ultimo_accesso')
    .eq('club_id', utente.club_id)
    .order('ruolo')
  const { data: collaboratori } = await supabase
    .from('collaboratori_staff')
    .select('*, utenti(nome, cognome, ruolo)')
    .eq('club_id', utente.club_id)
    .eq('attivo', true)
  const roleLabel: Record<string, string> = {
    presidente: 'Presidente', ds: 'Dir. Sportivo', segretario: 'Segretario',
    allenatore: 'Allenatore', osservatore: 'Osservatore', medico: 'Medico', famiglia: 'Famiglia',
  }
  const roleBadge: Record<string, string> = {
    presidente: 'badge-viola', ds: 'badge-blu', segretario: 'badge-verde',
    allenatore: 'badge-ambra', osservatore: 'badge-grigio', medico: 'badge-rosso',
  }
  const totIngaggio = collaboratori?.reduce((s, c) => s + Number(c.compenso_mensile ?? 0), 0) ?? 0
  const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Staff</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          {staff?.filter(s => s.attivo).length ?? 0} utenti attivi · Costo mensile staff: {fmt(totIngaggio)}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)', fontSize: 14, fontWeight: 600 }}>Utenti del sistema</div>
          {(staff ?? []).map(s => (
            <div key={s.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--grigio-6)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{s.nome[0]}{s.cognome[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.nome} {s.cognome}</div>
                <div style={{ fontSize: 12, color: 'var(--grigio-4)' }}>{s.email}</div>
              </div>
              <span className={`badge ${roleBadge[s.ruolo] ?? 'badge-grigio'}`} style={{ fontSize: 11 }}>
                {roleLabel[s.ruolo] ?? s.ruolo}
              </span>
              {!s.attivo && <span className="badge badge-rosso" style={{ fontSize: 10 }}>Disattivo</span>}
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)', fontSize: 14, fontWeight: 600 }}>
            Compensi collaboratori
          </div>
          {(collaboratori ?? []).length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
              Nessun contratto collaboratore registrato
            </div>
          ) : (collaboratori ?? []).map(c => {
            const u = c.utenti as any
            return (
              <div key={c.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--grigio-6)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{u?.nome} {u?.cognome}</div>
                  <div style={{ fontSize: 12, color: 'var(--grigio-4)', textTransform: 'capitalize' }}>{c.tipo_contratto}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmt(Number(c.compenso_mensile ?? 0))}/mese</div>
                  <div style={{ fontSize: 11, color: 'var(--grigio-4)' }}>Tot. erogato: {fmt(Number(c.totale_annuo_erogato ?? 0))}</div>
                </div>
              </div>
            )
          })}
          {(collaboratori ?? []).length > 0 && (
            <div style={{ padding: '12px 18px', background: 'var(--grigio-6)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>Totale mensile</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(totIngaggio)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
