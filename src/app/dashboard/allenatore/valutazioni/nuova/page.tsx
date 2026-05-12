'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormField, FormSection, SectionCard, BackButton, Toast, RatingInput } from '@/components/ui'

export default function NuovaValutazionePage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const [giocatori, setGiocatori] = useState<{ id: string; nome: string; cognome: string; ruolo_principale: string | null; categoria_eta: string }[]>([])
  const [loading,   setLoading]   = useState(false)
  const [toast,     setToast]     = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  const [giocatoreId,      setGiocatoreId]      = useState('')
  const [data,             setData]             = useState(new Date().toISOString().split('T')[0])
  const [tecnica,          setTecnica]          = useState<number | null>(null)
  const [tattica,          setTattica]          = useState<number | null>(null)
  const [fisico,           setFisico]           = useState<number | null>(null)
  const [mentale,          setMentale]          = useState<number | null>(null)
  const [note,             setNote]             = useState('')
  const [visibileFamiglia, setVisibileFamiglia] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: utente }   = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()
      const { data: sq } = await supabase
        .from('squadre').select('id, categoria_eta')
        .eq('club_id', utente!.club_id)
        .eq('allenatore_id', user!.id)
        .eq('attiva', true)

      const sqMap: Record<string, string> = {}
      for (const s of sq ?? []) sqMap[s.id] = s.categoria_eta ?? ''

      const sqIds = Object.keys(sqMap)

      const { data: tesserati } = await supabase
        .from('tesseramenti')
        .select('squadra_id, giocatori(id, nome, cognome, ruolo_principale)')
        .in('squadra_id', sqIds.length ? sqIds : ['none'])
        .eq('stato', 'attivo')

      // Deduplica: se un giocatore è in più squadre prendi la più "adulta"
      const PRIO: Record<string, number> = { prima_squadra: 0, juniores: 1, primavera: 2 }
      const seen = new Map<string, { g: any; categoria_eta: string }>()
      for (const t of tesserati ?? []) {
        const g = t.giocatori as any
        if (!g) continue
        const cat = sqMap[t.squadra_id] ?? ''
        const existing = seen.get(g.id)
        if (!existing || (PRIO[cat] ?? 99) < (PRIO[existing.categoria_eta] ?? 99)) {
          seen.set(g.id, { g, categoria_eta: cat })
        }
      }
      const players = Array.from(seen.values())
        .map(({ g, categoria_eta }) => ({ ...g, categoria_eta }))
        .sort((a, b) => (a.cognome ?? '').localeCompare(b.cognome ?? ''))
      setGiocatori(players)

      // Pre-seleziona il giocatore passato via query string
      const presel = searchParams.get('giocatore')
      if (presel && players.find(p => p.id === presel)) {
        setGiocatoreId(presel)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const cat = giocatori.find(g => g.id === giocatoreId)?.categoria_eta ?? ''
    if (['prima_squadra', 'juniores'].includes(cat)) setVisibileFamiglia(false)
  }, [giocatoreId, giocatori])

  const mediaVoto = () => {
    const voti = [tecnica, tattica, fisico, mentale].filter(v => v !== null) as number[]
    if (!voti.length) return null
    return (voti.reduce((s, v) => s + v, 0) / voti.length).toFixed(1)
  }

  const coloreMedia = (m: string | null) => {
    if (!m) return 'var(--grigio-4)'
    const n = parseFloat(m)
    return n >= 7 ? 'var(--verde)' : n >= 5 ? 'var(--ambra)' : 'var(--rosso)'
  }

  const salva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!giocatoreId) { setToast({ msg: 'Seleziona un giocatore', tipo: 'error' }); return }
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: utente }   = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()

      const { error } = await supabase.from('valutazioni_tecniche').insert({
        giocatore_id:      giocatoreId,
        allenatore_id:     user!.id,
        club_id:           utente!.club_id,
        data,
        tecnica:           tecnica ?? null,
        tattica:           tattica ?? null,
        fisico:            fisico  ?? null,
        mentale:           mentale ?? null,
        note:              note.trim() || null,
        visibile_famiglia: visibileFamiglia,
      })

      if (error) throw error
      setToast({ msg: 'Valutazione salvata', tipo: 'success' })
      setTimeout(() => router.push('/dashboard/allenatore'), 1000)
    } catch (err: any) {
      setToast({ msg: err.message ?? 'Errore', tipo: 'error' })
      setLoading(false)
    }
  }

  const giocatoreSelezionato = giocatori.find(g => g.id === giocatoreId)
  const media = mediaVoto()
  const nascondiVisibilita = ['prima_squadra', 'juniores'].includes(giocatoreSelezionato?.categoria_eta ?? '')

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <BackButton label="Torna alla dashboard" />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Nuova valutazione tecnica</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Valuta le qualità del giocatore da 1 a 10 in ogni area.
        </p>
      </div>

      <form onSubmit={salva}>
        <SectionCard>
          <FormSection title="Giocatore e data">
            <FormField label="Giocatore" required>
              <select className="input" value={giocatoreId} onChange={e => setGiocatoreId(e.target.value)}>
                <option value="">Seleziona giocatore...</option>
                {giocatori.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Data valutazione">
              <input className="input" type="date" value={data} onChange={e => setData(e.target.value)} />
            </FormField>
          </FormSection>
        </SectionCard>

        {/* Voti */}
        <SectionCard>
          <FormSection title="Valutazione per area">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {[
                { label: 'Tecnica',  hint: 'Controllo palla, dribbling, passaggio, tiro', val: tecnica,  set: setTecnica },
                { label: 'Tattica',  hint: 'Lettura del gioco, posizionamento, pressing',  val: tattica,  set: setTattica },
                { label: 'Fisico',   hint: 'Velocità, resistenza, forza, atletismo',        val: fisico,   set: setFisico },
                { label: 'Mentale',  hint: 'Concentrazione, leadership, reazione agli errori', val: mentale, set: setMentale },
              ].map(item => (
                <div key={item.label} style={{
                  padding: '16px 18px',
                  border: '1px solid var(--grigio-5)',
                  borderRadius: 10,
                  background: item.val ? (item.val >= 7 ? 'var(--verde-lt)' : item.val >= 5 ? 'var(--ambra-lt)' : 'var(--rosso-lt)') : 'var(--grigio-6)',
                  transition: 'background 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--grigio-4)', marginTop: 2 }}>{item.hint}</div>
                    </div>
                    {item.val && (
                      <div style={{
                        width: 40, height: 40, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-mono)',
                        background: item.val >= 7 ? 'var(--verde)' : item.val >= 5 ? 'var(--ambra)' : 'var(--rosso)',
                        color: 'white',
                      }}>
                        {item.val}
                      </div>
                    )}
                  </div>
                  <RatingInput value={item.val} onChange={item.set} />
                </div>
              ))}
            </div>

            {/* Media */}
            {media && (
              <div style={{
                marginTop: 20, padding: '14px 18px',
                borderRadius: 10, textAlign: 'center',
                background: 'white', border: '1px solid var(--grigio-5)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--grigio-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Media voti
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: coloreMedia(media), fontFamily: 'var(--font-mono)' }}>
                  {media}
                </div>
              </div>
            )}
          </FormSection>
        </SectionCard>

        {/* Note */}
        <SectionCard>
          <FormSection title="Note e visibilità">
            <FormField label="Note qualitative" hint="Commento libero sulle prestazioni e la crescita del giocatore">
              <textarea
                className="input"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Buona progressione nel lavoro difensivo, ancora da migliorare la lettura del gioco senza palla..."
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </FormField>

            {!nascondiVisibilita && (
              <label style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={visibileFamiglia}
                  onChange={e => setVisibileFamiglia(e.target.checked)}
                  style={{ marginTop: 3, accentColor: 'var(--verde)' }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Rendi visibile alla famiglia</div>
                  <div style={{ fontSize: 12, color: 'var(--grigio-4)', marginTop: 2 }}>
                    I genitori vedranno questa valutazione nell&apos;app famiglia. Le note private non sono incluse.
                  </div>
                </div>
              </label>
            )}
          </FormSection>
        </SectionCard>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 32 }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Salvataggio...' : 'Salva valutazione'}
          </button>
        </div>
      </form>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
