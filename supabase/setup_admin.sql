-- ============================================================
-- CIS — Setup completo (permessi + admin)
-- Esegui nell'editor SQL di Supabase
-- ============================================================

-- ========== STEP 1: PERMESSI (il problema principale) ==========
-- Concedi al ruolo authenticated/anon i permessi di lettura/scrittura
-- su TUTTE le tabelle del progetto

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Anche per tabelle future
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated;

-- ========== STEP 2: Colonna is_super_admin ==========
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'utenti' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE utenti ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- ========== STEP 3: Disabilita RLS in sviluppo ==========
ALTER TABLE clubs DISABLE ROW LEVEL SECURITY;
ALTER TABLE utenti DISABLE ROW LEVEL SECURITY;
ALTER TABLE squadre DISABLE ROW LEVEL SECURITY;
ALTER TABLE giocatori DISABLE ROW LEVEL SECURITY;
ALTER TABLE tesseramenti DISABLE ROW LEVEL SECURITY;
ALTER TABLE certificati_medici DISABLE ROW LEVEL SECURITY;
ALTER TABLE contratti DISABLE ROW LEVEL SECURITY;
ALTER TABLE famiglie DISABLE ROW LEVEL SECURITY;
ALTER TABLE collaboratori_staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessioni_allenamento DISABLE ROW LEVEL SECURITY;
ALTER TABLE presenze DISABLE ROW LEVEL SECURITY;
ALTER TABLE partite DISABLE ROW LEVEL SECURITY;
ALTER TABLE convocazioni DISABLE ROW LEVEL SECURITY;
ALTER TABLE statistiche_partita DISABLE ROW LEVEL SECURITY;
ALTER TABLE valutazioni_tecniche DISABLE ROW LEVEL SECURITY;
ALTER TABLE report_scouting DISABLE ROW LEVEL SECURITY;
ALTER TABLE messaggi DISABLE ROW LEVEL SECURITY;
ALTER TABLE messaggi_letture DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_iscrizione DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagamenti DISABLE ROW LEVEL SECURITY;
ALTER TABLE prima_nota DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifiche_sistema DISABLE ROW LEVEL SECURITY;

-- ========== STEP 4: Club demo ==========
INSERT INTO clubs (id, nome, nome_esteso, citta, categoria, piano_abbonamento, attivo)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'CIS Demo Club',
  'Club Amministrativo CIS',
  'Roma',
  'eccellenza',
  'elite',
  true
)
ON CONFLICT (id) DO UPDATE SET attivo = true;

-- ========== STEP 5: Collega il tuo utente ==========
-- Prima elimina eventuali record orfani
DELETE FROM utenti WHERE email = 'dimuropaolo7@gmail.com';

-- Inserisci con l'ID corretto da auth.users
INSERT INTO utenti (id, club_id, nome, cognome, email, ruolo, is_super_admin, attivo)
SELECT
  au.id,
  'a0000000-0000-0000-0000-000000000001',
  'Paolo',
  'Di Muro',
  au.email,
  'presidente',
  true,
  true
FROM auth.users au
WHERE au.email = 'dimuropaolo7@gmail.com';

-- ========== STEP 6: Verifica ==========
SELECT
  u.id,
  u.email,
  u.club_id,
  u.ruolo,
  u.is_super_admin,
  c.nome as club_nome
FROM utenti u
JOIN clubs c ON c.id = u.club_id
WHERE u.email = 'dimuropaolo7@gmail.com';
