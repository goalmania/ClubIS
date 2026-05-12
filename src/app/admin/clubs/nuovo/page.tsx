'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader, FormField, FormGrid, FormSection, SectionCard, Select, BackButton } from '@/components/ui'

const categorie = [
  { value: 'serie_a', label: 'Serie A' }, { value: 'serie_b', label: 'Serie B' },
  { value: 'serie_c', label: 'Serie C' }, { value: 'serie_d', label: 'Serie D' },
  { value: 'eccellenza', label: 'Eccellenza' }, { value: 'promozione', label: 'Promozione' },
  { value: 'prima_categoria', label: 'Prima Categoria' }, { value: 'seconda_categoria', label: 'Seconda Categoria' },
  { value: 'terza_categoria', label: 'Terza Categoria' }, { value: 'scuola_calcio', label: 'Scuola Calcio' },
]

const piani = [
  { value: 'base', label: 'Base' }, { value: 'pro', label: 'Pro' }, { value: 'elite', label: 'Elite' },
]

export default function NuovoClubPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [form, setForm] = useState({
    nome: '', nome_esteso: '', citta: '', provincia: '', regione: '',
    categoria: 'eccellenza', piano_abbonamento: 'base',
    figc_codice: '', email_ufficiale: '', telefono: '',
    abbonamento_scadenza: '',
    presidente_email: '', presidente_password: '',
    presidente_nome: '', presidente_cognome: '',
  })

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const salva = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrore('')

    const res = await fetch('/api/admin/crea-club', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setErrore(data.error ?? 'Errore durante la creazione')
      setLoading(false)
      return
    }

    router.push('/admin/clubs')
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <BackButton label="Torna ai club" />
      <PageHeader title="Nuovo Club" subtitle="Crea una nuova società nel sistema ClubIS" />

      <form onSubmit={salva}>
        <SectionCard>
          <FormSection title="Dati società">
            <FormGrid>
              <FormField label="Nome breve" required>
                <input className="input" value={form.nome} onChange={e => update('nome', e.target.value)} placeholder="es. FC Esempio" required />
              </FormField>
              <FormField label="Nome esteso">
                <input className="input" value={form.nome_esteso} onChange={e => update('nome_esteso', e.target.value)} placeholder="es. Football Club Esempio 1920 ASD" />
              </FormField>
            </FormGrid>
            <FormGrid cols={3}>
              <FormField label="Città" required>
                <input className="input" value={form.citta} onChange={e => update('citta', e.target.value)} required />
              </FormField>
              <FormField label="Provincia">
                <input className="input" value={form.provincia} onChange={e => update('provincia', e.target.value)} maxLength={2} placeholder="es. MI" />
              </FormField>
              <FormField label="Regione">
                <input className="input" value={form.regione} onChange={e => update('regione', e.target.value)} placeholder="es. Lombardia" />
              </FormField>
            </FormGrid>
            <FormGrid>
              <FormField label="Categoria" required>
                <Select value={form.categoria} onChange={v => update('categoria', v)} options={categorie} />
              </FormField>
              <FormField label="Codice FIGC">
                <input className="input" value={form.figc_codice} onChange={e => update('figc_codice', e.target.value)} />
              </FormField>
            </FormGrid>
            <FormGrid>
              <FormField label="Email ufficiale">
                <input className="input" type="email" value={form.email_ufficiale} onChange={e => update('email_ufficiale', e.target.value)} />
              </FormField>
              <FormField label="Telefono">
                <input className="input" value={form.telefono} onChange={e => update('telefono', e.target.value)} />
              </FormField>
            </FormGrid>
          </FormSection>
        </SectionCard>

        <SectionCard>
          <FormSection title="Abbonamento ClubIS">
            <FormGrid>
              <FormField label="Piano" required>
                <Select value={form.piano_abbonamento} onChange={v => update('piano_abbonamento', v)} options={piani} />
              </FormField>
              <FormField label="Scadenza abbonamento">
                <input className="input" type="date" value={form.abbonamento_scadenza} onChange={e => update('abbonamento_scadenza', e.target.value)} />
              </FormField>
            </FormGrid>
          </FormSection>
        </SectionCard>

        <SectionCard>
          <FormSection title="Primo utente (Presidente)">
            <FormGrid>
              <FormField label="Nome" required>
                <input className="input" value={form.presidente_nome} onChange={e => update('presidente_nome', e.target.value)} required />
              </FormField>
              <FormField label="Cognome" required>
                <input className="input" value={form.presidente_cognome} onChange={e => update('presidente_cognome', e.target.value)} required />
              </FormField>
            </FormGrid>
            <FormGrid>
              <FormField label="Email login" required>
                <input className="input" type="email" value={form.presidente_email} onChange={e => update('presidente_email', e.target.value)} required />
              </FormField>
              <FormField label="Password temporanea" required hint="Il presidente dovrà cambiarla al primo accesso">
                <input className="input" type="text" value={form.presidente_password} onChange={e => update('presidente_password', e.target.value)} required minLength={6} />
              </FormField>
            </FormGrid>
          </FormSection>
        </SectionCard>

        {errore && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>{errore}</div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creazione in corso...' : 'Crea club e utente'}
          </button>
        </div>
      </form>
    </div>
  )
}
