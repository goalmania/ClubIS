'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { BackButton, PageHeader, SectionCard, FormSection, FormGrid, FormField, Select, Toast } from '@/components/ui'

export default function AdminClubDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [club, setClub] = useState<any>(null)
  const [utenti, setUtenti] = useState<any[]>([])
  const [stats, setStats] = useState({ tesserati: 0, sessioni: 0, partite: 0, report: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: clubData }, { data: utentiData }, { count: tesserati }, { count: sessioni }, { count: partite }, { count: report }] = await Promise.all([
        supabase.from('clubs').select('*').eq('id', id).single(),
        supabase.from('utenti').select('id, nome, cognome, email, ruolo, attivo, ultimo_accesso').eq('club_id', id).order('ruolo'),
        supabase.from('tesseramenti').select('*', { count: 'exact', head: true }).eq('club_id', id).eq('stato', 'attivo'),
        supabase.from('sessioni_allenamento').select('*', { count: 'exact', head: true }).in('squadra_id',
          (await supabase.from('squadre').select('id').eq('club_id', id)).data?.map(s => s.id) ?? []
        ),
        supabase.from('partite').select('*', { count: 'exact', head: true }).in('squadra_id',
          (await supabase.from('squadre').select('id').eq('club_id', id)).data?.map(s => s.id) ?? []
        ),
        supabase.from('report_scouting').select('*', { count: 'exact', head: true }).eq('club_richiedente_id', id),
      ])
      setClub(clubData)
      setUtenti(utentiData ?? [])
      setStats({ tesserati: tesserati ?? 0, sessioni: sessioni ?? 0, partite: partite ?? 0, report: report ?? 0 })
      setLoading(false)
    }
    load()
  }, [id])

  const salvaClub = async () => {
    setSaving(true)
    await supabase.from('clubs').update({
      nome: club.nome, citta: club.citta, categoria: club.categoria,
      piano_abbonamento: club.piano_abbonamento,
      abbonamento_scadenza: club.abbonamento_scadenza || null,
      email_ufficiale: club.email_ufficiale || null,
      telefono: club.telefono || null,
    }).eq('id', id)
    setSaving(false)
    setToast('Club aggiornato')
    setTimeout(() => setToast(''), 3000)
  }

  const cambiaRuolo = async (utenteId: string, nuovoRuolo: string) => {
    await supabase.from('utenti').update({ ruolo: nuovoRuolo }).eq('id', utenteId)
    setUtenti(prev => prev.map(u => u.id === utenteId ? { ...u, ruolo: nuovoRuolo } : u))
  }

  if (loading) return <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>
  if (!club) return <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--grigio-4)' }}>Club non trovato</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <BackButton label="Torna ai club" />
      <PageHeader title={club.nome} subtitle={`${club.citta} — ${club.categoria.replace(/_/g, ' ')}`} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Tesserati</div><div className="stat-value">{stats.tesserati}</div></div>
        <div className="stat-card"><div className="stat-label">Sessioni</div><div className="stat-value">{stats.sessioni}</div></div>
        <div className="stat-card"><div className="stat-label">Partite</div><div className="stat-value">{stats.partite}</div></div>
        <div className="stat-card"><div className="stat-label">Report scouting</div><div className="stat-value">{stats.report}</div></div>
      </div>

      {/* Dati club editabili */}
      <SectionCard>
        <FormSection title="Dati club">
          <FormGrid>
            <FormField label="Nome">
              <input className="input" value={club.nome ?? ''} onChange={e => setClub({ ...club, nome: e.target.value })} />
            </FormField>
            <FormField label="Città">
              <input className="input" value={club.citta ?? ''} onChange={e => setClub({ ...club, citta: e.target.value })} />
            </FormField>
          </FormGrid>
          <FormGrid>
            <FormField label="Categoria">
              <Select value={club.categoria} onChange={v => setClub({ ...club, categoria: v })} options={[
                { value: 'serie_a', label: 'Serie A' }, { value: 'serie_b', label: 'Serie B' },
                { value: 'serie_c', label: 'Serie C' }, { value: 'serie_d', label: 'Serie D' },
                { value: 'eccellenza', label: 'Eccellenza' }, { value: 'promozione', label: 'Promozione' },
                { value: 'prima_categoria', label: 'Prima Categoria' }, { value: 'seconda_categoria', label: 'Seconda Categoria' },
                { value: 'terza_categoria', label: 'Terza Categoria' }, { value: 'scuola_calcio', label: 'Scuola Calcio' },
              ]} />
            </FormField>
            <FormField label="Piano abbonamento">
              <Select value={club.piano_abbonamento} onChange={v => setClub({ ...club, piano_abbonamento: v })} options={[
                { value: 'base', label: 'Base' }, { value: 'pro', label: 'Pro' }, { value: 'elite', label: 'Elite' },
              ]} />
            </FormField>
          </FormGrid>
          <FormGrid>
            <FormField label="Email ufficiale">
              <input className="input" type="email" value={club.email_ufficiale ?? ''} onChange={e => setClub({ ...club, email_ufficiale: e.target.value })} />
            </FormField>
            <FormField label="Telefono">
              <input className="input" value={club.telefono ?? ''} onChange={e => setClub({ ...club, telefono: e.target.value })} />
            </FormField>
          </FormGrid>
          <FormField label="Scadenza abbonamento">
            <input className="input" type="date" value={club.abbonamento_scadenza ?? ''} onChange={e => setClub({ ...club, abbonamento_scadenza: e.target.value })} style={{ maxWidth: 220 }} />
          </FormField>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={salvaClub} disabled={saving}>
              {saving ? 'Salvataggio...' : 'Salva modifiche'}
            </button>
          </div>
        </FormSection>
      </SectionCard>

      {/* Utenti */}
      <SectionCard>
        <FormSection title="Utenti del club">
          {utenti.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--grigio-4)', padding: '20px 0', textAlign: 'center' }}>Nessun utente</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Nome</th><th>Email</th><th>Ruolo</th><th>Stato</th><th>Ultimo accesso</th></tr>
                </thead>
                <tbody>
                  {utenti.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{u.nome} {u.cognome}</td>
                      <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{u.email}</td>
                      <td>
                        <select className="input" style={{ width: 140, padding: '4px 8px', fontSize: 12 }}
                          value={u.ruolo} onChange={e => cambiaRuolo(u.id, e.target.value)}>
                          {['presidente','ds','segretario','allenatore','osservatore','medico','team_manager','famiglia','giocatore','ufficio_stampa','custode'].map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td><span className={`badge ${u.attivo ? 'badge-verde' : 'badge-rosso'}`} style={{ fontSize: 11 }}>{u.attivo ? 'Attivo' : 'Inattivo'}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>
                        {u.ultimo_accesso ? new Date(u.ultimo_accesso).toLocaleDateString('it-IT') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FormSection>
      </SectionCard>

      {toast && <Toast msg={toast} tipo="success" onClose={() => setToast('')} />}
    </div>
  )
}
