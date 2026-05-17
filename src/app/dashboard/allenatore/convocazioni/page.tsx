'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { BackButton, Toast, EmptyState } from '@/components/ui'

export default function ConvocazioniPage() {
  const supabase     = createClient()
  const searchParams = useSearchParams()
  const partitaIdParam = searchParams.get('partita')

  const [partite,       setPartite]       = useState<any[]>([])
  const [partitaSel,    setPartitaSel]    = useState<string>(partitaIdParam ?? '')
  const [giocatori,     setGiocatori]     = useState<any[]>([])
  const [convocazioni,  setConvocazioni]  = useState<Record<string, string>>({}) // giocatoreId → stato
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState<string | null>(null)
  const [toast,         setToast]         = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [invioInCorso,  setInvioInCorso]  = useState(false)

  // Carica partite future
  useEffect(() => {
    async function load() {
      const sq: any[] = await fetch('/api/squadre').then(r => r.json()).catch(() => [])
      const sqIds = Array.isArray(sq) ? sq.map(s => s.id) : []

      const { data: pp } = await supabase
        .from('partite')
        .select('id, avversario, data_ora, competizione, casa_trasferta, squadra_id, squadre(nome)')
        .in('squadra_id', sqIds.length ? sqIds : ['none'])
        .in('stato', ['programmata'])
        .gte('data_ora', new Date().toISOString())
        .order('data_ora')
      setPartite(pp ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Carica giocatori e convocazioni quando cambia la partita selezionata
  useEffect(() => {
    if (!partitaSel) return
    async function loadPartita() {
      setLoading(true)
      const partita = partite.find(p => p.id === partitaSel)
      if (!partita) { setLoading(false); return }

      const { data: tesserati } = await supabase
        .from('tesseramenti')
        .select('numero_maglia, giocatori(id, nome, cognome, ruolo_principale)')
        .eq('squadra_id', partita.squadra_id)
        .eq('stato', 'attivo')

      const { data: convs } = await supabase
        .from('convocazioni')
        .select('giocatore_id, stato_risposta')
        .eq('partita_id', partitaSel)

      const convMap: Record<string, string> = {}
      convs?.forEach(c => { convMap[c.giocatore_id] = c.stato_risposta })

      setGiocatori(
        (tesserati?.filter(t => t.giocatori).map(t => ({ ...t.giocatori, numero_maglia: t.numero_maglia })) ?? [])
          .sort((a: any, b: any) => a.cognome.localeCompare(b.cognome, 'it'))
      )
      setConvocazioni(convMap)
      setLoading(false)
    }
    loadPartita()
  }, [partitaSel, partite])

  const toggleConvocazione = async (giocatoreId: string, nuovoStato: 'confermato' | 'in_attesa' | 'rimosso') => {
    setSaving(giocatoreId)
    const statoConv = nuovoStato === 'rimosso' ? null : nuovoStato

    // Rimuovi
    if (nuovoStato === 'rimosso') {
      await supabase.from('convocazioni').delete()
        .eq('partita_id', partitaSel).eq('giocatore_id', giocatoreId)
      setConvocazioni(prev => { const n = { ...prev }; delete n[giocatoreId]; return n })
      setSaving(null)
      return
    }

    // Upsert convocazione
    const { error } = await supabase.from('convocazioni').upsert({
      partita_id:    partitaSel,
      giocatore_id:  giocatoreId,
      stato_risposta: nuovoStato,
    }, { onConflict: 'partita_id,giocatore_id' })

    if (!error) {
      setConvocazioni(prev => ({ ...prev, [giocatoreId]: nuovoStato }))
    }
    setSaving(null)
  }

  const inviaConvocazioni = async () => {
    setInvioInCorso(true)
    const daInviare = giocatori.filter(g => convocazioni[g.id])
    if (daInviare.length === 0) {
      setToast({ msg: 'Nessun giocatore convocato da notificare', tipo: 'error' })
      setInvioInCorso(false)
      return
    }

    try {
      const res = await fetch('/api/convocazioni/notifica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partita_id:    partitaSel,
          giocatori_ids: daInviare.map(g => g.id),
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? `Errore HTTP ${res.status}`)

      const n = json.notificati ?? daInviare.length
      const msg = n > 0
        ? `Notifica inviata a ${n} famiglie`
        : `${daInviare.length} giocatori convocati — nessuna famiglia registrata`
      setToast({ msg, tipo: 'success' })
    } catch (err: any) {
      setToast({ msg: err.message ?? "Errore durante l'invio", tipo: 'error' })
    } finally {
      setInvioInCorso(false)
    }
  }

  const partitaInfo = partite.find(p => p.id === partitaSel)
  const nConvocati  = Object.keys(convocazioni).length
  const nConfermati = Object.values(convocazioni).filter(s => s === 'confermato').length

  const ruoloShort: Record<string, string> = {
    portiere: 'POR', difensore_centrale: 'DC', terzino: 'TRZ',
    centrocampista_difensivo: 'CDM', centrocampista: 'CEN',
    trequartista: 'TRQ', ala: 'ALA', seconda_punta: '2AP', centravanti: 'ATT',
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Convocazioni</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Seleziona una partita e gestisci i convocati
        </p>
      </div>

      {/* Selettore partita */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 20 }}>
        <label className="label">Partita</label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            className="input"
            style={{ flex: 1 }}
            value={partitaSel}
            onChange={e => setPartitaSel(e.target.value)}
          >
            <option value="">Seleziona partita...</option>
            {partite.map(p => (
              <option key={p.id} value={p.id}>
                {(p.squadre as any)?.nome} vs {p.avversario} — {new Date(p.data_ora).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </option>
            ))}
          </select>
          {partitaSel && nConvocati > 0 && (
            <button
              className="btn btn-primary btn-sm"
              onClick={inviaConvocazioni}
              disabled={invioInCorso}
            >
              {invioInCorso ? 'Invio...' : `Invia convocazioni (${nConvocati})`}
            </button>
          )}
        </div>

        {partitaInfo && (
          <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--grigio-3)' }}>
              📅 {new Date(partitaInfo.data_ora).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              {new Date(partitaInfo.data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <span className={`badge ${partitaInfo.casa_trasferta === 'casa' ? 'badge-verde' : 'badge-grigio'}`}>
              {partitaInfo.casa_trasferta === 'casa' ? 'In casa' : 'In trasferta'}
            </span>
            {partitaInfo.competizione && (
              <span style={{ fontSize: 13, color: 'var(--grigio-4)' }}>{partitaInfo.competizione}</span>
            )}
          </div>
        )}
      </div>

      {!partitaSel ? (
        <EmptyState icon="🏟" title="Seleziona una partita" subtitle="Scegli la partita per cui gestire le convocazioni" />
      ) : loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 14 }}>
          Caricamento rosa...
        </div>
      ) : (
        <>
          {/* Contatori */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Convocati', v: nConvocati,                       c: 'var(--grigio)' },
              { label: 'Confermati', v: nConfermati,                     c: 'var(--verde)' },
              { label: 'In attesa', v: nConvocati - nConfermati,         c: 'var(--ambra)' },
              { label: 'Non conv.', v: giocatori.length - nConvocati,   c: 'var(--grigio-4)' },
            ].map(item => (
              <div key={item.label} className="stat-card" style={{ flex: 1, minWidth: 100, padding: '12px 16px' }}>
                <div className="stat-value" style={{ fontSize: 22, color: item.c }}>{item.v}</div>
                <div className="stat-label">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Lista giocatori */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--grigio-5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Rosa disponibile — {giocatori.length} giocatori</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => giocatori.forEach(g => toggleConvocazione(g.id, 'in_attesa'))}
                >
                  Convoca tutti
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setConvocazioni({})
                    supabase.from('convocazioni').delete().eq('partita_id', partitaSel)
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            <div>
              {giocatori.map(g => {
                const stato = convocazioni[g.id]
                const isSaving = saving === g.id
                const iniziali = `${g.nome[0]}${g.cognome[0]}`.toUpperCase()
                return (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '11px 18px',
                      borderBottom: '1px solid var(--grigio-6)',
                      borderLeft: `3px solid ${
                        stato === 'confermato' ? 'var(--verde)' :
                        stato === 'in_attesa'  ? 'var(--ambra)' :
                        'transparent'
                      }`,
                      opacity: isSaving ? 0.5 : 1,
                      transition: 'border-color 0.15s, opacity 0.15s',
                    }}
                  >
                    <div className="avatar" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0 }}>{iniziali}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{g.cognome} {g.nome}</span>
                        {g.numero_maglia && <span style={{ fontSize: 11, color: 'var(--grigio-4)', fontFamily: 'var(--font-mono)' }}>#{g.numero_maglia}</span>}
                        {g.ruolo_principale && (
                          <span className="badge badge-grigio" style={{ fontSize: 10 }}>{ruoloShort[g.ruolo_principale] ?? g.ruolo_principale}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => toggleConvocazione(g.id, stato === 'in_attesa' ? 'rimosso' : 'in_attesa')}
                        disabled={isSaving}
                        className="btn btn-sm"
                        style={{
                          background: stato === 'in_attesa' ? 'var(--ambra-lt)' : 'var(--grigio-6)',
                          color: stato === 'in_attesa' ? 'var(--ambra)' : 'var(--grigio-3)',
                          border: 'none',
                        }}
                      >
                        ✉ Convoca
                      </button>
                      <button
                        onClick={() => toggleConvocazione(g.id, stato === 'confermato' ? 'rimosso' : 'confermato')}
                        disabled={isSaving}
                        className="btn btn-sm"
                        style={{
                          background: stato === 'confermato' ? 'var(--verde-lt)' : 'var(--grigio-6)',
                          color: stato === 'confermato' ? 'var(--verde)' : 'var(--grigio-3)',
                          border: 'none',
                        }}
                      >
                        ✓ Confermato
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
