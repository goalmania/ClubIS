'use client'
import FeatureGate from '@/components/FeatureGate'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Toast } from '@/components/ui'
import Link from 'next/link'

const STAGIONE = '2024-25'
const STAGIONE_PREC = '2023-24'

interface CheckResult {
  ok: boolean
  valore: number
  totale: number | null
  dettaglio: string
}

interface ClubInfo {
  id: string
  statuto_conforme: boolean
  ras_aggiornato: boolean
  figc_affiliazione_stagione: string | null
  figc_affiliazione_pagata: boolean
}

interface Check {
  id: string
  titolo: string
  descrizione: string
  result: CheckResult
  azione: string
  href?: string
  toggleField?: keyof ClubInfo
}

function fmtPct(v: number, tot: number) {
  if (tot === 0) return '—'
  return `${v}/${tot} (${Math.round((v / tot) * 100)}%)`
}

export default function ComplianceCampionatoPage() {
  const supabase = createClient()
  const [club, setClub] = useState<ClubInfo | null>(null)
  const [checks, setChecks] = useState<Check[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
    if (!utente) return
    const clubId = utente.club_id
    const oggi = new Date().toISOString().split('T')[0]

    const [
      { data: clubData },
      { count: totTess },
      { count: certValidi },
      { count: qPrecedenti },
      { count: qFirmate },
      { count: totTessAttivi },
      { data: tessCompleti },
    ] = await Promise.all([
      // Club info per flag booleani
      supabase.from('clubs')
        .select('id, statuto_conforme, ras_aggiornato, figc_affiliazione_stagione, figc_affiliazione_pagata')
        .eq('id', clubId)
        .single(),

      // Totale tesserati attivi
      supabase.from('tesseramenti')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .eq('stato', 'attivo'),

      // Tesserati con certificato valido oggi
      supabase.from('certificati_medici')
        .select('giocatore_id', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .gte('data_scadenza', oggi),

      // Quote iscrizione stagione precedente (non esonerati)
      supabase.from('quote_iscrizione')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .eq('stagione', STAGIONE_PREC)
        .neq('stato', 'esonerato'),

      // Quietanze firmate stagione precedente
      supabase.from('quietanze')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .eq('stagione', STAGIONE_PREC)
        .eq('firmata', true),

      // Tesseramenti attivi totale (per check completezza)
      supabase.from('tesseramenti')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .eq('stato', 'attivo'),

      // Tesseramenti attivi con giocatore che ha codice_fiscale (campo critico FIGC)
      supabase.from('tesseramenti')
        .select('giocatori!inner(codice_fiscale)')
        .eq('club_id', clubId)
        .eq('stato', 'attivo')
        .not('giocatori.codice_fiscale', 'is', null),
    ])

    const c = clubData as ClubInfo | null
    setClub(c)

    const certOk = (certValidi ?? 0) >= (totTess ?? 1)
    const tessCompletati = tessCompleti?.length ?? 0
    const tessOk = tessCompletati >= (totTessAttivi ?? 1) && (totTessAttivi ?? 0) > 0

    // Quietanze: se non ci sono quote precedenti, il check è verde (N/A)
    const qPrec = qPrecedenti ?? 0
    const qFirm = qFirmate ?? 0
    const quietanzeOk = qPrec === 0 || qFirm >= qPrec

    const affiliazioneOk = !!(c?.figc_affiliazione_pagata && c?.figc_affiliazione_stagione === STAGIONE)

    const nuoviChecks: Check[] = [
      {
        id: 'certificati',
        titolo: 'Certificati medici',
        descrizione: 'Tutti i giocatori tesserati devono avere il certificato medico in corso di validità.',
        result: {
          ok: certOk,
          valore: certValidi ?? 0,
          totale: totTess ?? 0,
          dettaglio: certOk
            ? `${fmtPct(certValidi ?? 0, totTess ?? 0)} validi`
            : `${(totTess ?? 0) - (certValidi ?? 0)} giocatori senza certificato valido`,
        },
        azione: 'Vai a Certificati',
        href: '/dashboard/segretario/certificati',
      },
      {
        id: 'quietanze',
        titolo: `Quietanze stagione ${STAGIONE_PREC}`,
        descrizione: 'Le quietanze della stagione precedente devono essere firmate e archiviate.',
        result: {
          ok: quietanzeOk,
          valore: qFirm,
          totale: qPrec,
          dettaglio: qPrec === 0
            ? 'Nessuna quota registrata per la stagione precedente'
            : quietanzeOk
              ? `${fmtPct(qFirm, qPrec)} firmate`
              : `${qPrec - qFirm} quietanze ancora da firmare`,
        },
        azione: 'Genera quietanze',
        href: '/dashboard/segretario/quietanze',
      },
      {
        id: 'affiliazione',
        titolo: 'Quota affiliazione FIGC',
        descrizione: `Quota di affiliazione FIGC per la stagione ${STAGIONE} registrata e pagata.`,
        result: {
          ok: affiliazioneOk,
          valore: affiliazioneOk ? 1 : 0,
          totale: null,
          dettaglio: affiliazioneOk
            ? `Affiliazione ${STAGIONE} confermata`
            : 'Quota affiliazione non registrata',
        },
        azione: 'Registra pagamento',
        toggleField: 'figc_affiliazione_pagata',
      },
      {
        id: 'statuto',
        titolo: 'Statuto conforme Riforma 2023',
        descrizione: "Lo statuto societario deve essere aggiornato e conforme alla Riforma dello Sport 2023 (D.Lgs 36/2021).",
        result: {
          ok: !!(c?.statuto_conforme),
          valore: c?.statuto_conforme ? 1 : 0,
          totale: null,
          dettaglio: c?.statuto_conforme ? 'Statuto conforme' : 'Non ancora contrassegnato come conforme',
        },
        azione: 'Segna come conforme',
        toggleField: 'statuto_conforme',
      },
      {
        id: 'ras',
        titolo: 'Iscrizione RAS aggiornata',
        descrizione: 'Il Registro Atleti e Staff deve essere aggiornato per la stagione corrente.',
        result: {
          ok: !!(c?.ras_aggiornato),
          valore: c?.ras_aggiornato ? 1 : 0,
          totale: null,
          dettaglio: c?.ras_aggiornato ? 'RAS aggiornato' : 'Non ancora contrassegnato come aggiornato',
        },
        azione: 'Segna come fatto',
        toggleField: 'ras_aggiornato',
      },
      {
        id: 'tesseramenti',
        titolo: 'Tesseramenti completi',
        descrizione: 'Tutti i giocatori tesserati devono avere il codice fiscale e i dati anagrafici compilati.',
        result: {
          ok: tessOk,
          valore: tessCompletati,
          totale: totTessAttivi ?? 0,
          dettaglio: tessOk
            ? `${fmtPct(tessCompletati, totTessAttivi ?? 0)} completi`
            : `${(totTessAttivi ?? 0) - tessCompletati} tesseramenti con dati mancanti`,
        },
        azione: 'Vai a Tesseramenti',
        href: '/dashboard/segretario/tesseramenti',
      },
    ]

    setChecks(nuoviChecks)
    setLoading(false)
  }

  async function toggle(field: keyof ClubInfo) {
    if (!club) return
    setSaving(field)
    const nuovoValore = !club[field]

    const update: Record<string, unknown> = { [field]: nuovoValore }
    // Se stiamo attivando l'affiliazione, imposta anche la stagione
    if (field === 'figc_affiliazione_pagata' && nuovoValore) {
      update['figc_affiliazione_stagione'] = STAGIONE
    }

    const { error } = await supabase.from('clubs').update(update).eq('id', club.id)
    setSaving(null)
    if (error) {
      setToast({ msg: error.message, tipo: 'error' })
    } else {
      setToast({
        msg: nuovoValore ? 'Requisito contrassegnato come soddisfatto' : 'Requisito rimosso',
        tipo: 'success',
      })
      await load()
    }
  }

  const soddisfatti = checks.filter(c => c.result.ok).length
  const tutti = checks.length
  const pronti = soddisfatti === tutti && tutti > 0

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-4)' }}>Caricamento...</div>

  return (
    <FeatureGate feature="compliance_indice" featureLabel="Compliance Campionato">
        <div>
          <PageHeader
            title="Verifica iscrizione campionato"
            subtitle={`Stagione ${STAGIONE} — controllo requisiti`}
          />

          {/* Banner successo */}
          {pronti && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(34,197,94,0.08)', border: '1px solid var(--verde)',
              borderRadius: 10, padding: '16px 20px', marginBottom: 20,
            }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--verde)' }}>
                  Club pronto per l'iscrizione al campionato {STAGIONE}
                </div>
                <div style={{ fontSize: 13, color: 'var(--grigio-4)', marginTop: 2 }}>
                  Tutti i {tutti} requisiti sono soddisfatti.
                </div>
              </div>
            </div>
          )}

          {/* Barra di progresso */}
          <div className="card" data-onboarding="section-compliance" style={{ padding: '18px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {soddisfatti}/{tutti} requisiti soddisfatti
              </div>
              <div style={{ fontSize: 13, color: soddisfatti === tutti ? 'var(--verde)' : 'var(--ambra)' }}>
                {Math.round((soddisfatti / Math.max(tutti, 1)) * 100)}%
              </div>
            </div>
            <div style={{ height: 8, background: 'var(--grigio-6)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(soddisfatti / Math.max(tutti, 1)) * 100}%`,
                background: pronti ? 'var(--verde)' : soddisfatti >= tutti / 2 ? 'var(--ambra)' : 'var(--rosso)',
                borderRadius: 4,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          {/* Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {checks.map(chk => (
              <div key={chk.id} className="card" style={{
                padding: '18px 24px',
                borderLeft: `3px solid ${chk.result.ok ? 'var(--verde)' : 'var(--rosso)'}`,
                display: 'grid',
                gridTemplateColumns: '36px 1fr auto',
                gap: 16,
                alignItems: 'center',
              }}>
                {/* Icona stato */}
                <div style={{
                  width: 36, height: 36,
                  borderRadius: '50%',
                  background: chk.result.ok ? 'rgba(34,197,94,0.12)' : 'rgba(220,38,38,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {chk.result.ok ? '✓' : '✗'}
                </div>

                {/* Testo */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                    {chk.titolo}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grigio-4)', marginBottom: 4 }}>
                    {chk.descrizione}
                  </div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: chk.result.ok ? 'var(--verde)' : 'var(--rosso)',
                  }}>
                    {chk.result.dettaglio}
                  </div>
                  {/* Mini progress bar per check con percentuale */}
                  {chk.result.totale != null && chk.result.totale > 0 && (
                    <div style={{ marginTop: 6, height: 4, background: 'var(--grigio-6)', borderRadius: 2, width: 200, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, (chk.result.valore / chk.result.totale) * 100)}%`,
                        background: chk.result.ok ? 'var(--verde)' : 'var(--rosso)',
                        borderRadius: 2,
                      }} />
                    </div>
                  )}
                </div>

                {/* Azione */}
                <div style={{ flexShrink: 0 }}>
                  {chk.href ? (
                    <Link href={chk.href} className="btn btn-secondary btn-sm">
                      {chk.azione}
                    </Link>
                  ) : chk.toggleField ? (
                    <button
                      className={`btn btn-sm ${chk.result.ok ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => toggle(chk.toggleField!)}
                      disabled={saving === chk.toggleField}
                    >
                      {saving === chk.toggleField
                        ? '...'
                        : chk.result.ok
                          ? 'Annulla'
                          : chk.azione}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Info footer */}
          <div style={{
            marginTop: 24,
            padding: '14px 20px',
            background: 'rgba(100,100,100,0.06)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--grigio-4)',
            lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--grigio-3)' }}>Note:</strong> La verifica dei requisiti è indicativa.
            Consultare sempre la circolare ufficiale LND/FIGC per i requisiti aggiornati di iscrizione al campionato {STAGIONE}.
            I campi "Statuto conforme", "RAS aggiornato" e "Affiliazione FIGC" devono essere contrassegnati manualmente dal responsabile.
          </div>

          {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
        </div>
    </FeatureGate>
  )
}
