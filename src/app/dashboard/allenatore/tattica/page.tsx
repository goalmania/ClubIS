'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Modal, FormField, Toast } from '@/components/ui'

type Pos = { x: number; y: number; numero: number; nome: string; ruolo: string }

const MODULI: Record<string, Pos[]> = {
  '4-3-3': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 15, y: 70, numero: 2,  nome: 'TD',  ruolo: 'terzino' },
    { x: 38, y: 72, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 62, y: 72, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 85, y: 70, numero: 5,  nome: 'TS',  ruolo: 'terzino' },
    { x: 30, y: 48, numero: 6,  nome: 'MED', ruolo: 'mediano' },
    { x: 50, y: 52, numero: 7,  nome: 'REG', ruolo: 'regista' },
    { x: 70, y: 48, numero: 8,  nome: 'MEZ', ruolo: 'mezzala' },
    { x: 20, y: 25, numero: 9,  nome: 'ALA', ruolo: 'ala' },
    { x: 50, y: 20, numero: 10, nome: 'ATT', ruolo: 'attaccante' },
    { x: 80, y: 25, numero: 11, nome: 'ALA', ruolo: 'ala' },
  ],
  '4-4-2': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 15, y: 70, numero: 2,  nome: 'TD',  ruolo: 'terzino' },
    { x: 38, y: 72, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 62, y: 72, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 85, y: 70, numero: 5,  nome: 'TS',  ruolo: 'terzino' },
    { x: 15, y: 45, numero: 6,  nome: 'EST', ruolo: 'esterno' },
    { x: 38, y: 48, numero: 7,  nome: 'CC',  ruolo: 'centrocampista' },
    { x: 62, y: 48, numero: 8,  nome: 'CC',  ruolo: 'centrocampista' },
    { x: 85, y: 45, numero: 9,  nome: 'EST', ruolo: 'esterno' },
    { x: 35, y: 20, numero: 10, nome: 'ATT', ruolo: 'attaccante' },
    { x: 65, y: 20, numero: 11, nome: 'ATT', ruolo: 'attaccante' },
  ],
  '4-2-3-1': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 15, y: 70, numero: 2,  nome: 'TD',  ruolo: 'terzino' },
    { x: 38, y: 72, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 62, y: 72, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 85, y: 70, numero: 5,  nome: 'TS',  ruolo: 'terzino' },
    { x: 38, y: 53, numero: 6,  nome: 'MED', ruolo: 'mediano' },
    { x: 62, y: 53, numero: 7,  nome: 'MED', ruolo: 'mediano' },
    { x: 20, y: 32, numero: 8,  nome: 'TRQ', ruolo: 'trequartista' },
    { x: 50, y: 35, numero: 10, nome: 'TRQ', ruolo: 'trequartista' },
    { x: 80, y: 32, numero: 11, nome: 'TRQ', ruolo: 'trequartista' },
    { x: 50, y: 15, numero: 9,  nome: 'ATT', ruolo: 'attaccante' },
  ],
  '4-3-2-1': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 15, y: 70, numero: 2,  nome: 'TD',  ruolo: 'terzino' },
    { x: 38, y: 72, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 62, y: 72, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 85, y: 70, numero: 5,  nome: 'TS',  ruolo: 'terzino' },
    { x: 25, y: 52, numero: 6,  nome: 'MED', ruolo: 'mediano' },
    { x: 50, y: 54, numero: 7,  nome: 'REG', ruolo: 'regista' },
    { x: 75, y: 52, numero: 8,  nome: 'MEZ', ruolo: 'mezzala' },
    { x: 35, y: 30, numero: 10, nome: 'TRQ', ruolo: 'trequartista' },
    { x: 65, y: 30, numero: 11, nome: 'TRQ', ruolo: 'trequartista' },
    { x: 50, y: 14, numero: 9,  nome: 'ATT', ruolo: 'attaccante' },
  ],
  '4-1-4-1': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 15, y: 70, numero: 2,  nome: 'TD',  ruolo: 'terzino' },
    { x: 38, y: 72, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 62, y: 72, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 85, y: 70, numero: 5,  nome: 'TS',  ruolo: 'terzino' },
    { x: 50, y: 58, numero: 6,  nome: 'MED', ruolo: 'mediano' },
    { x: 15, y: 42, numero: 7,  nome: 'EST', ruolo: 'esterno' },
    { x: 38, y: 44, numero: 8,  nome: 'CC',  ruolo: 'centrocampista' },
    { x: 62, y: 44, numero: 10, nome: 'CC',  ruolo: 'centrocampista' },
    { x: 85, y: 42, numero: 11, nome: 'EST', ruolo: 'esterno' },
    { x: 50, y: 18, numero: 9,  nome: 'ATT', ruolo: 'attaccante' },
  ],
  '3-5-2': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 25, y: 72, numero: 2,  nome: 'DC',  ruolo: 'difensore' },
    { x: 50, y: 74, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 75, y: 72, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 10, y: 50, numero: 5,  nome: 'EST', ruolo: 'esterno' },
    { x: 33, y: 50, numero: 6,  nome: 'MEZ', ruolo: 'mezzala' },
    { x: 50, y: 54, numero: 7,  nome: 'REG', ruolo: 'regista' },
    { x: 67, y: 50, numero: 8,  nome: 'MEZ', ruolo: 'mezzala' },
    { x: 90, y: 50, numero: 9,  nome: 'EST', ruolo: 'esterno' },
    { x: 38, y: 22, numero: 10, nome: 'ATT', ruolo: 'attaccante' },
    { x: 62, y: 22, numero: 11, nome: 'ATT', ruolo: 'attaccante' },
  ],
  '3-4-3': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 25, y: 72, numero: 2,  nome: 'DC',  ruolo: 'difensore' },
    { x: 50, y: 74, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 75, y: 72, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 15, y: 48, numero: 5,  nome: 'EST', ruolo: 'esterno' },
    { x: 38, y: 50, numero: 6,  nome: 'CC',  ruolo: 'centrocampista' },
    { x: 62, y: 50, numero: 8,  nome: 'CC',  ruolo: 'centrocampista' },
    { x: 85, y: 48, numero: 7,  nome: 'EST', ruolo: 'esterno' },
    { x: 20, y: 22, numero: 9,  nome: 'ALA', ruolo: 'ala' },
    { x: 50, y: 18, numero: 10, nome: 'ATT', ruolo: 'attaccante' },
    { x: 80, y: 22, numero: 11, nome: 'ALA', ruolo: 'ala' },
  ],
  '3-4-1-2': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 25, y: 72, numero: 2,  nome: 'DC',  ruolo: 'difensore' },
    { x: 50, y: 74, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 75, y: 72, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 15, y: 48, numero: 5,  nome: 'EST', ruolo: 'esterno' },
    { x: 38, y: 50, numero: 6,  nome: 'CC',  ruolo: 'centrocampista' },
    { x: 62, y: 50, numero: 8,  nome: 'CC',  ruolo: 'centrocampista' },
    { x: 85, y: 48, numero: 7,  nome: 'EST', ruolo: 'esterno' },
    { x: 50, y: 32, numero: 10, nome: 'TRQ', ruolo: 'trequartista' },
    { x: 35, y: 16, numero: 9,  nome: 'ATT', ruolo: 'attaccante' },
    { x: 65, y: 16, numero: 11, nome: 'ATT', ruolo: 'attaccante' },
  ],
  '5-3-2': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 10, y: 68, numero: 2,  nome: 'TS',  ruolo: 'terzino' },
    { x: 30, y: 72, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 50, y: 74, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 70, y: 72, numero: 5,  nome: 'DC',  ruolo: 'difensore' },
    { x: 90, y: 68, numero: 6,  nome: 'TD',  ruolo: 'terzino' },
    { x: 25, y: 48, numero: 7,  nome: 'CC',  ruolo: 'centrocampista' },
    { x: 50, y: 52, numero: 8,  nome: 'REG', ruolo: 'regista' },
    { x: 75, y: 48, numero: 10, nome: 'CC',  ruolo: 'centrocampista' },
    { x: 35, y: 22, numero: 9,  nome: 'ATT', ruolo: 'attaccante' },
    { x: 65, y: 22, numero: 11, nome: 'ATT', ruolo: 'attaccante' },
  ],
  '5-4-1': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 10, y: 68, numero: 2,  nome: 'TS',  ruolo: 'terzino' },
    { x: 30, y: 72, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 50, y: 74, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 70, y: 72, numero: 5,  nome: 'DC',  ruolo: 'difensore' },
    { x: 90, y: 68, numero: 6,  nome: 'TD',  ruolo: 'terzino' },
    { x: 15, y: 46, numero: 7,  nome: 'EST', ruolo: 'esterno' },
    { x: 38, y: 48, numero: 8,  nome: 'CC',  ruolo: 'centrocampista' },
    { x: 62, y: 48, numero: 10, nome: 'CC',  ruolo: 'centrocampista' },
    { x: 85, y: 46, numero: 11, nome: 'EST', ruolo: 'esterno' },
    { x: 50, y: 18, numero: 9,  nome: 'ATT', ruolo: 'attaccante' },
  ],
  '4-5-1': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 15, y: 70, numero: 2,  nome: 'TD',  ruolo: 'terzino' },
    { x: 38, y: 72, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 62, y: 72, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 85, y: 70, numero: 5,  nome: 'TS',  ruolo: 'terzino' },
    { x: 10, y: 46, numero: 6,  nome: 'EST', ruolo: 'esterno' },
    { x: 30, y: 48, numero: 7,  nome: 'MEZ', ruolo: 'mezzala' },
    { x: 50, y: 50, numero: 8,  nome: 'REG', ruolo: 'regista' },
    { x: 70, y: 48, numero: 10, nome: 'MEZ', ruolo: 'mezzala' },
    { x: 90, y: 46, numero: 11, nome: 'EST', ruolo: 'esterno' },
    { x: 50, y: 18, numero: 9,  nome: 'ATT', ruolo: 'attaccante' },
  ],
  '4-4-1-1': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 15, y: 70, numero: 2,  nome: 'TD',  ruolo: 'terzino' },
    { x: 38, y: 72, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 62, y: 72, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 85, y: 70, numero: 5,  nome: 'TS',  ruolo: 'terzino' },
    { x: 15, y: 47, numero: 6,  nome: 'EST', ruolo: 'esterno' },
    { x: 38, y: 50, numero: 7,  nome: 'CC',  ruolo: 'centrocampista' },
    { x: 62, y: 50, numero: 8,  nome: 'CC',  ruolo: 'centrocampista' },
    { x: 85, y: 47, numero: 11, nome: 'EST', ruolo: 'esterno' },
    { x: 50, y: 30, numero: 10, nome: 'TRQ', ruolo: 'trequartista' },
    { x: 50, y: 14, numero: 9,  nome: 'ATT', ruolo: 'attaccante' },
  ],
  '4-3-1-2': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 15, y: 70, numero: 2,  nome: 'TD',  ruolo: 'terzino' },
    { x: 38, y: 72, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 62, y: 72, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 85, y: 70, numero: 5,  nome: 'TS',  ruolo: 'terzino' },
    { x: 25, y: 52, numero: 6,  nome: 'CC',  ruolo: 'centrocampista' },
    { x: 50, y: 54, numero: 7,  nome: 'REG', ruolo: 'regista' },
    { x: 75, y: 52, numero: 8,  nome: 'CC',  ruolo: 'centrocampista' },
    { x: 50, y: 33, numero: 10, nome: 'TRQ', ruolo: 'trequartista' },
    { x: 33, y: 16, numero: 9,  nome: 'ATT', ruolo: 'attaccante' },
    { x: 67, y: 16, numero: 11, nome: 'ATT', ruolo: 'attaccante' },
  ],
  '4-2-2-2': [
    { x: 50, y: 90, numero: 1,  nome: 'POR', ruolo: 'portiere' },
    { x: 15, y: 70, numero: 2,  nome: 'TD',  ruolo: 'terzino' },
    { x: 38, y: 72, numero: 3,  nome: 'DC',  ruolo: 'difensore' },
    { x: 62, y: 72, numero: 4,  nome: 'DC',  ruolo: 'difensore' },
    { x: 85, y: 70, numero: 5,  nome: 'TS',  ruolo: 'terzino' },
    { x: 38, y: 54, numero: 6,  nome: 'MED', ruolo: 'mediano' },
    { x: 62, y: 54, numero: 7,  nome: 'MED', ruolo: 'mediano' },
    { x: 20, y: 32, numero: 8,  nome: 'TRQ', ruolo: 'trequartista' },
    { x: 80, y: 32, numero: 10, nome: 'TRQ', ruolo: 'trequartista' },
    { x: 35, y: 16, numero: 9,  nome: 'ATT', ruolo: 'attaccante' },
    { x: 65, y: 16, numero: 11, nome: 'ATT', ruolo: 'attaccante' },
  ],
}

export default function TatticaPage() {
  const [modulo, setModulo] = useState<keyof typeof MODULI>('4-3-3')
  const [giocatori, setGiocatori] = useState<any[]>([])
  const [assegnazioni, setAssegnazioni] = useState<Record<number, string>>({})
  const [posSelezionata, setPosSelezionata] = useState<number | null>(null)
  const [noteTattiche, setNoteTattiche] = useState('')
  const [schemiSalvati, setSchemiSalvati] = useState<any[]>([])
  const [clubId, setClubId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [openSalva, setOpenSalva] = useState(false)
  const [nomeSchema, setNomeSchema] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: utente } = await supabase.from('utenti').select('club_id').eq('id', user.id).single()
      if (!utente) return
      setClubId(utente.club_id)

      const [{ data: gioc }, { data: schemi }] = await Promise.all([
        supabase.from('giocatori')
          .select('id, nome, cognome, ruolo_principale, numero_maglia')
          .eq('club_id', utente.club_id).eq('attivo', true).order('numero_maglia'),
        supabase.from('schemi_tattici')
          .select('*')
          .eq('club_id', utente.club_id)
          .order('created_at', { ascending: false }),
      ])
      setGiocatori(gioc ?? [])
      setSchemiSalvati(schemi ?? [])

      const def = schemi?.find(s => s.is_default)
      if (def) {
        setModulo(def.modulo)
        setAssegnazioni(def.assegnazioni ?? {})
        setNoteTattiche(def.note ?? '')
      }
    }
    load()
  }, [])

  const positions = MODULI[modulo]
  const disponibili = giocatori.filter(g => !Object.values(assegnazioni).includes(g.id))

  const assegnaGiocatore = (giocatoreId: string) => {
    if (posSelezionata === null) {
      const emptySlot = positions.find(p => !assegnazioni[p.numero])
      if (emptySlot) setAssegnazioni(a => ({ ...a, [emptySlot.numero]: giocatoreId }))
    } else {
      setAssegnazioni(a => ({ ...a, [posSelezionata]: giocatoreId }))
      setPosSelezionata(null)
    }
  }

  const rimuoviPosizione = (numero: number) => {
    setAssegnazioni(a => { const n = { ...a }; delete n[numero]; return n })
    if (posSelezionata === numero) setPosSelezionata(null)
  }

  const salvaSchema = async () => {
    if (!nomeSchema.trim() || !clubId) return
    const supabase = createClient()
    setSaving(true)
    const { error } = await supabase.from('schemi_tattici').insert({
      club_id: clubId,
      allenatore_id: userId,
      nome: nomeSchema.trim(),
      modulo,
      assegnazioni,
      note: noteTattiche || null,
      is_default: false,
    })
    setSaving(false)
    if (error) { setToast({ msg: error.message, tipo: 'error' }); return }
    setToast({ msg: 'Schema salvato', tipo: 'success' })
    setOpenSalva(false)
    setNomeSchema('')
    const supabase2 = createClient()
    const { data } = await supabase2.from('schemi_tattici')
      .select('*').eq('club_id', clubId).order('created_at', { ascending: false })
    setSchemiSalvati(data ?? [])
  }

  const caricaSchema = (schema: any) => {
    setModulo(schema.modulo)
    setAssegnazioni(schema.assegnazioni ?? {})
    setNoteTattiche(schema.note ?? '')
    setToast({ msg: `Schema "${schema.nome}" caricato`, tipo: 'success' })
  }

  const impostaDefault = async (id: string) => {
    const supabase = createClient()
    if (!clubId) return
    await supabase.from('schemi_tattici').update({ is_default: false }).eq('club_id', clubId)
    await supabase.from('schemi_tattici').update({ is_default: true }).eq('id', id).eq('club_id', clubId!)
    setSchemiSalvati(s => s.map(x => ({ ...x, is_default: x.id === id })))
    setToast({ msg: 'Schema impostato come predefinito', tipo: 'success' })
  }

  const eliminaSchema = async (id: string) => {
    const supabase = createClient()
    await supabase.from('schemi_tattici').delete().eq('id', id).eq('club_id', clubId!)
    setSchemiSalvati(s => s.filter(x => x.id !== id))
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)' }}>Tattica</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Schema e formazione — clicca posizione, poi giocatore</p>
      </div>

      {/* Selezione modulo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(Object.keys(MODULI) as (keyof typeof MODULI)[]).map(m => (
          <button key={m} onClick={() => { setModulo(m); setAssegnazioni({}); setPosSelezionata(null) }}
            className={`btn btn-sm ${modulo === m ? 'btn-primary' : 'btn-secondary'}`}>
            {m}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>
        {/* Campo SVG */}
        <div data-onboarding="campo-tattico" style={{
          position: 'relative', aspectRatio: '7/10', maxHeight: 680,
          background: 'linear-gradient(180deg, #1a4d2e 0%, #0f3d22 100%)',
          borderRadius: 12, border: '2px solid var(--border)', overflow: 'hidden',
        }}>
          <svg viewBox="0 0 100 140" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="none">
            <rect x="2" y="2" width="96" height="136" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
            <line x1="2" y1="70" x2="98" y2="70" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
            <circle cx="50" cy="70" r="9" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
            <circle cx="50" cy="70" r="0.8" fill="rgba(255,255,255,0.5)" />
            {/* Area di rigore superiore */}
            <rect x="20" y="2" width="60" height="16" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
            <rect x="34" y="2" width="32" height="6" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
            <circle cx="50" cy="11" r="0.8" fill="rgba(255,255,255,0.5)" />
            {/* Area di rigore inferiore */}
            <rect x="20" y="122" width="60" height="16" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
            <rect x="34" y="132" width="32" height="6" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
            <circle cx="50" cy="129" r="0.8" fill="rgba(255,255,255,0.5)" />
            {/* Angoli */}
            <path d="M2,6 Q2,2 6,2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
            <path d="M98,6 Q98,2 94,2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
            <path d="M2,134 Q2,138 6,138" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
            <path d="M98,134 Q98,138 94,138" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
          </svg>

          {positions.map(p => {
            const assigned = assegnazioni[p.numero]
            const g = giocatori.find(x => x.id === assigned)
            const isSel = posSelezionata === p.numero
            return (
              <div key={p.numero}
                style={{
                  position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
                  transform: 'translate(-50%, -50%)', width: 54, textAlign: 'center',
                }}
              >
                <div
                  onClick={() => {
                    if (g) rimuoviPosizione(p.numero)
                    else setPosSelezionata(isSel ? null : p.numero)
                  }}
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: g ? 'var(--accent-blue)' : isSel ? 'rgba(255,220,0,0.6)' : 'rgba(255,255,255,0.2)',
                    border: isSel ? '2px solid yellow' : '2px solid white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: 'white',
                    margin: '0 auto', cursor: 'pointer',
                    boxShadow: isSel ? '0 0 12px yellow' : '0 4px 10px rgba(0,0,0,0.4)',
                    transition: 'all 0.15s',
                  }}
                >
                  {g?.numero_maglia ?? p.numero}
                </div>
                <div style={{ fontSize: 10, color: 'white', fontWeight: 600, marginTop: 4, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {g ? g.cognome.slice(0, 8) : p.nome}
                </div>
              </div>
            )
          })}
        </div>

        {/* Pannello laterale */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {posSelezionata !== null
                ? `Seleziona per pos. #${posSelezionata}`
                : `Rosa (${disponibili.length})`}
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {disponibili.map(g => (
                <button key={g.id} onClick={() => assegnaGiocatore(g.id)}
                  style={{
                    width: '100%', padding: '9px 14px',
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'transparent', border: 0, cursor: 'pointer',
                    textAlign: 'left', color: 'var(--text-primary)',
                  }}
                >
                  {g.numero_maglia && (
                    <span style={{ width: 22, height: 22, borderRadius: 4, background: 'var(--bg-input)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
                      {g.numero_maglia}
                    </span>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{g.cognome} {g.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{g.ruolo_principale?.replace('_', ' ')}</div>
                  </div>
                </button>
              ))}
            </div>
            {Object.keys(assegnazioni).length > 0 && (
              <button onClick={() => { setAssegnazioni({}); setPosSelezionata(null) }}
                className="btn btn-secondary btn-sm" style={{ margin: 10, width: 'calc(100% - 20px)' }}>
                Azzera schema
              </button>
            )}
          </div>

          {/* Azioni schema */}
          <button className="btn btn-primary btn-sm" onClick={() => setOpenSalva(true)}>
            Salva schema
          </button>
        </div>
      </div>

      {/* Note tattiche */}
      <div className="card" style={{ padding: '16px 20px', marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Note tattiche</div>
        <textarea
          className="input"
          value={noteTattiche}
          onChange={e => setNoteTattiche(e.target.value)}
          rows={4}
          style={{ resize: 'vertical' }}
          placeholder="Annotazioni tattiche, istruzioni per i giocatori, piano gara..."
        />
      </div>

      {/* Schemi salvati */}
      {schemiSalvati.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 20 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
            Schemi salvati ({schemiSalvati.length})
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Nome</th><th>Modulo</th><th>Data</th><th></th></tr>
              </thead>
              <tbody>
                {schemiSalvati.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>
                      {s.nome}
                      {s.is_default && <span className="badge badge-verde" style={{ fontSize: 10, marginLeft: 8 }}>Predefinito</span>}
                    </td>
                    <td><span className="badge badge-grigio" style={{ fontSize: 10 }}>{s.modulo}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(s.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => caricaSchema(s)}>Carica</button>
                        {!s.is_default && (
                          <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => impostaDefault(s.id)}>Default</button>
                        )}
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, color: 'var(--accent-red)' }} onClick={() => eliminaSchema(s.id)}>Elimina</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/allenatore" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>

      {/* Modal salva schema */}
      <Modal open={openSalva} onClose={() => setOpenSalva(false)} title="Salva schema tattico" width={400}>
        <FormField label="Nome schema" required>
          <input className="input" value={nomeSchema} onChange={e => setNomeSchema(e.target.value)} placeholder={`${modulo} — ${new Date().toLocaleDateString('it-IT')}`} />
        </FormField>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Modulo: <strong>{modulo}</strong> · {Object.keys(assegnazioni).length} giocatori assegnati
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setOpenSalva(false)}>Annulla</button>
          <button className="btn btn-primary btn-sm" onClick={salvaSchema} disabled={saving || !nomeSchema.trim()}>
            {saving ? 'Salvo...' : 'Salva'}
          </button>
        </div>
      </Modal>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
