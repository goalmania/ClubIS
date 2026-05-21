-- FIX 084 — Isolamento dati giocatore: my_club_id() + trigger club_id + backfill
--
-- Problemi risolti:
--   1. my_club_id() leggeva solo da utenti → se utenti.club_id è NULL il giocatore
--      non vedeva nessun dato (RLS bloccava tutto).
--      Fix: fallback su giocatori.club_id per ruolo 'giocatore'.
--
--   2. sessioni_allenamento e presenze inseriti senza club_id esplicito
--      → la clausola RLS "club_id = my_club_id()" falliva per quei record.
--      Fix: trigger BEFORE INSERT che auto-popola club_id.
--
--   3. convocazioni inserite senza club_id esplicito → stesso problema.
--      Fix: trigger BEFORE INSERT.
--
-- Da eseguire UNA SOLA VOLTA nel Supabase SQL Editor.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fix my_club_id(): fallback su giocatori se utenti.club_id è NULL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION my_club_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT club_id FROM utenti   WHERE id          = auth.uid() LIMIT 1),
    (SELECT club_id FROM giocatori WHERE auth_user_id = auth.uid() LIMIT 1)
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Trigger: auto-set club_id su sessioni_allenamento (via squadra)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sessioni_allenamento_set_club_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.club_id IS NULL AND NEW.squadra_id IS NOT NULL THEN
    SELECT club_id INTO NEW.club_id
    FROM   squadre
    WHERE  id = NEW.squadra_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sessioni_allenamento_club_id ON sessioni_allenamento;
CREATE TRIGGER trg_sessioni_allenamento_club_id
  BEFORE INSERT OR UPDATE ON sessioni_allenamento
  FOR EACH ROW EXECUTE FUNCTION fn_sessioni_allenamento_set_club_id();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Trigger: auto-set club_id su presenze (via sessione → squadra)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_presenze_set_club_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.club_id IS NULL AND NEW.sessione_id IS NOT NULL THEN
    SELECT sq.club_id INTO NEW.club_id
    FROM   sessioni_allenamento sa
    JOIN   squadre sq ON sq.id = sa.squadra_id
    WHERE  sa.id = NEW.sessione_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_presenze_club_id ON presenze;
CREATE TRIGGER trg_presenze_club_id
  BEFORE INSERT OR UPDATE ON presenze
  FOR EACH ROW EXECUTE FUNCTION fn_presenze_set_club_id();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Trigger: auto-set club_id su convocazioni (via partita)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_convocazioni_set_club_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.club_id IS NULL AND NEW.partita_id IS NOT NULL THEN
    SELECT club_id INTO NEW.club_id
    FROM   partite
    WHERE  id = NEW.partita_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_convocazioni_club_id ON convocazioni;
CREATE TRIGGER trg_convocazioni_club_id
  BEFORE INSERT OR UPDATE ON convocazioni
  FOR EACH ROW EXECUTE FUNCTION fn_convocazioni_set_club_id();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Backfill club_id NULL su record esistenti
-- ─────────────────────────────────────────────────────────────────────────────

-- sessioni_allenamento
UPDATE sessioni_allenamento sa
SET    club_id = sq.club_id
FROM   squadre sq
WHERE  sa.squadra_id = sq.id
  AND  sa.club_id IS NULL;

-- presenze (via sessione → squadra)
UPDATE presenze pr
SET    club_id = sq.club_id
FROM   sessioni_allenamento sa
JOIN   squadre sq ON sq.id = sa.squadra_id
WHERE  pr.sessione_id = sa.id
  AND  pr.club_id IS NULL
  AND  sq.club_id IS NOT NULL;

-- convocazioni (via partita)
UPDATE convocazioni cv
SET    club_id = p.club_id
FROM   partite p
WHERE  cv.partita_id = p.id
  AND  cv.club_id IS NULL
  AND  p.club_id IS NOT NULL;

-- utenti giocatori: ripristina club_id se mancante (via tesseramenti attivi)
UPDATE utenti u
SET    club_id = t.club_id
FROM   tesseramenti t
JOIN   giocatori g ON g.id = t.giocatore_id
WHERE  u.id         = g.auth_user_id
  AND  u.ruolo      = 'giocatore'
  AND  u.club_id    IS NULL
  AND  t.stato      = 'attivo'
  AND  t.club_id    IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Aggiorna la RLS di sessioni_allenamento: include anche giocatori tramite
--    tessramento attivo (doppia protezione oltre il my_club_id() fix)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE sessioni_allenamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON sessioni_allenamento;
CREATE POLICY club_isolation ON sessioni_allenamento FOR ALL TO authenticated
  USING (
    club_id = my_club_id()
    OR squadra_id IN (SELECT id FROM squadre WHERE club_id = my_club_id())
    OR is_super_admin()
  )
  WITH CHECK (
    club_id = my_club_id()
    OR squadra_id IN (SELECT id FROM squadre WHERE club_id = my_club_id())
    OR is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Aggiorna la RLS di presenze: include giocatore owner della presenza
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE presenze ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON presenze;
CREATE POLICY club_isolation ON presenze FOR ALL TO authenticated
  USING (
    club_id = my_club_id()
    OR sessione_id IN (
      SELECT sa.id FROM sessioni_allenamento sa
      JOIN   squadre sq ON sq.id = sa.squadra_id
      WHERE  sq.club_id = my_club_id()
    )
    OR giocatore_id IN (
      SELECT id FROM giocatori WHERE auth_user_id = auth.uid()
    )
    OR is_super_admin()
  )
  WITH CHECK (
    club_id = my_club_id()
    OR sessione_id IN (
      SELECT sa.id FROM sessioni_allenamento sa
      JOIN   squadre sq ON sq.id = sa.squadra_id
      WHERE  sq.club_id = my_club_id()
    )
    OR is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Aggiorna RLS convocazioni: include giocatore proprietario
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE convocazioni ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON convocazioni;
CREATE POLICY club_isolation ON convocazioni FOR ALL TO authenticated
  USING (
    club_id = my_club_id()
    OR partita_id IN (SELECT id FROM partite WHERE club_id = my_club_id())
    OR giocatore_id IN (
      SELECT id FROM giocatori WHERE auth_user_id = auth.uid()
    )
    OR is_super_admin()
  )
  WITH CHECK (
    club_id = my_club_id()
    OR partita_id IN (SELECT id FROM partite WHERE club_id = my_club_id())
    OR is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Aggiorna RLS valutazioni_tecniche: giocatore vede le proprie valutazioni
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE valutazioni_tecniche ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation         ON valutazioni_tecniche;
DROP POLICY IF EXISTS valutazioni_giocatore  ON valutazioni_tecniche;

-- Staff: vede tutto il club
CREATE POLICY club_isolation ON valutazioni_tecniche FOR ALL TO authenticated
  USING (
    club_id = my_club_id()
    OR is_super_admin()
  )
  WITH CHECK (
    club_id = my_club_id()
    OR is_super_admin()
  );

-- Giocatore: vede le proprie valutazioni (anche senza club_id sul record)
CREATE POLICY valutazioni_giocatore ON valutazioni_tecniche FOR SELECT TO authenticated
  USING (
    giocatore_id IN (
      SELECT id FROM giocatori WHERE auth_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Verifica (commentato per produzione)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT 'sessioni senza club_id', COUNT(*) FROM sessioni_allenamento WHERE club_id IS NULL
-- UNION ALL
-- SELECT 'presenze senza club_id', COUNT(*) FROM presenze WHERE club_id IS NULL AND sessione_id IS NOT NULL
-- UNION ALL
-- SELECT 'convocazioni senza club_id', COUNT(*) FROM convocazioni WHERE club_id IS NULL
-- UNION ALL
-- SELECT 'utenti giocatori senza club_id', COUNT(*) FROM utenti WHERE ruolo = 'giocatore' AND club_id IS NULL;
