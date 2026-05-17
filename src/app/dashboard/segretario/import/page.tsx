'use client'
import { useState } from 'react'
import { parseCSV } from '@/lib/import/csv-parser'
import { SCHEMA_GIOCATORI, SCHEMA_MOVIMENTI, SCHEMA_FAMIGLIE } from '@/lib/import/schemas'
import { PageHeader, Toast } from '@/components/ui'

const TIPI_IMPORT = [
  {
    key: 'giocatori',
    label: 'Giocatori / Atleti',
    icon: '⚽',
    schema: SCHEMA_GIOCATORI,
    colonne: 'cognome · nome · data_nascita (GG/MM/AAAA) · codice_fiscale · ruolo (Portiere / Difensore / Centrocampista / Ala / Attaccante) · piede (Destro / Sinistro / Ambidestro) · altezza (cm) · peso (kg) · email · telefono · numero_maglia',
    template: [
      'cognome,nome,data_nascita,codice_fiscale,ruolo,piede,altezza,peso,email,telefono,numero_maglia',
      'Rossi,Mario,15/03/2001,RSSMRA01C15H501Z,Centrocampista,Destro,178,74,mario.rossi@email.it,3331234567,10',
      'Bianchi,Luca,22/07/1999,BNCLCU99L22F205X,Attaccante,Sinistro,182,78,luca.bianchi@email.it,3342345678,9',
      'Verdi,Andrea,01/01/2002,VRDNDR02A01D612Y,Difensore,Destro,185,80,andrea.verdi@email.it,3353456789,5',
    ].join('\n'),
  },
  {
    key: 'movimenti',
    label: 'Movimenti contabili',
    icon: '💰',
    schema: SCHEMA_MOVIMENTI,
    colonne: 'data (GG/MM/AAAA) · tipo (entrata / uscita) · categoria (Quote Associative / Sponsor / Affitto Impianti / Trasferte / Arbitraggi / Utenze / Divise / Attrezzatura Sportiva / Donazioni / Formazione / Comunicazioni / Tornei) · importo · descrizione · controparte · note',
    template: [
      'data,tipo,categoria,importo,descrizione,controparte,note',
      '03/01/2025,entrata,Quote Associative,150.00,Quota mensile gennaio,Rossi Mario,Pagamento puntuale',
      '05/01/2025,uscita,Affitto Impianti,800.00,Affitto campo sportivo comunale gennaio,Comune,Contratto annuale rinnovato',
      '10/01/2025,entrata,Sponsor,500.00,Sponsorizzazione maglia - logo laterale,Bar Centrale,Accordo semestrale',
      '15/01/2025,uscita,Arbitraggi,90.00,Compenso arbitro gara casalinga,AIA Sezione Bari,Liquidazione immediata',
    ].join('\n'),
  },
  {
    key: 'famiglie',
    label: 'Famiglie (scuola calcio)',
    icon: '👨‍👩‍👧',
    schema: SCHEMA_FAMIGLIE,
    colonne: 'cognome_genitore · nome_genitore · email · telefono · relazione (Padre / Madre / Tutore) · cognome_bambino · nome_bambino · data_nascita_bambino (GG/MM/AAAA)',
    template: [
      'cognome_genitore,nome_genitore,email,telefono,relazione,cognome_bambino,nome_bambino,data_nascita_bambino',
      'Esposito,Antonio,antonio.esposito@gmail.com,3331122334,Padre,Esposito,Lorenzo,14/03/2016',
      'Ferrara,Maria,maria.ferrara@gmail.com,3342233445,Madre,Ferrara,Mattia,22/07/2015',
      'De Santis,Giovanni,giovanni.desantis@libero.it,3353344556,Padre,De Santis,Filippo,08/11/2016',
    ].join('\n'),
  },
]

export default function ImportPage() {
  const [tipoSel, setTipoSel] = useState('giocatori')
  const [testo, setTesto] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ReturnType<typeof parseCSV> | null>(null)
  const [importing, setImporting] = useState(false)
  const [risultato, setRisultato] = useState<{ importati: number; saltati: number; errori: string[]; periodo_min?: string; periodo_max?: string } | null>(null)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  const tipo = TIPI_IMPORT.find(t => t.key === tipoSel)!

  const analizzaPreview = (txt: string) => {
    if (txt.trim().length < 10) return
    const result = parseCSV(txt, tipo.schema)
    setPreview(result)
  }

  const onFile = (f: File) => {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const txt = (e.target?.result as string) ?? ''
      setTesto(txt)
      analizzaPreview(txt)
    }
    reader.readAsText(f, 'UTF-8')
  }

  const cambioTipo = (key: string) => {
    setTipoSel(key)
    setPreview(null)
    setTesto('')
    setFile(null)
    setRisultato(null)
  }

  const scaricaTemplate = () => {
    // BOM UTF-8 per apertura corretta in Excel italiano
    const bom  = '﻿'
    const blob = new Blob([bom + tipo.template], { type: 'text/csv;charset=utf-8' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `template-${tipoSel}-ClubIS.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const eseguiImport = async () => {
    if (!preview?.validi?.length) return
    setImporting(true)
    try {
      const res = await fetch(`/api/import/${tipoSel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ righe: preview.validi }),
      })
      const data = await res.json()
      setRisultato(data)
      setToast({ msg: `Importati ${data.importati} record su ${preview.totale}`, tipo: 'success' })
    } catch {
      setToast({ msg: 'Errore durante l\'importazione', tipo: 'error' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Import dati" subtitle="Carica CSV per importare massivamente giocatori, movimenti o famiglie" />

      {/* Selezione tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {TIPI_IMPORT.map(t => (
          <div
            key={t.key}
            onClick={() => cambioTipo(t.key)}
            style={{
              padding: '16px 20px',
              cursor: 'pointer',
              background: tipoSel === t.key ? 'rgba(200,240,0,0.08)' : 'var(--gray-light)',
              border: `1px solid ${tipoSel === t.key ? 'rgba(200,240,0,0.4)' : 'var(--border)'}`,
              borderLeft: `3px solid ${tipoSel === t.key ? 'var(--accent)' : 'transparent'}`,
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{t.icon}</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 13,
              color: tipoSel === t.key ? 'var(--accent)' : 'var(--white)',
            }}>
              {t.label}
            </div>
          </div>
        ))}
      </div>

      {/* Upload + istruzioni */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              textTransform: 'uppercase', fontSize: 13, marginBottom: 6,
            }}>
              Formato colonne richiesto:
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray)', lineHeight: 1.8 }}>
              {tipo.colonne}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={scaricaTemplate} style={{ flexShrink: 0, marginLeft: 16 }}>
            ↓ Scarica template CSV
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
          onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
          onDrop={e => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
            const f = e.dataTransfer.files[0]
            if (f) onFile(f)
          }}
          onClick={() => document.getElementById('file-input')?.click()}
          style={{
            padding: '32px',
            textAlign: 'center',
            border: '2px dashed var(--border)',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            marginBottom: 16,
          }}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv,.txt,.tsv"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
          />
          <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            textTransform: 'uppercase', fontSize: 13, marginBottom: 4,
          }}>
            {file ? file.name : 'Trascina il file CSV qui'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray)', fontFamily: 'var(--font-mono)' }}>
            oppure clicca per selezionare · CSV, TSV, TXT
          </div>
        </div>

        <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--gray)' }}>
          Oppure incolla il contenuto CSV direttamente:
        </div>
        <textarea
          className="input"
          rows={6}
          value={testo}
          onChange={e => { setTesto(e.target.value); analizzaPreview(e.target.value) }}
          placeholder={tipo.template}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
        />
      </div>

      {/* Preview */}
      {preview && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Righe totali', n: preview.totale, color: 'var(--white)' },
              { label: 'Valide', n: preview.validi.length, color: 'var(--accent)' },
              { label: 'Con errori', n: preview.errori.length, color: preview.errori.length > 0 ? '#ef4444' : 'var(--gray)' },
            ].map(k => (
              <div key={k.label} style={{ flex: 1, background: 'var(--gray-mid)', padding: '12px 16px', borderRadius: 2 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: k.color }}>{k.n}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#444' }}>{k.label}</div>
              </div>
            ))}
          </div>

          {preview.errori.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, color: '#ef4444', marginBottom: 8 }}>
                Righe con errori (non verranno importate):
              </div>
              {preview.errori.slice(0, 5).map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: '#ef4444', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                  Riga {e.riga}: {e.messaggio}
                </div>
              ))}
              {preview.errori.length > 5 && (
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>...e altri {preview.errori.length - 5} errori</div>
              )}
            </div>
          )}

          {preview.validi.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, color: 'var(--accent)', marginBottom: 8 }}>
                Anteprima prime righe valide:
              </div>
              {preview.validi.slice(0, 3).map((r, i) => (
                <div key={i} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--gray)', padding: '6px 10px', background: 'var(--gray-mid)', marginBottom: 4 }}>
                  {Object.entries(r).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  {Object.keys(r).length > 5 && ' ...'}
                </div>
              ))}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={eseguiImport}
            disabled={importing || preview.validi.length === 0}
            style={{ fontSize: 14 }}
          >
            {importing ? 'Importazione in corso...' : `Importa ${preview.validi.length} record →`}
          </button>
        </div>
      )}

      {/* Risultato */}
      {risultato && (
        <div className={`alert ${risultato.errori?.length > 0 ? 'alert-warning' : 'alert-success'}`}>
          ✓ Importati: {risultato.importati} · Saltati (duplicati): {risultato.saltati ?? 0} · Errori: {risultato.errori?.length ?? 0}

          {/* Banner navigazione per movimenti contabili */}
          {tipoSel === 'movimenti' && risultato.importati > 0 && risultato.periodo_min && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              background: 'rgba(200,240,0,0.06)', border: '1px solid rgba(200,240,0,0.25)',
              fontSize: 12, fontFamily: 'var(--font-mono)',
            }}>
              I movimenti sono stati registrati nel periodo{' '}
              <strong style={{ color: 'var(--accent)' }}>{risultato.periodo_min}</strong>
              {risultato.periodo_max !== risultato.periodo_min && (
                <> → <strong style={{ color: 'var(--accent)' }}>{risultato.periodo_max}</strong></>
              )}.{' '}
              Per visualizzarli vai in{' '}
              <a
                href={`/dashboard/segretario/prima-nota?mese=${risultato.periodo_min}`}
                style={{ color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Prima Nota → {risultato.periodo_min}
              </a>
            </div>
          )}

          {/* Banner per giocatori importati */}
          {tipoSel === 'giocatori' && risultato.importati > 0 && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              background: 'rgba(200,240,0,0.06)', border: '1px solid rgba(200,240,0,0.25)',
              fontSize: 12, fontFamily: 'var(--font-mono)',
            }}>
              Giocatori aggiunti con tesseramento attivo.{' '}
              <a
                href="/dashboard/segretario/giocatori"
                style={{ color: 'var(--accent)', textDecoration: 'underline' }}
              >
                Vai a Giocatori →
              </a>
            </div>
          )}

          {risultato.errori?.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              {risultato.errori.join(' · ')}
            </div>
          )}
        </div>
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
