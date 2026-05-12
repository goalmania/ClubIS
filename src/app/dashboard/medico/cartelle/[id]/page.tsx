'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TabBar, Toast } from '@/components/ui'
import Link from 'next/link'
import FormInfortunio from '@/components/forms/FormInfortunio'
import FormVisita from '@/components/forms/FormVisita'

const GRUPPO_SANGUE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-', 'ND']
const TABS = [
  { key: 'anagrafica', label: 'Anagrafica medica' },
  { key: 'infortuni', label: 'Infortuni' },
  { key: 'visite', label: 'Visite' },
  { key: 'certificati', label: 'Certificati' },
]

export default function CartellaGiocatorePage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [clubId, setClubId] = useState<string | null>(null)
  const [giocatore, setGiocatore] = useState<any>(null)
  const [tesseramento, setTesseramento] = useState<any>(null)
  const [infortuni, setInfortuni] = useState<any[]>([])
  const [visite, setVisite] = useState<any[]>([])
  const [certificati, setCertificati] = useState<any[]>([])
  const [tab, setTab] = useState('anagrafica')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [openInf, setOpenInf] = useState(false)
  const [openVis, setOpenVis] = useState(false)
  const [refreshInf, setRefreshInf] = useState(0)
  const [refreshVis, setRefreshVis] = useState(0)

  // Anagrafica form state
  const [gruppoSanguigno, setGruppoSanguigno] = useState('')
  const [allergie, setAllergie] = useState('')
  const [terapieInCorso, setTerapieInCorso] = useState('')
  const [noteMedico, setNoteMedico] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
      if (!utente) return
      setClubId(utente.club_id)

      const [{ data: g }, { data: tess }, { data: cert }] = await Promise.all([
        supabase.from('giocatori')
          .select('id, nome, cognome, ruolo_principale, data_nascita, gruppo_sanguigno, allergie, terapie_in_corso, note_medico')
          .eq('id', id).single(),
        supabase.from('tesseramenti')
          .select('numero_maglia, squadre(nome)')
          .eq('club_id', utente.club_id).eq('giocatore_id', id).eq('stato', 'attivo')
          .maybeSingle(),
        supabase.from('certificati_medici')
          .select('id, tipo, data_rilascio, data_scadenza, medico, struttura')
          .eq('club_id', utente.club_id).eq('giocatore_id', id)
          .order('data_scadenza', { ascending: false }),
      ])

      setGiocatore(g)
      setTesseramento(tess)
      setCertificati(cert ?? [])
      setGruppoSanguigno(g?.gruppo_sanguigno ?? '')
      setAllergie(g?.allergie ?? '')
      setTerapieInCorso(g?.terapie_in_corso ?? '')
      setNoteMedico(g?.note_medico ?? '')
      setLoading(false)
    }
    init()
  }, [id])

  useEffect(() => {
    if (!clubId) return
    supabase.from('infortuni')
      .select('id, tipo, zona_corpo, gravita, data_infortunio, data_rientro_prevista, data_rientro_effettiva, diagnosi, terapia')
      .eq('club_id', clubId).eq('giocatore_id', id)
      .order('data_infortunio', { ascending: false })
      .then(({ data }) => setInfortuni(data ?? []))
  }, [clubId, id, refreshInf])

  useEffect(() => {
    if (!clubId) return
    supabase.from('visite_mediche')
      .select('id, tipo, data, esito, note, struttura, medico')
      .eq('club_id', clubId).eq('giocatore_id', id)
      .order('data', { ascending: false })
      .then(({ data }) => setVisite(data ?? []))
  }, [clubId, id, refreshVis])

  const salvaAnagrafica = async () => {
    setSaving(true)
    const { error } = await supabase.from('giocatori').update({
      gruppo_sanguigno: gruppoSanguigno || null,
      allergie: allergie || null,
      terapie_in_corso: terapieInCorso || null,
      note_medico: noteMedico || null,
    }).eq('id', id)
    setSaving(false)
    setToast(error
      ? { msg: error.message, tipo: 'error' }
      : { msg: 'Dati salvati', tipo: 'success' }
    )
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Caricamento…</div>
  if (!giocatore) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Giocatore non trovato</div>

  const oggi = new Date().toISOString().split('T')[0]
  const gravitaColore: Record<string, string> = { lieve: 'badge-verde', moderato: 'badge-ambra', grave: 'badge-rosso' }
  const esitoBadge: Record<string, string> = { idoneo: 'badge-verde', non_idoneo: 'badge-rosso', sospesa: 'badge-ambra', in_attesa: 'badge-grigio' }

  const eta = giocatore.data_nascita
    ? Math.floor((Date.now() - new Date(giocatore.data_nascita).getTime()) / (365.25 * 86400000))
    : null

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Link href="/dashboard/medico/cartelle" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>← Cartelle cliniche</Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', marginTop: 6 }}>
            {giocatore.cognome} {giocatore.nome}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {giocatore.ruolo_principale?.replace(/_/g, ' ')}
            {tesseramento?.numero_maglia != null && ` · #${tesseramento.numero_maglia}`}
            {eta && ` · ${eta} anni`}
            {(tesseramento?.squadre as any)?.nome && ` · ${(tesseramento.squadre as any).nome}`}
          </p>
        </div>
      </div>

      <TabBar
        tabs={TABS}
        active={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 20 }}>
        {/* ── Tab 0: Anagrafica medica ── */}
        {tab === 'anagrafica' && (
          <div className="card" style={{ padding: '20px 24px', maxWidth: 600 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 18 }}>
              Dati sanitari
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Gruppo sanguigno</label>
                <select className="input" style={{ width: '100%', maxWidth: 180, marginTop: 4 }}
                  value={gruppoSanguigno} onChange={e => setGruppoSanguigno(e.target.value)}>
                  <option value="">Non specificato</option>
                  {GRUPPO_SANGUE.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Allergie note</label>
                <textarea className="input" rows={2} style={{ width: '100%', marginTop: 4, resize: 'vertical' }}
                  value={allergie} onChange={e => setAllergie(e.target.value)}
                  placeholder="es. Penicillina, lattosio…" />
              </div>
              <div>
                <label className="label">Terapie in corso</label>
                <textarea className="input" rows={2} style={{ width: '100%', marginTop: 4, resize: 'vertical' }}
                  value={terapieInCorso} onChange={e => setTerapieInCorso(e.target.value)}
                  placeholder="Farmaci e trattamenti in atto…" />
              </div>
              <div>
                <label className="label">Note medico</label>
                <textarea className="input" rows={3} style={{ width: '100%', marginTop: 4, resize: 'vertical' }}
                  value={noteMedico} onChange={e => setNoteMedico(e.target.value)}
                  placeholder="Note riservate al personale medico…" />
              </div>
              <div>
                <button className="btn btn-primary btn-sm" onClick={salvaAnagrafica} disabled={saving}>
                  {saving ? 'Salvataggio…' : 'Salva modifiche'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 1: Infortuni ── */}
        {tab === 'infortuni' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setOpenInf(true)}>
                + Registra infortunio
              </button>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {infortuni.length === 0
                ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nessun infortunio registrato</div>
                : infortuni.map(i => {
                  const gg = i.data_infortunio && i.data_rientro_prevista
                    ? Math.ceil((new Date(i.data_rientro_prevista).getTime() - new Date(i.data_infortunio).getTime()) / 86400000)
                    : null
                  return (
                    <div key={i.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className={`badge ${gravitaColore[i.gravita] ?? 'badge-grigio'}`}>{i.gravita}</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{i.tipo}</span>
                          {i.zona_corpo && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.zona_corpo.replace(/_/g, ' ')}</span>}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(i.data_infortunio).toLocaleDateString('it-IT')}</span>
                      </div>
                      {i.diagnosi && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Diagnosi: {i.diagnosi}</div>}
                      {i.data_rientro_prevista && !i.data_rientro_effettiva && (
                        <div style={{ fontSize: 12, color: 'var(--accent-blue)', marginTop: 4 }}>
                          Rientro previsto: {new Date(i.data_rientro_prevista).toLocaleDateString('it-IT')}
                          {gg && <> · {gg} giorni</>}
                        </div>
                      )}
                      {i.data_rientro_effettiva && (
                        <div style={{ fontSize: 12, color: 'var(--accent-green)', marginTop: 4 }}>
                          ✓ Rientrato il {new Date(i.data_rientro_effettiva).toLocaleDateString('it-IT')}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* ── Tab 2: Visite ── */}
        {tab === 'visite' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setOpenVis(true)}>
                + Pianifica visita
              </button>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {visite.length === 0
                ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nessuna visita registrata</div>
                : visite.map(v => (
                  <div key={v.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {v.tipo?.replace(/_/g, ' ')}
                        {v.struttura && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{v.struttura}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(v.data).toLocaleDateString('it-IT')}
                        {v.medico && ` · ${v.medico}`}
                      </div>
                    </div>
                    {v.esito && <span className={`badge ${esitoBadge[v.esito] ?? 'badge-grigio'}`}>{v.esito.replace('_', ' ')}</span>}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Tab 3: Certificati ── */}
        {tab === 'certificati' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {certificati.length === 0
              ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nessun certificato</div>
              : certificati.map(c => {
                const scad = c.data_scadenza
                const giorni = scad ? Math.ceil((new Date(scad).getTime() - Date.now()) / 86400000) : null
                const badge = !scad ? 'badge-grigio'
                  : giorni !== null && giorni < 0 ? 'badge-rosso'
                    : giorni !== null && giorni <= 30 ? 'badge-ambra'
                      : 'badge-verde'
                return (
                  <div key={c.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize', marginBottom: 4 }}>
                        {c.tipo?.replace('_', ' ')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {c.data_rilascio && `Rilasciato: ${new Date(c.data_rilascio).toLocaleDateString('it-IT')}`}
                        {c.medico && ` · ${c.medico}`}
                        {c.struttura && ` · ${c.struttura}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {scad && (
                        <span className={`badge ${badge}`}>
                          Scade: {new Date(scad).toLocaleDateString('it-IT')}
                        </span>
                      )}
                      {giorni !== null && giorni >= 0 && giorni <= 30 && (
                        <div style={{ fontSize: 10, color: 'var(--accent-orange)', marginTop: 4 }}>
                          tra {giorni} giorni
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {clubId && (
        <>
          <FormInfortunio
            open={openInf}
            onClose={() => setOpenInf(false)}
            clubId={clubId}
            preselectedGiocatoreId={id}
            onSuccess={() => setRefreshInf(r => r + 1)}
          />
          <FormVisita
            open={openVis}
            onClose={() => setOpenVis(false)}
            clubId={clubId}
            preselectedGiocatoreId={id}
            onSuccess={() => setRefreshVis(r => r + 1)}
          />
        </>
      )}
    </div>
  )
}
