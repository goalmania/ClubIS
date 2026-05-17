'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NuovaBriefPage() {
  const router = useRouter()
  const params = useSearchParams()
  const partitaIdParam = params.get('partita_id')

  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [partite, setPartite] = useState<any[]>([])

  const [form, setForm] = useState({
    partita_id: partitaIdParam ?? '',
    data_evento: '',
    titolo_evento: '',
    campo_impianto: '',
    ora_inizio: '',
    competizione: '',
    logo_home_url: '',
    logo_away_url: '',
    colori_preferiti: '',
    note_grafiche: '',
    stato: 'bozza',
  })

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const squadreData = await fetch('/api/squadre').then(r => r.json()).catch(() => [])
      const sqIds: string[] = Array.isArray(squadreData) ? squadreData.map((s: any) => s.id) : []
      if (!sqIds.length) return
      const { data: p } = await supabase
        .from('partite')
        .select('id, avversario, data_ora, competizione, casa_trasferta, squadre(nome)')
        .in('squadra_id', sqIds)
        .order('data_ora', { ascending: false })
        .limit(30)
      setPartite(p ?? [])

      // Pre-popola da partita se passata come param
      if (partitaIdParam && p) {
        const partita = p.find((x: any) => x.id === partitaIdParam)
        if (partita) {
          const squadraNome = (partita as any).squadre?.nome ?? 'Noi'
          const titolo = partita.casa_trasferta === 'casa'
            ? `${squadraNome} vs ${partita.avversario}`
            : `${partita.avversario} vs ${squadraNome}`
          setForm(f => ({
            ...f,
            partita_id: partita.id,
            data_evento: partita.data_ora.slice(0, 10),
            titolo_evento: titolo,
            ora_inizio: partita.data_ora.slice(11, 16),
            competizione: partita.competizione ?? '',
          }))
        }
      }
    })()
  }, [partitaIdParam])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const salva = async () => {
    if (!form.data_evento || !form.titolo_evento) {
      setErrore('Data evento e titolo sono obbligatori')
      return
    }
    setSaving(true)
    setErrore(null)
    const res = await fetch('/api/ufficio-stampa/brief-locandine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partita_id: form.partita_id || undefined,
        data_evento: form.data_evento,
        titolo_evento: form.titolo_evento,
        campo_impianto: form.campo_impianto || undefined,
        ora_inizio: form.ora_inizio || undefined,
        competizione: form.competizione || undefined,
        logo_home_url: form.logo_home_url || undefined,
        logo_away_url: form.logo_away_url || undefined,
        colori_preferiti: form.colori_preferiti || undefined,
        note_grafiche: form.note_grafiche || undefined,
        stato: form.stato,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErrore(json.error ?? 'Errore durante il salvataggio')
      setSaving(false)
      return
    }
    router.push('/dashboard/ufficio-stampa/locandine')
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    background: '#1a1a1a', border: '1px solid var(--border-solid)',
    borderRadius: 2, color: 'var(--white)', fontSize: 13,
    fontFamily: 'var(--font-sans)', outline: 'none',
  } as const

  const labelStyle = {
    display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
    fontWeight: 700, textTransform: 'uppercase' as const,
    letterSpacing: '0.15em', color: 'var(--grigio-3)', marginBottom: 6,
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>
          Nuovo brief locandina
        </h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Raccoglie i dati strutturati per il grafico esterno
        </p>
      </div>

      <div className="card" style={{ padding: 24 }}>
        {errore && (
          <div style={{ padding: '10px 14px', background: 'var(--rosso-lt)', border: '1px solid var(--rosso-bd)', borderRadius: 2, color: 'var(--rosso)', fontSize: 13, marginBottom: 20 }}>
            {errore}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Collega a partita (opzionale) */}
          {partite.length > 0 && (
            <div>
              <label style={labelStyle}>Collega a una partita (opzionale)</label>
              <select value={form.partita_id} onChange={e => {
                const pid = e.target.value
                set('partita_id', pid)
                if (pid) {
                  const p = partite.find(x => x.id === pid)
                  if (p) {
                    const squadraNome = (p as any).squadre?.nome ?? 'Noi'
                    const titolo = p.casa_trasferta === 'casa'
                      ? `${squadraNome} vs ${p.avversario}`
                      : `${p.avversario} vs ${squadraNome}`
                    setForm(f => ({
                      ...f,
                      partita_id: pid,
                      data_evento: p.data_ora.slice(0, 10),
                      titolo_evento: titolo,
                      ora_inizio: p.data_ora.slice(11, 16),
                      competizione: p.competizione ?? '',
                    }))
                  }
                }
              }} style={inputStyle}>
                <option value="">— Nessuna partita —</option>
                {partite.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.data_ora.slice(0, 10)} · {p.avversario} ({p.competizione ?? 'amichevole'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Titolo evento */}
          <div>
            <label style={labelStyle}>Titolo evento / Gara *</label>
            <input
              type="text" placeholder="es. ASD Calcio vs Rivale FC"
              value={form.titolo_evento} onChange={e => set('titolo_evento', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Data e ora */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Data evento *</label>
              <input type="date" value={form.data_evento} onChange={e => set('data_evento', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Ora inizio</label>
              <input type="time" value={form.ora_inizio} onChange={e => set('ora_inizio', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Competizione e campo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Competizione</label>
              <input
                type="text" placeholder="es. Campionato Eccellenza"
                value={form.competizione} onChange={e => set('competizione', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Campo / Impianto</label>
              <input
                type="text" placeholder="es. Stadio Comunale"
                value={form.campo_impianto} onChange={e => set('campo_impianto', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Logo home/away */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>URL logo squadra casa</label>
              <input
                type="url" placeholder="https://..."
                value={form.logo_home_url} onChange={e => set('logo_home_url', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>URL logo squadra ospite</label>
              <input
                type="url" placeholder="https://..."
                value={form.logo_away_url} onChange={e => set('logo_away_url', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Colori preferiti */}
          <div>
            <label style={labelStyle}>Colori preferiti</label>
            <input
              type="text" placeholder="es. Bianco e verde, stile minimal…"
              value={form.colori_preferiti} onChange={e => set('colori_preferiti', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Note grafiche */}
          <div>
            <label style={labelStyle}>Note per il grafico</label>
            <textarea
              placeholder="Indicazioni specifiche, riferimenti a stili precedenti, priorità…"
              value={form.note_grafiche} onChange={e => set('note_grafiche', e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Stato */}
          <div>
            <label style={labelStyle}>Stato iniziale</label>
            <select value={form.stato} onChange={e => set('stato', e.target.value)} style={inputStyle}>
              <option value="bozza">Bozza</option>
              <option value="inviato_grafico">Invia al grafico</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <button
              onClick={salva}
              disabled={saving}
              style={{
                padding: '10px 24px', background: 'var(--accent)', color: '#0a0a0a',
                border: 'none', borderRadius: 2, cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Salvataggio…' : 'Salva brief'}
            </button>
            <button
              onClick={() => router.back()}
              style={{
                padding: '10px 20px', background: 'transparent', color: 'var(--grigio-3)',
                border: '1px solid var(--border-solid)', borderRadius: 2, cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontSize: 12,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
