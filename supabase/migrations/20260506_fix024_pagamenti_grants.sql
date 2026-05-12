-- FIX 024 — Pagamenti: GRANT mancante + RLS WITH CHECK su famiglie, piani_pagamento, rate_pagamento
--
-- Stessa causa del FIX 008: le tabelle del modulo pagamenti non avevano GRANT
-- verso il ruolo authenticated nelle migrazioni → il ruolo presidente (e chiunque
-- non segretario) riceveva "permission denied" che PostgREST trasforma in data:null
-- → la pagina mostra "Famiglia non trovata".
-- Le policy erano anche prive di WITH CHECK → INSERT bloccato per INSERT/UPDATE.

-- ── famiglie ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS famiglie_access ON famiglie;
  CREATE POLICY famiglie_access ON famiglie
    FOR ALL TO authenticated
    USING (
      giocatore_id IN (SELECT giocatore_id FROM tesseramenti WHERE club_id = my_club_id())
      OR is_super_admin()
    )
    WITH CHECK (
      giocatore_id IN (SELECT giocatore_id FROM tesseramenti WHERE club_id = my_club_id())
      OR is_super_admin()
    );
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON famiglie TO authenticated;

-- ── piani_pagamento ───────────────────────────────────────────────────────────
ALTER TABLE piani_pagamento ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON piani_pagamento;
  DROP POLICY IF EXISTS piani_club     ON piani_pagamento;
  CREATE POLICY club_isolation ON piani_pagamento
    FOR ALL TO authenticated
    USING     (club_id = my_club_id() OR is_super_admin())
    WITH CHECK (club_id = my_club_id() OR is_super_admin());
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON piani_pagamento TO authenticated;

-- ── rate_pagamento ────────────────────────────────────────────────────────────
ALTER TABLE rate_pagamento ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON rate_pagamento;
  DROP POLICY IF EXISTS rate_club      ON rate_pagamento;
  CREATE POLICY club_isolation ON rate_pagamento
    FOR ALL TO authenticated
    USING     (club_id = my_club_id() OR is_super_admin())
    WITH CHECK (club_id = my_club_id() OR is_super_admin());
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON rate_pagamento TO authenticated;

-- ── soggetti_pagamento ────────────────────────────────────────────────────────
-- RLS era disabilitato nel migrations/20260421_pagamenti_fix.sql
-- Nessun club_id → non serve RLS, ma serve il GRANT
GRANT SELECT, INSERT, UPDATE, DELETE ON soggetti_pagamento TO authenticated;
