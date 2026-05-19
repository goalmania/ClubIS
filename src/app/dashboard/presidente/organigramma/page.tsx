import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const PLATFORM_ADMIN_EMAILS = [
  'dimuropaolo7@gmail.com', 'dimuroasia45@gmail.com',
  'dimuroasia7@gmail.com', 'dimuropaolo@gmail.com', 'dimuropaolo77@gmail.com',
]

// ── Struttura gerarchica fissa ──────────────────────────────────────────────
// La gerarchia è definita qui come configurazione statica.
// I dati (membri) vengono solo mappati sui nodi, mai usati per costruire
// la struttura dell'albero.

type NodoOrg = {
  ruolo: string
  label: string
  labelPlural?: string
  icon: string
}

const LIVELLO_1: NodoOrg = {
  ruolo: 'presidente', label: 'Presidente', icon: '👑',
}
const LIVELLO_2: NodoOrg[] = [
  { ruolo: 'team_manager',  label: 'Team Manager',       icon: '🗂️' },
  { ruolo: 'ds',            label: 'Direttore Sportivo',  icon: '⚽' },
]
const FIGLI_TM: NodoOrg[] = [
  { ruolo: 'segretario',    label: 'Segretario',   icon: '📋' },
  { ruolo: 'medico',        label: 'Medico',        icon: '🏥' },
  { ruolo: 'custode',       label: 'Custode',       icon: '🔑' },
  { ruolo: 'ufficio_stampa',label: 'Add. Stampa',   icon: '📰' },
]
const FIGLI_DS: NodoOrg[] = [
  { ruolo: 'osservatore',   label: 'Osservatore',   icon: '🔍' },
  { ruolo: 'allenatore',    label: 'Allenatore',    icon: '📊' },
  { ruolo: 'giocatore',     label: 'Calciatori',    icon: '👟', labelPlural: 'Calciatori' },
]

type Membro = {
  id: string; nome: string | null; cognome: string | null
  foto_url: string | null; titolo_organigramma: string | null; ruolo: string
}

// ── Costanti layout ────────────────────────────────────────────────────────
// Con questi valori l'albero è ~920px di larghezza totale,
// che entra comodamente nell'area contenuto a 1280px (sidebar 240 + padding 64).
const TREE_W    = 920  // larghezza totale dell'albero
const BRANCH_G  = 32   // gap tra ramo TM e ramo DS
const BRANCH_W  = (TREE_W - BRANCH_G) / 2  // 444px per ramo
const L3_W      = 105  // larghezza di ciascun box livello 3
const L3_G      = 7    // gap tra box livello 3
const LINE      = 'var(--border-solid)'

// ── Pagina ─────────────────────────────────────────────────────────────────

export default async function OrganigrammaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: utente } = await supabase
    .from('utenti').select('club_id, ruolo').eq('id', user.id).single()
  if (!utente) redirect('/auth/errore')

  const admin = createAdminClient()
  // Auto-fix: segna piattaforma admin come is_super_admin se non già fatto
  await admin.from('utenti').update({ is_super_admin: true })
    .in('email', PLATFORM_ADMIN_EMAILS).is('is_super_admin', null)

  const { data: tutti } = await admin
    .from('utenti')
    .select('id, nome, cognome, foto_url, titolo_organigramma, ruolo')
    .eq('club_id', utente.club_id)
    .eq('attivo', true)
    .neq('ruolo', 'famiglia')
    .neq('is_super_admin', true)

  const { data: club } = await supabase
    .from('clubs').select('nome').eq('id', utente.club_id).single()

  const byRole = (ruolo: string): Membro[] =>
    (tutti ?? []).filter(u => u.ruolo === ruolo)

  const canEdit = utente.ruolo === 'presidente' || utente.ruolo === 'ds'

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26,
            textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)', marginBottom: 4,
          }}>Organigramma</h1>
          <p style={{ fontSize: 13, color: 'var(--gray)', fontWeight: 300 }}>
            Struttura organizzativa — {club?.nome}
          </p>
        </div>
        {canEdit && (
          <Link href="/dashboard/presidente/organigramma/modifica" className="btn btn-secondary btn-sm" data-onboarding="btn-modifica-organigramma">
            Modifica organigramma
          </Link>
        )}
      </div>

      {/* ── Albero ─────────────────────────────────────────────────────── */}
      {/*
        Layout a larghezza fissa (TREE_W = 920px):
        - I due rami L2 hanno flex:1 con gap fisso → larghezza uguale → il
          presidente è perfettamente centrato sulla biforcazione.
        - Se lo schermo è < 920px il wrapper fa overflowX: auto.
      */}
      <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: 32 }}>
        <div style={{
          width: TREE_W,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>

          {/* ── L1: Presidente ── */}
          <BoxPresidente nodo={LIVELLO_1} membri={byRole('presidente')} />

          {/* Gambo verticale */}
          <div style={{ width: 2, height: 24, background: LINE }} />

          {/* ── Biforcazione ──
              Con branch uguale (BRANCH_W), il midpoint TM–DS è esattamente
              al centro di TREE_W. La biforcazione simmetrica (due metà uguali)
              termina esattamente sopra il centro di ciascun ramo.
              width = TREE_W - 2*BRANCH_W/2*2 = BRANCH_W + BRANCH_G/2 ... ma
              più semplice: la fine sinistra è a BRANCH_W/2, la fine destra a
              TREE_W - BRANCH_W/2; larghezza = TREE_W - BRANCH_W = BRANCH_G + BRANCH_W.
              Con i due flex:1 centrati, la formula è: span = BRANCH_G + BRANCH_W / 2 * 2
              Per semplicità usiamo width fissa calcolata:
              left_end  = BRANCH_W/2                     = 222px
              right_end = TREE_W - BRANCH_W/2            = 698px
              span      = right_end - left_end           = 476px
              Each half = span/2                          = 238px          ── */}
          <div style={{ display: 'flex', width: BRANCH_W + BRANCH_G }}>
            <div style={{ flex: 1, height: 24, borderTop: `2px solid ${LINE}`, borderRight: `2px solid ${LINE}` }} />
            <div style={{ flex: 1, height: 24, borderTop: `2px solid ${LINE}`, borderLeft: `2px solid ${LINE}` }} />
          </div>

          {/* ── L2: Team Manager + Direttore Sportivo ── */}
          <div style={{ display: 'flex', gap: BRANCH_G, width: TREE_W }}>

            {/* Ramo Team Manager */}
            <div style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <BoxL2 nodo={LIVELLO_2[0]} membri={byRole('team_manager')} />
              <div style={{ width: 2, height: 24, background: LINE }} />
              <ChildrenFan nodi={FIGLI_TM} byRole={byRole} />
            </div>

            {/* Ramo Direttore Sportivo */}
            <div style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <BoxL2 nodo={LIVELLO_2[1]} membri={byRole('ds')} />
              <div style={{ width: 2, height: 24, background: LINE }} />
              <ChildrenFan nodi={FIGLI_DS} byRole={byRole} />
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Componenti ──────────────────────────────────────────────────────────────

function BoxPresidente({ nodo, membri }: { nodo: NodoOrg; membri: Membro[] }) {
  return (
    <div style={{
      background: 'rgba(200,240,0,0.06)',
      border: '1px solid rgba(200,240,0,0.3)',
      borderTop: '3px solid var(--accent)',
      borderRadius: 14,
      padding: '18px 24px',
      width: 220,
      textAlign: 'center',
      boxShadow: '0 0 28px rgba(200,240,0,0.08)',
    }} className="org-box-presidente">
      <div style={{ fontSize: 22, marginBottom: 6 }}>{nodo.icon}</div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.2em',
        color: 'var(--accent)', marginBottom: 10,
      }}>{nodo.label}</div>
      {membri.length > 0
        ? membri.map(m => <MembroInfo key={m.id} membro={m} size="lg" accent />)
        : <EmptySlot />}
    </div>
  )
}

function BoxL2({ nodo, membri }: { nodo: NodoOrg; membri: Membro[] }) {
  return (
    <div style={{
      background: '#111',
      border: '1px solid var(--border-solid)',
      borderTop: '2px solid rgba(0,200,160,0.5)',
      borderRadius: 12,
      padding: '14px 18px',
      width: 190,
      textAlign: 'center',
    }} className="org-box-l2">
      <div style={{ fontSize: 18, marginBottom: 5 }}>{nodo.icon}</div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.56rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.18em',
        color: 'var(--accent2)', marginBottom: 10,
      }}>{nodo.label}</div>
      {membri.length > 0
        ? membri.map(m => <MembroInfo key={m.id} membro={m} size="md" />)
        : <EmptySlot />}
    </div>
  )
}

function BoxL3({ nodo, membri }: { nodo: NodoOrg; membri: Membro[] }) {
  const n = membri.length
  return (
    <div style={{
      background: 'var(--gray-light)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '11px 10px',
      width: L3_W,
      textAlign: 'center',
      flexShrink: 0,
    }} className="org-box-l3">
      <div style={{ fontSize: 14, marginBottom: 4 }}>{nodo.icon}</div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.52rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.12em',
        color: 'var(--gray)', marginBottom: 7,
        lineHeight: 1.3,
      }}>{nodo.label}</div>
      {n === 0
        ? <EmptySlot small />
        : n === 1
        ? <MembroInfo membro={membri[0]} size="sm" />
        : (
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 13, color: 'var(--white)',
            }}>{n} {nodo.labelPlural ?? nodo.label}</div>
            {n <= 3 && membri.map(m => (
              <div key={m.id} style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 300, marginTop: 2 }}>
                {m.cognome} {m.nome}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

// Connettore "pettine": linea orizzontale che unisce i figli +
// linee verticali di discesa verso ciascun box.
function ChildrenFan({
  nodi, byRole,
}: {
  nodi: NodoOrg[]
  byRole: (r: string) => Membro[]
}) {
  const n = nodi.length
  // La linea orizzontale va dal centro del primo figlio al centro dell'ultimo.
  // Con figli di larghezza uguale e gap uniforme:
  //   center_i = i * (L3_W + L3_G) + L3_W/2
  // Per il pct trick: left = right = 100% / (2n)
  const pct = `${100 / (2 * n)}%`

  return (
    <div style={{ position: 'relative', display: 'flex', gap: L3_G }}>
      {/* Linea orizzontale */}
      <div style={{
        position: 'absolute', top: 0,
        left: pct, right: pct,
        height: 2, background: LINE,
      }} />
      {nodi.map(nodo => (
        <div key={nodo.ruolo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 2, height: 20, background: LINE }} />
          <BoxL3 nodo={nodo} membri={byRole(nodo.ruolo)} />
        </div>
      ))}
    </div>
  )
}

function MembroInfo({
  membro: m,
  size = 'md',
  accent = false,
}: {
  membro: Membro
  size?: 'sm' | 'md' | 'lg'
  accent?: boolean
}) {
  const sz = size === 'lg' ? 48 : size === 'md' ? 38 : 30
  const fs = size === 'lg' ? 14 : size === 'md' ? 12 : 10
  const iniziali = `${m.nome?.[0] ?? ''}${m.cognome?.[0] ?? ''}`.toUpperCase()
  return (
    <div>
      {m.foto_url ? (
        <img src={m.foto_url} alt="" style={{
          width: sz, height: sz, borderRadius: '50%', objectFit: 'cover',
          margin: '0 auto 6px', display: 'block',
          border: accent ? '2px solid var(--accent)' : '1px solid var(--border-solid)',
        }} />
      ) : (
        <div style={{
          width: sz, height: sz, borderRadius: '50%',
          background: accent ? 'rgba(200,240,0,0.1)' : 'var(--gray-mid)',
          border: accent ? '2px solid var(--accent)' : '1px solid var(--border-solid)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: sz * 0.32, fontWeight: 700,
          color: accent ? 'var(--accent)' : 'var(--white)',
          margin: '0 auto 6px',
        }}>
          {iniziali || '?'}
        </div>
      )}
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: fs,
        textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--white)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {m.cognome} {m.nome}
      </div>
      {m.titolo_organigramma && (
        <div style={{
          fontSize: 9, color: 'var(--gray)', fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1,
        }}>{m.titolo_organigramma}</div>
      )}
    </div>
  )
}

function EmptySlot({ small = false }: { small?: boolean }) {
  return (
    <div style={{
      fontSize: small ? 9 : 11, color: '#444',
      fontFamily: 'var(--font-sans)', fontStyle: 'italic',
      padding: small ? '1px 0' : '3px 0',
    }}>
      Nessun membro assegnato
    </div>
  )
}
