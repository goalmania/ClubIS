'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast } from '@/components/ui'

const TEMPLATE_CSV =
  'Data,Ora,Squadra_Casa,Squadra_Ospite,Campo,Giornata\n' +
  '07/09/2025,15:30,ASD Esempio FC,Avversario Calcio,Stadio Comunale,1\n' +
  '14/09/2025,16:00,Avversario United,ASD Esempio FC,Campo Nord,2\n'

interface RigaPartita {
  data_ora: string
  avversario: string
  casa_trasferta: 'casa' | 'trasferta' | 'neutro'
  campo: string
  giornata: number | undefined
  raw: Record<string, string>
  errore?: string
  non_rilevante?: boolean   // partita che non riguarda il club
}

// Converte DD/MM/YYYY o YYYY-MM-DD in YYYY-MM-DD
function parsaData(s: string): string | null {
  s = s.trim()
  // formato italiano DD/MM/YYYY o DD-MM-YYYY
  const mIT = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/)
  if (mIT) {
    const [, g, m, a] = mIT
    return `${a}-${m.padStart(2, '0')}-${g.padStart(2, '0')}`
  }
  // formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // formato YYYY/MM/DD
  const mISO = s.match(/^(\d{4})[/](\d{2})[/](\d{2})$/)
  if (mISO) return `${mISO[1]}-${mISO[2]}-${mISO[3]}`
  return null
}

function parseCSV(text: string): Array<Record<string, string>> {
  const righe = text.trim().split('\n').filter(r => r.trim())
  if (righe.length < 2) return []
  const headers = righe[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').trim())
  return righe.slice(1).map(riga => {
    const valori = riga.split(',').map(v => v.trim().replace(/^"|"$/g, '').trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = valori[i] ?? '' })
    return row
  })
}

function elaboraRiga(row: Record<string, string>, nomeClub: string): RigaPartita {
  const dataRaw   = row['Data'] ?? ''
  const ora       = row['Ora'] ?? '00:00'
  const squCasa   = row['Squadra_Casa'] ?? ''
  const squOspite = row['Squadra_Ospite'] ?? ''
  const campo     = row['Campo'] ?? ''
  const giornataRaw = row['Giornata'] ?? ''

  if (!dataRaw) {
    return { data_ora: '', avversario: '', casa_trasferta: 'neutro', campo, giornata: undefined, raw: row, errore: 'Data mancante' }
  }

  const dataISO = parsaData(dataRaw)
  if (!dataISO) {
    return { data_ora: '', avversario: '', casa_trasferta: 'neutro', campo, giornata: undefined, raw: row, errore: `Formato data non riconosciuto: "${dataRaw}"` }
  }

  const data_ora = `${dataISO}T${ora}:00`
  const giornata = giornataRaw ? parseInt(giornataRaw, 10) : undefined

  // Se nomeClub non impostato, importa tutto come neutro
  if (!nomeClub.trim()) {
    return { data_ora, avversario: squOspite || squCasa, casa_trasferta: 'neutro', campo, giornata, raw: row }
  }

  const norm = (s: string) => s.toLowerCase().trim()
  const clubNorm  = norm(nomeClub)
  const casaNorm  = norm(squCasa)
  const ospiteNorm = norm(squOspite)

  const matchCasa   = casaNorm.includes(clubNorm) || clubNorm.includes(casaNorm)
  const matchOspite = ospiteNorm.includes(clubNorm) || clubNorm.includes(ospiteNorm)

  if (matchCasa) {
    return { data_ora, avversario: squOspite, casa_trasferta: 'casa', campo, giornata, raw: row }
  }
  if (matchOspite) {
    return { data_ora, avversario: squCasa, casa_trasferta: 'trasferta', campo, giornata, raw: row }
  }

  // Partita che non riguarda il club: la marchiamo ma non come errore
  return {
    data_ora, avversario: `${squCasa} vs ${squOspite}`,
    casa_trasferta: 'neutro', campo, giornata, raw: row,
    non_rilevante: true,
  }
}

interface Squadra { id: string; nome: string; categoria_eta: string }

export default function ImportCalendarioFIGC() {
  const router  = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [nomeClub,          setNomeClub]          = useState('')
  const [clubAutocaricato,  setClubAutocaricato]  = useState(false)
  const [squadre,           setSquadre]           = useState<Squadra[]>([])
  const [squadraId,         setSquadraId]         = useState('')
  const [partite,           setPartite]           = useState<RigaPartita[]>([])
  const [mostraNonRilevanti, setMostraNonRilevanti] = useState(false)
  const [modalitaConflitto, setModalitaConflitto] = useState<'salta' | 'sovrascrivi' | 'aggiorna_campo'>('salta')
  const [importing,         setImporting]         = useState(false)
  const [parsandoPdf,       setParsandoPdf]       = useState(false)
  const [testoPdfGrezzo,    setTestoPdfGrezzo]    = useState<string | null>(null)
  const [risultato,         setRisultato]         = useState<{ importate: number; saltate: number; conflitti: number } | null>(null)
  const [toast,             setToast]             = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  // Carica il nome del club e le squadre attive usando getUserContext (rispetta impersonazione)
  useEffect(() => {
    async function caricaClub() {
      const [ctxData, squadreData] = await Promise.all([
        fetch('/api/user-context').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/squadre').then(r => r.json()).catch(() => []),
      ])
      if (!ctxData?.clubId) return

      // Carica il nome del club
      const { data: clubRes } = await supabase
        .from('clubs').select('nome').eq('id', ctxData.clubId).single()
      if (clubRes?.nome) {
        setNomeClub(clubRes.nome)
        setClubAutocaricato(true)
      }

      const squadreArr: Squadra[] = Array.isArray(squadreData) ? squadreData : []
      if (squadreArr.length) {
        setSquadre(squadreArr)
        const prima = squadreArr.find(s => s.categoria_eta === 'prima_squadra')
        setSquadraId(prima?.id ?? squadreArr[0].id)
      }
    }
    caricaClub()
  }, [])

  const elaboraFile = (testo: string, club: string) => {
    const righe = parseCSV(testo)
    setPartite(righe.map(r => elaboraRiga(r, club)))
    setRisultato(null)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const nome = file.name.toLowerCase()
    if (nome.endsWith('.pdf') || file.type === 'application/pdf') {
      await elaboraPDF(file, nomeClub)
    } else if (nome.endsWith('.xlsx') || nome.endsWith('.xls') || file.type.includes('spreadsheet')) {
      await elaboraXLSX(file, nomeClub)
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => elaboraFile(ev.target?.result as string, nomeClub)
      reader.readAsText(file, 'UTF-8')
    }
  }

  const elaboraXLSX = async (file: File, club: string) => {
    setParsandoPdf(true)
    setPartite([])
    setRisultato(null)
    setTestoPdfGrezzo(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      let res: Response
      try {
        res = await fetch('/api/figc/parse-calendario-xlsx', { method: 'POST', body: fd })
      } catch (networkErr: any) {
        setToast({ msg: 'Errore di rete durante il caricamento del file: ' + (networkErr?.message ?? 'connessione fallita'), tipo: 'error' })
        return
      }
      let data: any
      try {
        data = await res.json()
      } catch {
        setToast({ msg: `Errore server (${res.status}) durante il parsing del file`, tipo: 'error' })
        return
      }
      if (!res.ok) {
        setToast({ msg: data?.error ?? `Errore ${res.status} durante il parsing del file`, tipo: 'error' })
        return
      }
      if (data.testo_grezzo) setTestoPdfGrezzo(data.testo_grezzo)
      if (!data.righe?.length) {
        setToast({ msg: 'Nessuna partita rilevata nel file XLSX. Verifica che il formato sia quello della FIGC Serie D.', tipo: 'error' })
        return
      }
      const righeConvertite: RigaPartita[] = data.righe.map((r: any) => {
        const row: Record<string, string> = {
          Data: r.data_ora?.slice(0, 10)?.split('-').reverse().join('/') ?? '',
          Ora: r.data_ora?.slice(11, 16) ?? '00:00',
          Squadra_Casa: r.avversario_casa ?? '',
          Squadra_Ospite: r.avversario_ospite ?? '',
          Campo: r.campo ?? '',
          Giornata: r.giornata?.toString() ?? '',
        }
        return elaboraRiga(row, club)
      })
      setPartite(righeConvertite)
    } finally {
      setParsandoPdf(false)
    }
  }

  const elaboraPDF = async (file: File, club: string) => {
    setParsandoPdf(true)
    setPartite([])
    setRisultato(null)
    setTestoPdfGrezzo(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      let res: Response
      try {
        res = await fetch('/api/figc/parse-calendario-pdf', { method: 'POST', body: fd })
      } catch (networkErr: any) {
        setToast({ msg: 'Errore di rete durante il caricamento del PDF: ' + (networkErr?.message ?? 'connessione fallita'), tipo: 'error' })
        return
      }
      let data: any
      try {
        data = await res.json()
      } catch {
        setToast({ msg: `Errore server (${res.status}) durante il parsing del PDF`, tipo: 'error' })
        return
      }
      if (!res.ok) {
        setToast({ msg: data?.error ?? `Errore ${res.status} durante il parsing del PDF`, tipo: 'error' })
        return
      }
      // Salva il testo grezzo per debug
      if (data.testo_grezzo) setTestoPdfGrezzo(data.testo_grezzo)

      if (!data.righe?.length) {
        setToast({ msg: 'Nessuna partita rilevata nel PDF. Il testo estratto è mostrato qui sotto — verifica che il PDF non sia scansionato/immagine. In alternativa usa il CSV.', tipo: 'error' })
        return
      }
      const righeConvertite: RigaPartita[] = data.righe.map((r: any) => {
        const row: Record<string, string> = {
          Data: r.data_ora?.slice(0, 10)?.split('-').reverse().join('/') ?? '',
          Ora: r.data_ora?.slice(11, 16) ?? '00:00',
          Squadra_Casa: r.avversario_casa ?? '',
          Squadra_Ospite: r.avversario_ospite ?? '',
          Campo: r.campo ?? '',
          Giornata: r.giornata?.toString() ?? '',
        }
        return elaboraRiga(row, club)
      })
      setPartite(righeConvertite)
    } finally {
      setParsandoPdf(false)
    }
  }

  const ricaricaConNome = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    const nome = file.name.toLowerCase()
    if (nome.endsWith('.pdf') || file.type === 'application/pdf') {
      await elaboraPDF(file, nomeClub)
    } else if (nome.endsWith('.xlsx') || nome.endsWith('.xls') || file.type.includes('spreadsheet')) {
      await elaboraXLSX(file, nomeClub)
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => elaboraFile(ev.target?.result as string, nomeClub)
      reader.readAsText(file, 'UTF-8')
    }
  }

  const scaricaTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'template_calendario_figc.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const importa = async () => {
    const valide = partite.filter(p => !p.errore && !p.non_rilevante && p.avversario)
    if (!valide.length) { setToast({ msg: 'Nessuna partita valida da importare', tipo: 'error' }); return }
    setImporting(true)
    try {
      if (!squadraId) { setToast({ msg: 'Seleziona una squadra prima di importare', tipo: 'error' }); setImporting(false); return }
      const res = await fetch('/api/figc/import-calendario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partite: valide, modalita_conflitto: modalitaConflitto, squadra_id: squadraId }),
      })
      const data = await res.json()
      if (!res.ok) { setToast({ msg: data.error ?? 'Errore durante l\'importazione', tipo: 'error' }); return }
      setRisultato(data)
      if (data.importate === 0) {
        setToast({ msg: `Nessuna partita importata (${data.saltate ?? 0} saltate)${data._debug_error ? ': ' + data._debug_error : ''}`, tipo: 'error' })
      } else {
        setToast({ msg: `Importate ${data.importate} partite${data.saltate ? ` · ${data.saltate} saltate` : ''}`, tipo: 'success' })
      }
    } finally {
      setImporting(false)
    }
  }

  const partiteValide       = partite.filter(p => !p.errore && !p.non_rilevante)
  const partiteConErrore    = partite.filter(p => p.errore)
  const partiteNonRilevanti = partite.filter(p => p.non_rilevante)
  const partiteDaMostrare   = mostraNonRilevanti ? partite : partite.filter(p => !p.non_rilevante)

  return (
    <div>
      <PageHeader
        title="Import Calendario FIGC"
        subtitle="Carica il CSV ufficiale della federazione — il sistema rileva automaticamente le tue partite"
        actions={
          <button className="btn btn-secondary btn-sm" onClick={scaricaTemplate}>
            Scarica template CSV
          </button>
        }
      />

      {/* Step 1 — configurazione */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--grigio)' }}>
          1. Configurazione
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label className="label">
              Nome club nel CSV
              {clubAutocaricato && (
                <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--verde)', fontWeight: 500 }}>
                  ✓ caricato automaticamente
                </span>
              )}
            </label>
            <input
              className="input"
              placeholder="es. ASD Molfetta Calcio"
              value={nomeClub}
              onChange={e => setNomeClub(e.target.value)}
              onBlur={ricaricaConNome}
            />
            <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 4 }}>
              Deve corrispondere al nome usato nel CSV FIGC (anche parziale)
            </div>
          </div>
          <div>
            <label className="label">Squadra destinazione</label>
            <select
              className="input"
              value={squadraId}
              onChange={e => setSquadraId(e.target.value)}
            >
              {squadre.length === 0 && <option value="">Caricamento...</option>}
              {squadre.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nome} ({s.categoria_eta?.replace('_', ' ')})
                </option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 4 }}>
              Le partite vengono assegnate a questa squadra
            </div>
          </div>
          <div>
            <label className="label">Gestione conflitti</label>
            <select className="input" value={modalitaConflitto} onChange={e => setModalitaConflitto(e.target.value as typeof modalitaConflitto)}>
              <option value="salta">Salta — lascia invariata la partita esistente</option>
              <option value="aggiorna_campo">Aggiorna solo campo (se mancante)</option>
              <option value="sovrascrivi">Sovrascrivi tutto con i dati FIGC</option>
            </select>
          </div>
        </div>
      </div>

      {/* Step 2 — upload */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--grigio)' }}>
          2. Carica file calendario FIGC
        </div>
        <div
          style={{
            border: `2px dashed ${parsandoPdf ? 'var(--verde)' : 'var(--grigio-5)'}`,
            borderRadius: 10, padding: '32px 20px', textAlign: 'center',
            cursor: parsandoPdf ? 'default' : 'pointer', background: 'var(--grigio-6)',
            transition: 'border-color 0.2s',
          }}
          onClick={() => !parsandoPdf && fileRef.current?.click()}
        >
          {parsandoPdf ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--verde)' }}>
                Analisi PDF in corso…
              </div>
              <div style={{ fontSize: 12, color: 'var(--grigio-4)', marginTop: 4 }}>
                Estrazione testo e rilevamento partite. Attendere.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--grigio)' }}>
                Clicca per selezionare il file del calendario
              </div>
              <div style={{ fontSize: 12, color: 'var(--grigio-4)', marginTop: 4 }}>
                <strong>PDF</strong> — Eccellenza &nbsp;·&nbsp; <strong>XLSX</strong> — Serie D &nbsp;·&nbsp; <strong>CSV</strong> — colonne: Data, Ora, Squadra_Casa, Squadra_Ospite, Campo, Giornata
              </div>
              <div style={{ fontSize: 11, color: 'var(--grigio-4)', marginTop: 6 }}>
                Formati data accettati: <strong>DD/MM/AAAA</strong> (FIGC standard) · AAAA-MM-GG (ISO)
              </div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv,.pdf,application/pdf,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: 'none' }} onChange={handleFile} />

        {/* Testo grezzo PDF — mostrato quando il parser non trova partite */}
        {testoPdfGrezzo && partite.length === 0 && (
          <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--grigio-6)', borderRadius: 8, border: '1px solid var(--grigio-5)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--grigio-3)', marginBottom: 8 }}>
              Testo estratto dal PDF (prime 2000 caratteri) — invialo al supporto se il parsing non funziona:
            </div>
            <pre style={{ fontSize: 10, color: 'var(--grigio-3)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, maxHeight: 200, overflow: 'auto' }}>
              {testoPdfGrezzo}
            </pre>
          </div>
        )}
      </div>

      {/* Preview */}
      {partite.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: '1px solid var(--grigio-5)',
            flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>3. Preview partite</span>
              <span className="badge badge-verde">{partiteValide.length} del tuo club</span>
              {partiteNonRilevanti.length > 0 && (
                <span
                  className="badge badge-grigio"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setMostraNonRilevanti(v => !v)}
                  title="Clicca per mostrare/nascondere"
                >
                  {partiteNonRilevanti.length} altre {mostraNonRilevanti ? '(visibili)' : '(nascoste)'}
                </span>
              )}
              {partiteConErrore.length > 0 && (
                <span className="badge badge-rosso">{partiteConErrore.length} con errore</span>
              )}
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={importa}
              disabled={importing || partiteValide.length === 0}
            >
              {importing ? 'Importazione...' : `Importa ${partiteValide.length} partite`}
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Giornata</th>
                  <th>Data / Ora</th>
                  <th>Avversario</th>
                  <th>Casa/Trasferta</th>
                  <th>Campo</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {partiteDaMostrare.map((p, i) => (
                  <tr
                    key={i}
                    style={{
                      background: p.errore
                        ? 'var(--rosso-lt)'
                        : p.non_rilevante
                          ? 'var(--grigio-6)'
                          : '',
                      opacity: p.non_rilevante ? 0.55 : 1,
                    }}
                  >
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {p.giornata ?? '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {p.data_ora
                        ? new Date(p.data_ora).toLocaleString('it-IT', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td style={{ fontWeight: p.non_rilevante ? 400 : 500, fontSize: 13 }}>
                      {p.avversario || '—'}
                    </td>
                    <td>
                      {!p.errore && !p.non_rilevante && (
                        <span className={`badge ${p.casa_trasferta === 'casa' ? 'badge-verde' : p.casa_trasferta === 'trasferta' ? 'badge-grigio' : 'badge-ambra'}`}>
                          {p.casa_trasferta}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--grigio-3)' }}>{p.campo || '—'}</td>
                    <td>
                      {p.errore
                        ? <span className="badge badge-rosso" title={p.errore}>Errore: {p.errore}</span>
                        : p.non_rilevante
                          ? <span className="badge badge-grigio" style={{ fontSize: 10 }}>Altra squadra</span>
                          : <span className="badge badge-verde">✓ importabile</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Risultato */}
      {risultato && (
        <div className="card" style={{ padding: '20px 24px', borderLeft: '3px solid var(--verde)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Riepilogo importazione</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div className="stat-card">
              <div className="stat-label">Importate</div>
              <div className="stat-value" style={{ color: 'var(--verde)', fontSize: 28 }}>{risultato.importate}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Saltate</div>
              <div className="stat-value" style={{ fontSize: 28 }}>{risultato.saltate}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Conflitti</div>
              <div className="stat-value" style={{ color: risultato.conflitti > 0 ? 'var(--ambra)' : undefined, fontSize: 28 }}>
                {risultato.conflitti}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => router.push('/dashboard/segretario/partite')}>
              Vai al calendario partite →
            </button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
