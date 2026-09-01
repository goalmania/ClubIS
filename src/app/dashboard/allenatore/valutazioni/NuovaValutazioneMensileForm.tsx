'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClubId } from '@/lib/club-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormField, FormSection, SectionCard, BackButton, Toast } from '@/components/ui'
import { ASSI_VALUTAZIONE, mediaAsse, tutteValutate, dettaglioVuoto, type AsseValutazione, type DettaglioAssi } from '@/lib/valutazioni-mensili'

function StelleInput({ value, onChange, size = 38, fontSize = 18 }: { value: number; onChange: (v: number) => void; size?: number; fontSize?: number }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{
            width: size, height: size, borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize,
            background: n <= value ? 'var(--accent)' : 'var(--gray-mid)',
            color: n <= value ? 'var(--black)' : 'var(--gray)',
          }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function StelleReadonly({ n }: { n: number }) {
  return (
    <span style={{ color: 'var(--accent)', fontSize: 16, letterSpacing: 1 }}>
      {'★'.repeat(n)}<span style={{ color: 'var(--gray-mid)' }}>{'★'.repeat(5 - n)}</span>
    </span>
  )
}

export default function NuovaValutazioneMensileForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const clubId = useClubId()

  const [giocatori, setGiocatori] = useState<{ id: string; nome: string; cognome: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  const [giocatoreId, setGiocatoreId] = useState('')
  const [mese, setMese] = useState(new Date().toISOString().slice(0, 7))
  const [dettaglio, setDettaglio] = useState<DettaglioAssi>(dettaglioVuoto())
  const [nota, setNota] = useState('')

  const setVoto = (asse: AsseValutazione, sottocategoria: string, v: number) => {
    setDettaglio(prev => ({ ...prev, [asse]: { ...prev[asse], [sottocategoria]: v } }))
  }

  useEffect(() => {
    async function load() {
      const sqArr: any[] = await fetch('/api/squadre').then(r => r.json()).catch(() => [])
      const sqIds = sqArr.map(s => s.id)

      const { data: tesserati } = await supabase
        .from('tesseramenti')
        .select('giocatori(id, nome, cognome)')
        .in('squadra_id', sqIds.length ? sqIds : ['none'])
        .eq('stato', 'attivo')

      const seen = new Map<string, { id: string; nome: string; cognome: string }>()
      for (const t of tesserati ?? []) {
        const g = t.giocatori as any
        if (g && !seen.has(g.id)) seen.set(g.id, g)
      }
      const players = Array.from(seen.values()).sort((a, b) => a.cognome.localeCompare(b.cognome))
      setGiocatori(players)

      const presel = searchParams.get('giocatore')
      if (presel && players.find(p => p.id === presel)) setGiocatoreId(presel)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const salva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!giocatoreId) { setToast({ msg: 'Seleziona un ragazzo', tipo: 'error' }); return }
    if (!tutteValutate(dettaglio)) { setToast({ msg: 'Assegna una valutazione su tutte le sottocategorie', tipo: 'error' }); return }
    if (!nota.trim()) { setToast({ msg: 'La nota per la famiglia è obbligatoria', tipo: 'error' }); return }
    if (!clubId) return
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from('valutazioni_mensili_scuola_calcio').insert({
        giocatore_id: giocatoreId,
        allenatore_id: user!.id,
        club_id: clubId,
        mese,
        tecnico: mediaAsse(dettaglio.tecnico),
        impegno: mediaAsse(dettaglio.impegno),
        rispetto_regole: mediaAsse(dettaglio.rispetto_regole),
        socializzazione: mediaAsse(dettaglio.socializzazione),
        dettaglio_assi: dettaglio,
        nota: nota.trim(),
      })

      if (error) {
        if (error.code === '23505') throw new Error('Hai già registrato una valutazione per questo ragazzo in questo mese.')
        throw error
      }
      setToast({ msg: 'Valutazione salvata', tipo: 'success' })
      setTimeout(() => router.push('/dashboard/allenatore/valutazioni'), 1000)
    } catch (err: any) {
      setToast({ msg: err.message ?? 'Errore', tipo: 'error' })
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <BackButton label="Torna alle valutazioni" />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Nuova valutazione mensile</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Visibile solo alla famiglia del ragazzo. Una sola valutazione per mese.
        </p>
      </div>

      <form onSubmit={salva}>
        <SectionCard>
          <FormSection title="Ragazzo e mese">
            <FormField label="Ragazzo" required>
              <select className="input" value={giocatoreId} onChange={e => setGiocatoreId(e.target.value)}>
                <option value="">Seleziona ragazzo...</option>
                {giocatori.map(g => (
                  <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Mese">
              <input className="input" type="month" value={mese} onChange={e => setMese(e.target.value)} />
            </FormField>
          </FormSection>
        </SectionCard>

        <SectionCard>
          <FormSection title="Valutazione dettagliata per asse">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {(Object.keys(ASSI_VALUTAZIONE) as AsseValutazione[]).map(asseKey => {
                const asse = ASSI_VALUTAZIONE[asseKey]
                const media = mediaAsse(dettaglio[asseKey])
                return (
                  <div key={asseKey} style={{ padding: '16px 18px', border: '1px solid var(--border-solid)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{asse.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray)' }}>{asse.hint}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 12 }}>
                        <div style={{ fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Voto asse</div>
                        {media > 0 ? <StelleReadonly n={media} /> : <span style={{ fontSize: 12, color: 'var(--gray)' }}>—</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                      {asse.sottocategorie.map(sc => (
                        <div key={sc.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <span style={{ fontSize: 13, color: 'var(--gray)' }}>{sc.label}</span>
                          <StelleInput
                            value={dettaglio[asseKey][sc.key] ?? 0}
                            onChange={v => setVoto(asseKey, sc.key, v)}
                            size={28}
                            fontSize={13}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </FormSection>
        </SectionCard>

        <SectionCard>
          <FormSection title="Nota per la famiglia">
            <FormField label="Progressi del mese" required hint="Testo costruttivo: cosa è andato bene, cosa migliorare. Non un giudizio secco.">
              <textarea
                className="input"
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Questo mese ha lavorato molto bene sul controllo palla, continua così anche nel gioco di squadra..."
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </FormField>
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
