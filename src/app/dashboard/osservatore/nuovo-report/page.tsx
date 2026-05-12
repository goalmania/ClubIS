'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FormField, FormGrid, FormSection, SectionCard, Select, BackButton, Toast, RatingInput } from '@/components/ui'

export default function NuovoReportScoutingPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  // Giocatore
  const [nomeGiocatore,      setNomeGiocatore]      = useState('')
  const [clubAttuale,        setClubAttuale]        = useState('')
  const [dataOss,            setDataOss]            = useState(new Date().toISOString().split('T')[0])
  const [partitaOss,         setPartitaOss]         = useState('')
  const [ruoloOsservato,     setRuoloOsservato]     = useState('')
  const [etaStimata,         setEtaStimata]         = useState('')
  const [regioneProvenienza, setRegioneProvenienza] = useState('')
  const [nazioneProvenienza, setNazioneProvenienza] = useState('Italia')

  // Voti
  const [tecnica,  setTecnica]  = useState<number | null>(null)
  const [tattica,  setTattica]  = useState<number | null>(null)
  const [fisico,   setFisico]   = useState<number | null>(null)
  const [mentale,  setMentale]  = useState<number | null>(null)

  // Qualitativo
  const [potenziale,    setPotenziale]    = useState('medio')
  const [puntiForzaRaw, setPuntiForzaRaw] = useState('')
  const [puntiDebRaw,   setPuntiDebRaw]   = useState('')
  const [noteLibere,    setNoteLibere]    = useState('')
  const [votoGlobale,   setVotoGlobale]   = useState<number | null>(null)

  const mediaCalcolata = () => {
    const voti = [tecnica, tattica, fisico, mentale].filter(v => v !== null) as number[]
    if (!voti.length) return null
    return parseFloat((voti.reduce((s, v) => s + v, 0) / voti.length).toFixed(1))
  }

  const salva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeGiocatore.trim()) { setToast({ msg: 'Inserisci il nome del giocatore', tipo: 'error' }); return }
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: utente }   = await supabase.from('utenti').select('club_id').eq('id', user!.id).single()

      const media = mediaCalcolata()

      const { error } = await supabase.from('report_scouting').insert({
        nome_giocatore_ext:   nomeGiocatore.trim(),
        club_attuale_ext:     clubAttuale.trim() || null,
        osservatore_id:       user!.id,
        club_richiedente_id:  utente!.club_id,
        data_osservazione:    dataOss,
        partita_osservata:    partitaOss.trim() || null,
        tecnica:              tecnica ?? null,
        tattica:              tattica ?? null,
        fisico:               fisico  ?? null,
        mentale:              mentale ?? null,
        voto_globale:         votoGlobale ?? (media ? Math.round(media) : null),
        potenziale,
        punti_forza:          puntiForzaRaw.trim() || null,
        punti_debolezza:      puntiDebRaw.trim() || null,
        note_libere:          noteLibere.trim() || null,
        esito:                'in_valutazione',
        visibile_ds:          true,
        regione_provenienza:  regioneProvenienza.trim() || null,
        nazione_provenienza:  nazioneProvenienza.trim() || 'Italia',
        ruolo_osservato:      ruoloOsservato || null,
        eta_stimata:          etaStimata ? parseInt(etaStimata) : null,
      })

      if (error) throw error
      setToast({ msg: 'Report salvato', tipo: 'success' })
      setTimeout(() => router.push('/dashboard/osservatore/report'), 1000)
    } catch (err: any) {
      setToast({ msg: err.message ?? 'Errore', tipo: 'error' })
      setLoading(false)
    }
  }

  const media = mediaCalcolata()
  const coloreVoto = (v: number | null) => {
    if (!v) return 'var(--grigio-4)'
    return v >= 7 ? 'var(--verde)' : v >= 5 ? 'var(--ambra)' : 'var(--rosso)'
  }

  const REGIONI_OPTIONS = [
    "Valle d'Aosta", 'Piemonte', 'Lombardia', 'Trentino-Alto Adige', 'Veneto',
    'Friuli-Venezia Giulia', 'Liguria', 'Emilia-Romagna', 'Toscana', 'Umbria',
    'Marche', 'Lazio', 'Abruzzo', 'Molise', 'Campania',
    'Puglia', 'Basilicata', 'Calabria', 'Sicilia', 'Sardegna',
  ].map(r => ({ value: r, label: r }))

  const ruoliOptions = [
    { value: 'portiere', label: 'Portiere' },
    { value: 'difensore_centrale', label: 'Difensore centrale' },
    { value: 'terzino', label: 'Terzino' },
    { value: 'centrocampista_difensivo', label: 'Mediano' },
    { value: 'centrocampista', label: 'Centrocampista' },
    { value: 'trequartista', label: 'Trequartista' },
    { value: 'ala', label: 'Ala' },
    { value: 'seconda_punta', label: 'Seconda punta' },
    { value: 'centravanti', label: 'Centravanti' },
  ]

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <BackButton label="Torna ai report" />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Nuovo report scouting</h1>
        <p style={{ fontSize: 14, color: 'var(--grigio-3)', marginTop: 4 }}>
          Il report sarà visibile automaticamente al Direttore Sportivo.
        </p>
      </div>

      <form onSubmit={salva}>

        {/* Identità giocatore */}
        <SectionCard>
          <FormSection title="Giocatore osservato">
            <FormGrid cols={2}>
              <FormField label="Nome e cognome" required>
                <input className="input" value={nomeGiocatore} onChange={e => setNomeGiocatore(e.target.value)} placeholder="Marco Bianchi" />
              </FormField>
              <FormField label="Club attuale">
                <input className="input" value={clubAttuale} onChange={e => setClubAttuale(e.target.value)} placeholder="A.S.D. Barletta" />
              </FormField>
            </FormGrid>
            <FormGrid cols={3}>
              <FormField label="Data osservazione">
                <input className="input" type="date" value={dataOss} onChange={e => setDataOss(e.target.value)} />
              </FormField>
              <FormField label="Ruolo osservato">
                <Select value={ruoloOsservato} onChange={setRuoloOsservato} options={ruoliOptions} placeholder="Seleziona..." />
              </FormField>
              <FormField label="Età stimata">
                <input className="input" type="number" min={10} max={45} value={etaStimata} onChange={e => setEtaStimata(e.target.value)} placeholder="23" />
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Regione di provenienza" hint="Per visualizzazione sulla mappa">
                <Select
                  value={regioneProvenienza}
                  onChange={setRegioneProvenienza}
                  options={REGIONI_OPTIONS}
                  placeholder="Seleziona regione..."
                />
              </FormField>
              <FormField label="Nazione" hint="Per giocatori stranieri">
                <input className="input" value={nazioneProvenienza} onChange={e => setNazioneProvenienza(e.target.value)} placeholder="Italia" />
              </FormField>
            </FormGrid>
            <FormField label="Partita osservata" hint="Es. Barletta vs Altamura — Serie D Girone H">
              <input className="input" value={partitaOss} onChange={e => setPartitaOss(e.target.value)} placeholder="Barletta vs Altamura — 08/04/2025" />
            </FormField>
          </FormSection>
        </SectionCard>

        {/* Voti per area */}
        <SectionCard>
          <FormSection title="Valutazione per area">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { label: 'Tecnica',  hint: 'Primo controllo, passaggio, dribbling, conclusione', val: tecnica,  set: setTecnica },
                { label: 'Tattica',  hint: 'Posizionamento, lettura gioco, pressing, transizioni', val: tattica,  set: setTattica },
                { label: 'Fisico',   hint: 'Velocità, esplosività, resistenza, duelli aerei',    val: fisico,   set: setFisico },
                { label: 'Mentale',  hint: 'Determinazione, personalità, reazione agli errori',   val: mentale,  set: setMentale },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', gap: 20,
                  padding: '14px 16px',
                  border: '1px solid var(--grigio-5)', borderRadius: 10,
                  background: item.val ? (item.val >= 7 ? 'var(--verde-lt)' : item.val >= 5 ? 'var(--ambra-lt)' : 'var(--rosso-lt)') : 'white',
                  transition: 'background 0.2s',
                }}>
                  <div style={{ width: 90, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 2, lineHeight: 1.3 }}>{item.hint}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <RatingInput value={item.val} onChange={item.set} />
                  </div>
                  {item.val && (
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-mono)',
                      background: item.val >= 7 ? 'var(--verde)' : item.val >= 5 ? 'var(--ambra)' : 'var(--rosso)',
                      color: 'white',
                    }}>
                      {item.val}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Voto globale */}
            <div style={{ marginTop: 20, padding: '16px 18px', background: 'var(--grigio-6)', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Voto globale</div>
                  <div style={{ fontSize: 12, color: 'var(--grigio-4)' }}>
                    Media calcolata: {media ?? '—'} — Puoi sovrascriverlo
                  </div>
                </div>
                {(votoGlobale ?? media) && (
                  <div style={{
                    width: 50, height: 50, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 22, fontFamily: 'var(--font-mono)',
                    background: (votoGlobale ?? media) !== null && (votoGlobale ?? media)! >= 7 ? 'var(--verde)' : (votoGlobale ?? media)! >= 5 ? 'var(--ambra)' : 'var(--rosso)',
                    color: 'white',
                  }}>
                    {votoGlobale ?? media}
                  </div>
                )}
              </div>
              <RatingInput value={votoGlobale} onChange={setVotoGlobale} />
              {votoGlobale && (
                <button type="button" onClick={() => setVotoGlobale(null)} style={{ fontSize: 11, color: 'var(--grigio-4)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6 }}>
                  Usa media automatica
                </button>
              )}
            </div>
          </FormSection>
        </SectionCard>

        {/* Qualitativo */}
        <SectionCard>
          <FormSection title="Analisi qualitativa">
            <FormField label="Potenziale">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { value: 'basso',       label: 'Basso',       c: 'badge-grigio' },
                  { value: 'medio',       label: 'Medio',       c: 'badge-blu' },
                  { value: 'alto',        label: 'Alto',        c: 'badge-verde' },
                  { value: 'eccezionale', label: 'Eccezionale', c: 'badge-viola' },
                ].map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPotenziale(p.value)}
                    className={`badge ${p.c}`}
                    style={{
                      padding: '6px 16px', fontSize: 13, cursor: 'pointer',
                      border: potenziale === p.value ? '2px solid currentColor' : '2px solid transparent',
                      fontWeight: potenziale === p.value ? 600 : 400,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Punti di forza" hint="Separati da virgola o a testo libero">
              <textarea
                className="input"
                value={puntiForzaRaw}
                onChange={e => setPuntiForzaRaw(e.target.value)}
                placeholder="Ottimo nel duello aereo, progressione con palla, leadership in campo..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </FormField>
            <FormField label="Punti di debolezza">
              <textarea
                className="input"
                value={puntiDebRaw}
                onChange={e => setPuntiDebRaw(e.target.value)}
                placeholder="Piede debole, lento nelle transizioni difensive..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </FormField>
            <FormField label="Note libere" hint="Commento generale sull'osservazione e raccomandazione">
              <textarea
                className="input"
                value={noteLibere}
                onChange={e => setNoteLibere(e.target.value)}
                placeholder="Giocatore interessante da seguire nelle prossime settimane. Raccomando un secondo sopralluogo..."
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </FormField>
          </FormSection>
        </SectionCard>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 32 }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Salvataggio...' : 'Salva report'}
          </button>
        </div>
      </form>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
