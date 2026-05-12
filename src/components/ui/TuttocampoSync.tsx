'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RisultatoTuttocampo } from '@/lib/tuttocampo'
import { Modal, Toast } from '@/components/ui'

interface Props {
  clubId: string
  onImporta: (partita: RisultatoTuttocampo) => Promise<void>
}

// Bookmarklet: copia l'HTML del calendario Tuttocampo negli appunti
const BOOKMARKLET = `javascript:(function(){var d=document.getElementById('team_calendar');if(!d){alert('Elemento non trovato. Sei sulla pagina Calendario di Tuttocampo?');return;}var h=d.outerHTML;if(navigator.clipboard){navigator.clipboard.writeText(h).then(function(){alert('HTML copiato! Torna su ClubIS e incollalo.');});}else{var t=document.createElement('textarea');t.value=h;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);alert('HTML copiato! Torna su ClubIS e incollalo.');}})();`

export default function TuttocampoSync({ clubId, onImporta }: Props) {
  const supabase = createClient()
  const [url, setUrl] = useState('')
  const [urlSalvato, setUrlSalvato] = useState(false)
  const [risultati, setRisultati] = useState<RisultatoTuttocampo[]>([])
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)
  const [confirmItem, setConfirmItem] = useState<RisultatoTuttocampo | null>(null)
  const [importando, setImportando] = useState(false)

  // Modalità manuale (fallback WAF)
  const [wafBlocked, setWafBlocked] = useState(false)
  const [pasteHtml, setPasteHtml] = useState('')
  const [parsingPaste, setParsingPaste] = useState(false)

  useEffect(() => {
    supabase
      .from('clubs')
      .select('tuttocampo_url')
      .eq('id', clubId)
      .single()
      .then(({ data }) => {
        if (data?.tuttocampo_url) {
          setUrl(data.tuttocampo_url)
          setUrlSalvato(true)
          fetchRisultati(data.tuttocampo_url)
        }
      })
  }, [clubId])

  async function fetchRisultati(targetUrl: string) {
    setLoading(true)
    setWafBlocked(false)
    try {
      const res = await fetch(`/api/tuttocampo/risultati?url=${encodeURIComponent(targetUrl)}`)
      const data = await res.json()
      if (data.waf) {
        setWafBlocked(true)
        setRisultati([])
      } else {
        setRisultati(data.risultati ?? [])
        if (data.errore) setToast({ msg: data.errore, tipo: 'error' })
      }
    } catch {
      setToast({ msg: 'Errore di rete', tipo: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function salvaUrl() {
    if (!url.includes('tuttocampo.it')) {
      setToast({ msg: "L'URL deve essere di tuttocampo.it", tipo: 'error' })
      return
    }
    setSalvando(true)
    const { error } = await supabase
      .from('clubs')
      .update({ tuttocampo_url: url })
      .eq('id', clubId)
    setSalvando(false)
    if (error) {
      setToast({ msg: 'Errore nel salvataggio', tipo: 'error' })
      return
    }
    setUrlSalvato(true)
    setToast({ msg: 'URL salvato', tipo: 'success' })
    fetchRisultati(url)
  }

  async function analizzaPaste() {
    if (!pasteHtml.trim()) return
    setParsingPaste(true)
    try {
      const res = await fetch('/api/tuttocampo/risultati', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: pasteHtml }),
      })
      const data = await res.json()
      const r = data.risultati ?? []
      if (r.length === 0) {
        setToast({ msg: 'Nessuna partita trovata nell\'HTML incollato. Riprova copiando l\'intero div #team_calendar.', tipo: 'error' })
      } else {
        setRisultati(r)
        setWafBlocked(false)
        setPasteHtml('')
        setToast({ msg: `${r.length} partite trovate`, tipo: 'success' })
      }
    } catch {
      setToast({ msg: 'Errore nel parsing', tipo: 'error' })
    } finally {
      setParsingPaste(false)
    }
  }

  async function confermaImporta() {
    if (!confirmItem) return
    setImportando(true)
    try {
      await onImporta(confirmItem)
      setToast({ msg: 'Partita importata in ClubIS', tipo: 'success' })
      setRisultati(prev => prev.filter(r => r.tuttocampoId !== confirmItem.tuttocampoId &&
        !(r.data === confirmItem.data && r.squadraCasa === confirmItem.squadraCasa)))
    } catch {
      setToast({ msg: 'Errore durante importazione', tipo: 'error' })
    } finally {
      setImportando(false)
      setConfirmItem(null)
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 28 }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--grigio-5)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Integrazione Tuttocampo.it</span>
          {urlSalvato && !wafBlocked && (
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--grigio-4)' }}>
              Dati aggiornati ogni 5 min
            </span>
          )}
        </div>
        {urlSalvato && !wafBlocked && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchRisultati(url)}
            disabled={loading}
          >
            {loading ? 'Caricamento...' : 'Aggiorna'}
          </button>
        )}
      </div>

      {/* Step 1: configurazione URL */}
      {!urlSalvato ? (
        <div style={{ padding: '20px 18px' }}>
          <p style={{ fontSize: 13, color: 'var(--grigio-3)', marginBottom: 14 }}>
            Collega la pagina Calendario della tua squadra su Tuttocampo.
          </p>
          <ol style={{ fontSize: 13, color: 'var(--grigio-2)', paddingLeft: 18, marginBottom: 16, lineHeight: 1.8 }}>
            <li>Vai su <strong>tuttocampo.it</strong></li>
            <li>Cerca la tua squadra e apri la pagina <em>Calendario</em></li>
            <li>Copia l'URL dalla barra del browser e incollalo qui sotto</li>
          </ol>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="https://www.tuttocampo.it/.../Squadra/.../Calendario"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={salvaUrl}
              disabled={salvando || !url}
            >
              {salvando ? 'Salvo...' : 'Salva e sincronizza'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Step 2a: caricamento automatico in corso */}
          {loading && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
              Contatto Tuttocampo...
            </div>
          )}

          {/* Step 2b: WAF bloccato — modalità manuale */}
          {!loading && wafBlocked && (
            <div style={{ padding: '20px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ambra)', marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', marginBottom: 4 }}>
                    Tuttocampo richiede un browser reale
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grigio-3)', lineHeight: 1.7 }}>
                    Il sito protegge i dati con un sistema antibot (AWS WAF) che blocca le richieste automatiche.
                    Puoi comunque importare le partite in 3 click con il metodo manuale.
                  </div>
                </div>
              </div>

              {/* Istruzioni step-by-step */}
              <div className="card" style={{ padding: '16px 18px', background: 'var(--grigio-6)', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grigio-3)', fontFamily: 'var(--font-display)', marginBottom: 12 }}>
                  Come importare il calendario
                </div>
                <ol style={{ fontSize: 13, color: 'var(--grigio-2)', paddingLeft: 18, lineHeight: 2 }}>
                  <li>
                    Trascina questo pulsante nella barra dei preferiti del browser:
                    <span style={{ marginLeft: 8 }}>
                      <a
                        href={BOOKMARKLET}
                        onClick={e => e.preventDefault()}
                        draggable
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11, cursor: 'grab', userSelect: 'none' }}
                        title="Trascina nella barra dei preferiti"
                      >
                        📋 Copia da Tuttocampo
                      </a>
                    </span>
                  </li>
                  <li>
                    Apri <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                      la tua pagina Calendario su Tuttocampo ↗
                    </a>
                  </li>
                  <li>Clicca il preferito <strong>"Copia da Tuttocampo"</strong> appena aggiunto</li>
                  <li>Torna qui e incolla nel riquadro sotto (<kbd style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid var(--grigio-4)' }}>Cmd+V</kbd>)</li>
                </ol>

                <div style={{ marginTop: 4, padding: '8px 12px', background: 'var(--grigio-5)', borderRadius: 6, fontSize: 11, color: 'var(--grigio-3)' }}>
                  <strong style={{ color: 'var(--grigio-2)' }}>Alternativa senza bookmarklet:</strong> sulla pagina Tuttocampo apri la Console (
                  <kbd style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid var(--grigio-4)' }}>F12</kbd>
                  ) e digita:{' '}
                  <code style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                    copy(document.getElementById('team_calendar').outerHTML)
                  </code>
                </div>
              </div>

              {/* Textarea paste */}
              <textarea
                className="input"
                style={{ width: '100%', minHeight: 90, fontFamily: 'var(--font-mono)', fontSize: 11, resize: 'vertical' }}
                placeholder="Incolla qui l'HTML copiato da Tuttocampo..."
                value={pasteHtml}
                onChange={e => setPasteHtml(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={analizzaPaste}
                  disabled={parsingPaste || !pasteHtml.trim()}
                >
                  {parsingPaste ? 'Analizzo...' : 'Analizza partite'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11 }}
                  onClick={() => { setUrlSalvato(false); setWafBlocked(false) }}
                >
                  Cambia URL
                </button>
              </div>
            </div>
          )}

          {/* Step 2c: risultati automatici/manuali */}
          {!loading && !wafBlocked && risultati.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--grigio-4)', fontSize: 13 }}>
              Nessun risultato trovato. Verifica l'URL salvato o usa il metodo manuale.
            </div>
          )}

          {!loading && !wafBlocked && risultati.length > 0 && (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>G</th>
                      <th>Data</th>
                      <th>Casa</th>
                      <th>Risultato</th>
                      <th>Ospite</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {risultati.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--grigio-4)', textAlign: 'center' }}>
                          {r.giornata ?? '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {r.data}
                        </td>
                        <td style={{ fontWeight: 500, fontSize: 13 }}>{r.squadraCasa}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'center' }}>
                          {r.golCasa !== null ? `${r.golCasa} - ${r.golOspite}` : '—'}
                        </td>
                        <td style={{ fontSize: 13 }}>{r.squadraOspite}</td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setConfirmItem(r)}
                          >
                            Importa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '10px 18px', fontSize: 11, color: 'var(--grigio-4)', borderTop: '1px solid var(--grigio-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Fonte: tuttocampo.it — {risultati.length} partite</span>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11 }}
                  onClick={() => { setUrlSalvato(false); setRisultati([]) }}
                >
                  Cambia URL
                </button>
              </div>
            </>
          )}

          {/* Link per modificare URL quando non in WAF mode */}
          {!loading && !wafBlocked && risultati.length > 0 && (
            <></>
          )}
        </>
      )}

      {/* Confirm import modal */}
      <Modal
        open={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        title="Importa partita in ClubIS"
        width={440}
      >
        {confirmItem && (
          <div style={{ padding: '20px' }}>
            <p style={{ fontSize: 14, color: 'var(--grigio-2)', marginBottom: 16 }}>
              Vuoi importare questa partita nel calendario ClubIS?
            </p>
            <div className="card" style={{ padding: '12px 16px', marginBottom: 20, background: 'var(--grigio-6)' }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {confirmItem.squadraCasa}{' '}
                {confirmItem.golCasa !== null ? `${confirmItem.golCasa} - ${confirmItem.golOspite}` : 'vs'}{' '}
                {confirmItem.squadraOspite}
              </div>
              <div style={{ fontSize: 12, color: 'var(--grigio-4)', marginTop: 4 }}>{confirmItem.data}</div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--grigio-4)', marginBottom: 20 }}>
              Se la partita è già presente in ClubIS non verrà duplicata.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmItem(null)}>
                Annulla
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={confermaImporta}
                disabled={importando}
              >
                {importando ? 'Importo...' : 'Conferma importazione'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
