-- FIX 059 — Pagamenti famiglia: Realtime + RLS + club_id backfill
--
-- 1. Aggiunge `pagamenti` alla pubblicazione Realtime (mancante da fix012)
--    La tabella `quote_iscrizione` è già in pubblicazione e viene aggiornata
--    automaticamente dal trigger sync_importo_pagato, ma avere anche
--    `pagamenti` consente subscription dirette.
--
-- 2. Aggiorna la policy pagamenti_club aggiungendo WITH CHECK esplicito
--    e creando una policy separata per il ruolo famiglia che permette
--    INSERT solo sulle quote dei propri figli.
--
-- APPLICARE in Supabase Dashboard → SQL Editor

-- ── 1. Realtime ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'pagamenti'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pagamenti;
  END IF;
END $$;

-- ── 2. Policy pagamenti — staff del club (segretario, presidente, allenatore) ─
DO $$ BEGIN
  DROP POLICY IF EXISTS pagamenti_club    ON pagamenti;
  DROP POLICY IF EXISTS pagamenti_staff   ON pagamenti;
  DROP POLICY IF EXISTS pagamenti_famiglia ON pagamenti;

  -- Staff: accesso completo ai pagamenti del proprio club
  CREATE POLICY pagamenti_staff ON pagamenti
    FOR ALL TO authenticated
    USING (
      quota_id IN (
        SELECT id FROM quote_iscrizione
        WHERE club_id = my_club_id()
      )
    )
    WITH CHECK (
      quota_id IN (
        SELECT id FROM quote_iscrizione
        WHERE club_id = my_club_id()
      )
    );

  -- Famiglia: SELECT e INSERT solo per i propri figli collegati
  CREATE POLICY pagamenti_famiglia ON pagamenti
    FOR ALL TO authenticated
    USING (
      quota_id IN (
        SELECT qi.id
        FROM quote_iscrizione qi
        JOIN famiglie f ON f.giocatore_id = qi.giocatore_id
        WHERE f.auth_user_id = auth.uid()
      )
    )
    WITH CHECK (
      quota_id IN (
        SELECT qi.id
        FROM quote_iscrizione qi
        JOIN famiglie f ON f.giocatore_id = qi.giocatore_id
        WHERE f.auth_user_id = auth.uid()
      )
    );
END $$;

-- ── 3. Policy quote_iscrizione per famiglia ───────────────────────────────────
-- La policy staff già esiste (club_isolation). Aggiungiamo una policy separata
-- per i familiari: possono leggere (SELECT) le quote dei propri figli tramite
-- la tabella famiglie — funziona anche se utenti.club_id è NULL.
DO $$ BEGIN
  DROP POLICY IF EXISTS quote_iscrizione_famiglia ON quote_iscrizione;

  CREATE POLICY quote_iscrizione_famiglia ON quote_iscrizione
    FOR SELECT TO authenticated
    USING (
      giocatore_id IN (
        SELECT f.giocatore_id
        FROM famiglie f
        WHERE f.auth_user_id = auth.uid()
      )
    );
END $$;

-- ── 4. Backfill utenti.club_id per utenti famiglia senza club_id ─────────────
-- Aggiorna tutti gli utenti famiglia che hanno club_id = NULL
-- cercando il club tramite famiglie → tesseramenti
UPDATE utenti u
SET club_id = (
  SELECT COALESCE(f.club_id, t.club_id)
  FROM famiglie f
  LEFT JOIN tesseramenti t ON t.giocatore_id = f.giocatore_id AND t.stato = 'attivo'
  WHERE f.auth_user_id = u.id
  ORDER BY f.created_at DESC
  LIMIT 1
)
WHERE u.ruolo = 'famiglia'
  AND u.club_id IS NULL;

-- ── 5. Backfill utenti.giocatore_figlio_id per utenti famiglia senza ─────────
UPDATE utenti u
SET giocatore_figlio_id = (
  SELECT f.giocatore_id
  FROM famiglie f
  WHERE f.auth_user_id = u.id
  ORDER BY f.created_at DESC
  LIMIT 1
)
WHERE u.ruolo = 'famiglia'
  AND u.giocatore_figlio_id IS NULL;
