-- FIX 064 — RLS completo: isolamento dati per tutti i club
--
-- Obiettivo: ogni club vede SOLO i propri dati.
-- Copre tutte le tabelle con club_id che hanno RLS disabilitato o policy assenti.
-- Dipende da: my_club_id() e is_super_admin() definiti in schema.sql
--
-- Da applicare in Supabase SQL Editor → New query → Run

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER: garantisce che my_club_id() e is_super_admin() esistano
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION my_club_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT club_id FROM utenti WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((SELECT is_super_admin FROM utenti WHERE id = auth.uid() LIMIT 1), FALSE);
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELLE CON club_id DIRETTO
-- Macro usata: club_id = my_club_id() OR is_super_admin()
-- ═══════════════════════════════════════════════════════════════════════════

-- ── pagamenti ─────────────────────────────────────────────────────────────
ALTER TABLE pagamenti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON pagamenti;
CREATE POLICY club_isolation ON pagamenti FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── quietanze ─────────────────────────────────────────────────────────────
ALTER TABLE quietanze ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON quietanze;
CREATE POLICY club_isolation ON quietanze FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── registro_iva ──────────────────────────────────────────────────────────
ALTER TABLE registro_iva ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON registro_iva;
CREATE POLICY club_isolation ON registro_iva FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── sconti_listino ────────────────────────────────────────────────────────
ALTER TABLE sconti_listino ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON sconti_listino;
CREATE POLICY club_isolation ON sconti_listino FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── fornitori_clienti ─────────────────────────────────────────────────────
ALTER TABLE fornitori_clienti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON fornitori_clienti;
CREATE POLICY club_isolation ON fornitori_clienti FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── pagamenti_fornitore ───────────────────────────────────────────────────
ALTER TABLE pagamenti_fornitore ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON pagamenti_fornitore;
CREATE POLICY club_isolation ON pagamenti_fornitore FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── soggetti_pagamento ────────────────────────────────────────────────────
ALTER TABLE soggetti_pagamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON soggetti_pagamento;
CREATE POLICY club_isolation ON soggetti_pagamento FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── accrediti ─────────────────────────────────────────────────────────────
ALTER TABLE accrediti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON accrediti;
CREATE POLICY club_isolation ON accrediti FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── sponsors ──────────────────────────────────────────────────────────────
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON sponsors;
CREATE POLICY club_isolation ON sponsors FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── sponsor_pagamenti ─────────────────────────────────────────────────────
ALTER TABLE sponsor_pagamenti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON sponsor_pagamenti;
CREATE POLICY club_isolation ON sponsor_pagamenti FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── trasferte ─────────────────────────────────────────────────────────────
ALTER TABLE trasferte ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON trasferte;
CREATE POLICY club_isolation ON trasferte FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── visite_mediche ────────────────────────────────────────────────────────
ALTER TABLE visite_mediche ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON visite_mediche;
CREATE POLICY club_isolation ON visite_mediche FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── infortuni ─────────────────────────────────────────────────────────────
ALTER TABLE infortuni ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON infortuni;
CREATE POLICY club_isolation ON infortuni FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── squalifiche ───────────────────────────────────────────────────────────
ALTER TABLE squalifiche ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON squalifiche;
CREATE POLICY club_isolation ON squalifiche FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── allenamenti ───────────────────────────────────────────────────────────
ALTER TABLE allenamenti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON allenamenti;
CREATE POLICY club_isolation ON allenamenti FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── obiettivi_stagionali ──────────────────────────────────────────────────
ALTER TABLE obiettivi_stagionali ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON obiettivi_stagionali;
CREATE POLICY club_isolation ON obiettivi_stagionali FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── trattative ────────────────────────────────────────────────────────────
ALTER TABLE trattative ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON trattative;
CREATE POLICY club_isolation ON trattative FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── documenti_archivio ────────────────────────────────────────────────────
ALTER TABLE documenti_archivio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON documenti_archivio;
CREATE POLICY club_isolation ON documenti_archivio FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── piani_pagamento ───────────────────────────────────────────────────────
ALTER TABLE piani_pagamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON piani_pagamento;
CREATE POLICY club_isolation ON piani_pagamento FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── rate_pagamento ────────────────────────────────────────────────────────
ALTER TABLE rate_pagamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON rate_pagamento;
CREATE POLICY club_isolation ON rate_pagamento FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── quote_iscrizione ──────────────────────────────────────────────────────
ALTER TABLE quote_iscrizione ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON quote_iscrizione;
CREATE POLICY club_isolation ON quote_iscrizione FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── compensi ──────────────────────────────────────────────────────────────
ALTER TABLE compensi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON compensi;
CREATE POLICY club_isolation ON compensi FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── conti_corrente ────────────────────────────────────────────────────────
ALTER TABLE conti_corrente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON conti_corrente;
CREATE POLICY club_isolation ON conti_corrente FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── budget_stagionale ─────────────────────────────────────────────────────
ALTER TABLE budget_stagionale ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON budget_stagionale;
CREATE POLICY club_isolation ON budget_stagionale FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── entrate_previste ──────────────────────────────────────────────────────
ALTER TABLE entrate_previste ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON entrate_previste;
CREATE POLICY club_isolation ON entrate_previste FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── uscite_previste ───────────────────────────────────────────────────────
ALTER TABLE uscite_previste ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON uscite_previste;
CREATE POLICY club_isolation ON uscite_previste FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── materiale_sportivo ────────────────────────────────────────────────────
ALTER TABLE materiale_sportivo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON materiale_sportivo;
CREATE POLICY club_isolation ON materiale_sportivo FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── manutenzioni ──────────────────────────────────────────────────────────
ALTER TABLE manutenzioni ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON manutenzioni;
CREATE POLICY club_isolation ON manutenzioni FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── ritiri ────────────────────────────────────────────────────────────────
ALTER TABLE ritiri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON ritiri;
CREATE POLICY club_isolation ON ritiri FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── comunicazioni_club ────────────────────────────────────────────────────
ALTER TABLE comunicazioni_club ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON comunicazioni_club;
CREATE POLICY club_isolation ON comunicazioni_club FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── obiettivi_club ────────────────────────────────────────────────────────
ALTER TABLE obiettivi_club ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON obiettivi_club;
CREATE POLICY club_isolation ON obiettivi_club FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── figc_moduli_log ───────────────────────────────────────────────────────
ALTER TABLE figc_moduli_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON figc_moduli_log;
CREATE POLICY club_isolation ON figc_moduli_log FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── protocolli_prevenzione ────────────────────────────────────────────────
ALTER TABLE protocolli_prevenzione ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON protocolli_prevenzione;
CREATE POLICY club_isolation ON protocolli_prevenzione FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── distinte_gara ─────────────────────────────────────────────────────────
ALTER TABLE distinte_gara ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON distinte_gara;
CREATE POLICY club_isolation ON distinte_gara FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── moduli_iscrizione ─────────────────────────────────────────────────────
ALTER TABLE moduli_iscrizione ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON moduli_iscrizione;
CREATE POLICY club_isolation ON moduli_iscrizione FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── richieste_iscrizione ──────────────────────────────────────────────────
ALTER TABLE richieste_iscrizione ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON richieste_iscrizione;
CREATE POLICY club_isolation ON richieste_iscrizione FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── eventi_calendario ────────────────────────────────────────────────────
ALTER TABLE eventi_calendario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON eventi_calendario;
CREATE POLICY club_isolation ON eventi_calendario FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── squadre ───────────────────────────────────────────────────────────────
ALTER TABLE squadre ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON squadre;
CREATE POLICY club_isolation ON squadre FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELLE CON ACCESSO PERSONALE (utente corrente)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── presenze ─────────────────────────────────────────────────────────────
-- presenze è legata a sessioni_allenamento → squadre → club
ALTER TABLE presenze ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON presenze;
CREATE POLICY club_isolation ON presenze FOR ALL TO authenticated
  USING (
    sessione_id IN (
      SELECT sa.id FROM sessioni_allenamento sa
      JOIN squadre sq ON sq.id = sa.squadra_id
      WHERE sq.club_id = my_club_id()
    )
    OR is_super_admin()
  )
  WITH CHECK (
    sessione_id IN (
      SELECT sa.id FROM sessioni_allenamento sa
      JOIN squadre sq ON sq.id = sa.squadra_id
      WHERE sq.club_id = my_club_id()
    )
    OR is_super_admin()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELLE GLOBALI (no club_id — accesso pubblico in lettura)
-- Queste tabelle contengono dati di riferimento condivisi, non per-club
-- ═══════════════════════════════════════════════════════════════════════════

-- comunicate_figc: comunicati ufficiali FIGC visibili a tutti
ALTER TABLE comunicati_figc ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON comunicati_figc;
CREATE POLICY read_all ON comunicati_figc FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS super_admin_write ON comunicati_figc;
CREATE POLICY super_admin_write ON comunicati_figc FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- categorie_pagamento: lookup table globale
ALTER TABLE categorie_pagamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON categorie_pagamento;
CREATE POLICY read_all ON categorie_pagamento FOR SELECT TO authenticated USING (true);

-- documenti_definizioni: template di sistema
ALTER TABLE documenti_definizioni ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON documenti_definizioni;
CREATE POLICY read_all ON documenti_definizioni FOR SELECT TO authenticated USING (true);

-- documenti_varianti: template di sistema
ALTER TABLE documenti_varianti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON documenti_varianti;
CREATE POLICY read_all ON documenti_varianti FOR SELECT TO authenticated USING (true);

-- squalifiche_comunicato: lookup FIGC
ALTER TABLE squalifiche_comunicato ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON squalifiche_comunicato;
CREATE POLICY read_all ON squalifiche_comunicato FOR SELECT TO authenticated USING (true);

-- soglie_fiscali: tabelle di riferimento fiscale
ALTER TABLE soglie_fiscali ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON soglie_fiscali;
CREATE POLICY read_all ON soglie_fiscali FOR SELECT TO authenticated USING (true);

-- causali_pagamento: lookup
ALTER TABLE causali_pagamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON causali_pagamento;
CREATE POLICY read_all ON causali_pagamento FOR SELECT TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- GRANT service_role su tutte le tabelle aggiunte
-- (service_role bypassa RLS ma ha bisogno di GRANT per le query admin)
-- ═══════════════════════════════════════════════════════════════════════════
GRANT ALL ON pagamenti              TO service_role;
GRANT ALL ON quietanze              TO service_role;
GRANT ALL ON registro_iva           TO service_role;
GRANT ALL ON sconti_listino         TO service_role;
GRANT ALL ON fornitori_clienti      TO service_role;
GRANT ALL ON pagamenti_fornitore    TO service_role;
GRANT ALL ON soggetti_pagamento     TO service_role;
GRANT ALL ON accrediti              TO service_role;
GRANT ALL ON sponsors               TO service_role;
GRANT ALL ON sponsor_pagamenti      TO service_role;
GRANT ALL ON trasferte              TO service_role;
GRANT ALL ON visite_mediche         TO service_role;
GRANT ALL ON infortuni              TO service_role;
GRANT ALL ON squalifiche            TO service_role;
GRANT ALL ON allenamenti            TO service_role;
GRANT ALL ON obiettivi_stagionali   TO service_role;
GRANT ALL ON trattative             TO service_role;
GRANT ALL ON documenti_archivio     TO service_role;
GRANT ALL ON piani_pagamento        TO service_role;
GRANT ALL ON rate_pagamento         TO service_role;
GRANT ALL ON quote_iscrizione       TO service_role;
GRANT ALL ON compensi               TO service_role;
GRANT ALL ON conti_corrente         TO service_role;
GRANT ALL ON budget_stagionale      TO service_role;
GRANT ALL ON entrate_previste       TO service_role;
GRANT ALL ON uscite_previste        TO service_role;
GRANT ALL ON materiale_sportivo     TO service_role;
GRANT ALL ON manutenzioni           TO service_role;
GRANT ALL ON ritiri                 TO service_role;
GRANT ALL ON comunicazioni_club     TO service_role;
GRANT ALL ON obiettivi_club         TO service_role;
GRANT ALL ON figc_moduli_log        TO service_role;
GRANT ALL ON protocolli_prevenzione TO service_role;
GRANT ALL ON distinte_gara          TO service_role;
GRANT ALL ON moduli_iscrizione      TO service_role;
GRANT ALL ON richieste_iscrizione   TO service_role;
GRANT ALL ON eventi_calendario      TO service_role;
GRANT ALL ON squadre                TO service_role;
GRANT ALL ON presenze               TO service_role;
GRANT ALL ON comunicati_figc        TO service_role;
GRANT ALL ON categorie_pagamento    TO service_role;
GRANT ALL ON documenti_definizioni  TO service_role;
GRANT ALL ON documenti_varianti     TO service_role;
GRANT ALL ON squalifiche_comunicato TO service_role;
GRANT ALL ON soglie_fiscali         TO service_role;
GRANT ALL ON causali_pagamento      TO service_role;

-- DEFAULT PRIVILEGES: le future nuove tabelle avranno automaticamente GRANT
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
