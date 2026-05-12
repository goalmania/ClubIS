# CIS — Club Information System

Sistema gestionale integrato per società di calcio. Copre dalla scuola calcio all'Eccellenza/Serie D con 6 profili utente distinti.

---

## Stack tecnologico

| Layer | Tecnologia |
|---|---|
| Frontend / Backend | Next.js 14 (App Router) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Styling | Tailwind CSS + CSS custom |
| Deploy | Vercel |
| Email / Alert | Resend (opzionale) |
| Pagamenti | Stripe (opzionale) |

---

## Setup in 5 passi

### 1. Crea il progetto Supabase

Vai su [supabase.com](https://supabase.com) → New project.

Prendi nota di:
- **Project URL** (es. `https://abcxyz.supabase.co`)
- **Anon public key** (dalla sezione Settings → API)

### 2. Configura le variabili d'ambiente

Copia `.env.local` e inserisci i tuoi valori:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://TUO-PROGETTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TUA-ANON-KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Crea il database

Nell'editor SQL di Supabase (SQL Editor → New query):

1. Copia tutto il contenuto di `supabase/schema.sql`
2. Incollalo nell'editor
3. Clicca **Run**

Questo crea tutte le 20 tabelle, gli enum, i trigger, gli indici e le politiche Row Level Security.

### 4. Crea il primo utente admin

Nell'editor SQL di Supabase, esegui:

```sql
-- 1. Crea il club
INSERT INTO clubs (nome, categoria, citta, piano_abbonamento)
VALUES ('A.S.D. Nome Club', 'eccellenza', 'Città', 'pro')
RETURNING id;

-- 2. Crea utente in Supabase Auth (da Dashboard → Authentication → Users → Add user)
--    poi prendi l'UUID generato e usa il club_id del passo precedente:

INSERT INTO utenti (id, club_id, nome, cognome, email, ruolo)
VALUES (
  'UUID-DELL-UTENTE-AUTH',
  'UUID-DEL-CLUB',
  'Mario',
  'Rossi',
  'mario@club.it',
  'presidente'
);
```

### 5. Avvia il progetto

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

---

## Struttura ruoli

| Ruolo | Dashboard | Accesso |
|---|---|---|
| `presidente` | `/dashboard/presidente` | Tutto in sola lettura + finanze |
| `ds` | `/dashboard/ds` | Rosa, contratti, scouting |
| `segretario` | `/dashboard/segretario` | Admin completo |
| `allenatore` | `/dashboard/allenatore` | Presenze, convocazioni, valutazioni |
| `osservatore` | `/dashboard/osservatore` | Report scouting |
| `famiglia` | `/dashboard/famiglia` | Dati figlio, calendario, pagamenti |

Il middleware reindirizza automaticamente ogni utente alla sua dashboard dopo il login.

---

## Struttura del progetto

```
src/
├── app/
│   ├── auth/login/          # Login page
│   ├── api/                 # API routes
│   │   ├── auth/logout/
│   │   └── scouting/
│   └── dashboard/
│       ├── layout.tsx       # Layout condiviso con Sidebar
│       ├── segretario/      # 10+ pagine
│       ├── allenatore/      # 10+ pagine
│       ├── ds/              # 8+ pagine
│       ├── presidente/      # 7+ pagine
│       ├── osservatore/     # 6+ pagine
│       └── famiglia/        # 6+ pagine
├── components/
│   ├── layout/Sidebar.tsx   # Navigazione per tutti i ruoli
│   └── ui/index.tsx         # Componenti riutilizzabili
├── lib/
│   ├── supabase/            # Client browser e server
│   └── helpers.ts           # Funzioni condivise
├── middleware.ts             # Auth + routing per ruolo
└── types/database.ts        # Tipi TypeScript completi
supabase/
└── schema.sql               # 20 tabelle + RLS + trigger
```

---

## Funzionalità implementate

### Segretario
- Dashboard con alert scadenze, partite, quote
- Anagrafica giocatori completa con ricerca/filtri
- Profilo giocatore dettagliato
- Aggiunta giocatore (form completo con genitore per minori)
- Tesseramenti (attivi, archiviati, filtri)
- Certificati medici con alert scadenza
- Partite (lista + creazione)
- Distinta gara stampabile/PDF
- Quote iscrizione con solleciti
- Prima nota (entrate/uscite mensili)
- Messaggi interni con destinatari per squadra

### Allenatore
- Dashboard con prossimo allenamento e statistiche presenze
- Rosa per reparto con % presenze settimana
- Presenze digitali (toggle presente/assente con motivo, salvataggio automatico)
- Allenamenti (lista + creazione)
- Convocazioni per partita con risposta in-app
- Partite con riepilogo stagionale
- Statistiche individuali
- Valutazioni tecniche 1-10 per area con visibilità famiglia

### Direttore Sportivo
- Dashboard con alert contratti in scadenza
- Gestione rosa con filtri e KPI
- Contratti con giorni rimanenti
- Report scouting (lista + aggiornamento esito)
- Modulo scouting (shared con osservatore)

### Presidente
- Dashboard esecutiva con KPI finanziari
- Ultimi risultati
- Alert compliance aggregati

### Osservatore
- Dashboard con statistiche personali e tasso conversione
- Report scouting completo (voti per area, potenziale, punti forza/debolezza)
- Lista report propri

### Famiglia
- Vista semplificata con profilo figlio
- Quota stagionale con progress bar
- Ultima valutazione tecnica
- Comunicazioni dal club

---

## Deploy su Vercel

```bash
# Installa Vercel CLI
npm i -g vercel

# Deploy
vercel

# Aggiungi le env vars nel dashboard Vercel o via CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SITE_URL
```

In Supabase → Authentication → URL Configuration:
- **Site URL**: `https://tuo-dominio.vercel.app`
- **Redirect URLs**: `https://tuo-dominio.vercel.app/**`

---

## Note tecniche

**Row Level Security**: ogni club vede solo i propri dati. Enforced a livello database, non solo applicativo.

**Middleware**: controlla auth su ogni richiesta e reindirizza al ruolo corretto.

**Presenze**: salvataggio automatico a ogni tap — no bottone "Salva". La sessione si conferma con "Conferma sessione" quando tutti sono registrati.

**Distinta gara**: generata dai dati convocazioni, stampabile via `window.print()` o salvabile come PDF dal browser.
