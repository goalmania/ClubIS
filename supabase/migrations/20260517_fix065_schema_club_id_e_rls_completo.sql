-- FIX 065 — Schema completo: aggiunge club_id mancanti + RLS isolation per tutti i club
--
-- Da eseguire UNA SOLA VOLTA nel Supabase SQL Editor.
-- È idempotente: usa ADD COLUMN IF NOT EXISTS e DROP POLICY IF EXISTS.
-- Sostituisce e ingloba fix062 + fix063 + fix064.
--
-- Struttura:
--   PARTE 1 — Aggiunge club_id alle tabelle che potrebbero non averlo
--   PARTE 2 — Helper functions (my_club_id, is_super_admin)
--   PARTE 3 — Abilita RLS e crea policy di isolamento su ogni tabella
--   PARTE 4 — GRANT service_role su tutte le tabelle
--   PARTE 5 — DEFAULT PRIVILEGES per tabelle future

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 1 — Aggiunge club_id dove mancante (ADD COLUMN IF NOT EXISTS è safe)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE utenti                       ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE squadre                      ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE tesseramenti                 ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE certificati_medici           ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE contratti                    ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE collaboratori_staff          ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE presenze                     ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE valutazioni_tecniche         ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE materiale_sportivo           ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE messaggi                     ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE quote_iscrizione             ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE prima_nota                   ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE notifiche_sistema            ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE eventi_calendario            ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;

-- Tabelle aggiunte successivamente che potrebbero mancarne
ALTER TABLE pagamenti                    ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE giocatori                    ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE famiglie                     ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE sessioni_allenamento         ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE convocazioni                 ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE statistiche_partita          ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE report_scouting              ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE messaggi_letture             ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE partite                      ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 2 — Helper functions
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
-- PARTE 3 — RLS + policy club_isolation su ogni tabella
-- Convenzione: club_id = my_club_id() OR is_super_admin()
-- ═══════════════════════════════════════════════════════════════════════════

-- ── clubs ─────────────────────────────────────────────────────────────────
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON clubs;
CREATE POLICY club_isolation ON clubs FOR ALL TO authenticated
  USING  (id = my_club_id() OR is_super_admin())
  WITH CHECK (id = my_club_id() OR is_super_admin());

-- ── utenti ────────────────────────────────────────────────────────────────
ALTER TABLE utenti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON utenti;
CREATE POLICY club_isolation ON utenti FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin() OR id = auth.uid())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── squadre ───────────────────────────────────────────────────────────────
ALTER TABLE squadre ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON squadre;
CREATE POLICY club_isolation ON squadre FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── giocatori ─────────────────────────────────────────────────────────────
ALTER TABLE giocatori ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON giocatori;
CREATE POLICY club_isolation ON giocatori FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── tesseramenti ──────────────────────────────────────────────────────────
ALTER TABLE tesseramenti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON tesseramenti;
CREATE POLICY club_isolation ON tesseramenti FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── certificati_medici ────────────────────────────────────────────────────
ALTER TABLE certificati_medici ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON certificati_medici;
CREATE POLICY club_isolation ON certificati_medici FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── contratti ─────────────────────────────────────────────────────────────
ALTER TABLE contratti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON contratti;
CREATE POLICY club_isolation ON contratti FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── collaboratori_staff ───────────────────────────────────────────────────
ALTER TABLE collaboratori_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON collaboratori_staff;
CREATE POLICY club_isolation ON collaboratori_staff FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── famiglie ──────────────────────────────────────────────────────────────
ALTER TABLE famiglie ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS famiglie_access ON famiglie;
DROP POLICY IF EXISTS club_isolation ON famiglie;
CREATE POLICY club_isolation ON famiglie FOR ALL TO authenticated
  USING  (
    club_id = my_club_id()
    OR auth_user_id = auth.uid()
    OR is_super_admin()
  )
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── sessioni_allenamento ──────────────────────────────────────────────────
-- Filtra via squadra → club se club_id non è diretto
ALTER TABLE sessioni_allenamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON sessioni_allenamento;
CREATE POLICY club_isolation ON sessioni_allenamento FOR ALL TO authenticated
  USING  (
    club_id = my_club_id()
    OR squadra_id IN (SELECT id FROM squadre WHERE club_id = my_club_id())
    OR is_super_admin()
  )
  WITH CHECK (
    club_id = my_club_id()
    OR squadra_id IN (SELECT id FROM squadre WHERE club_id = my_club_id())
    OR is_super_admin()
  );

-- ── presenze ──────────────────────────────────────────────────────────────
ALTER TABLE presenze ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON presenze;
CREATE POLICY club_isolation ON presenze FOR ALL TO authenticated
  USING  (
    club_id = my_club_id()
    OR sessione_id IN (
      SELECT sa.id FROM sessioni_allenamento sa
      JOIN squadre sq ON sq.id = sa.squadra_id
      WHERE sq.club_id = my_club_id()
    )
    OR is_super_admin()
  )
  WITH CHECK (
    club_id = my_club_id()
    OR sessione_id IN (
      SELECT sa.id FROM sessioni_allenamento sa
      JOIN squadre sq ON sq.id = sa.squadra_id
      WHERE sq.club_id = my_club_id()
    )
    OR is_super_admin()
  );

-- ── convocazioni ──────────────────────────────────────────────────────────
ALTER TABLE convocazioni ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON convocazioni;
CREATE POLICY club_isolation ON convocazioni FOR ALL TO authenticated
  USING  (
    club_id = my_club_id()
    OR partita_id IN (
      SELECT id FROM partite WHERE club_id = my_club_id()
    )
    OR is_super_admin()
  )
  WITH CHECK (
    club_id = my_club_id()
    OR partita_id IN (
      SELECT id FROM partite WHERE club_id = my_club_id()
    )
    OR is_super_admin()
  );

-- ── partite ────────────────────────────────────────────────────────────────
ALTER TABLE partite ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON partite;
CREATE POLICY club_isolation ON partite FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── statistiche_partita ───────────────────────────────────────────────────
ALTER TABLE statistiche_partita ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON statistiche_partita;
CREATE POLICY club_isolation ON statistiche_partita FOR ALL TO authenticated
  USING  (
    club_id = my_club_id()
    OR partita_id IN (SELECT id FROM partite WHERE club_id = my_club_id())
    OR is_super_admin()
  )
  WITH CHECK (
    club_id = my_club_id()
    OR partita_id IN (SELECT id FROM partite WHERE club_id = my_club_id())
    OR is_super_admin()
  );

-- ── valutazioni_tecniche ──────────────────────────────────────────────────
ALTER TABLE valutazioni_tecniche ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON valutazioni_tecniche;
CREATE POLICY club_isolation ON valutazioni_tecniche FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── report_scouting ───────────────────────────────────────────────────────
ALTER TABLE report_scouting ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON report_scouting;
CREATE POLICY club_isolation ON report_scouting FOR ALL TO authenticated
  USING  (
    club_id = my_club_id()
    OR club_richiedente_id = my_club_id()
    OR is_super_admin()
  )
  WITH CHECK (
    club_id = my_club_id()
    OR club_richiedente_id = my_club_id()
    OR is_super_admin()
  );

-- ── messaggi ──────────────────────────────────────────────────────────────
ALTER TABLE messaggi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON messaggi;
CREATE POLICY club_isolation ON messaggi FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── messaggi_letture ──────────────────────────────────────────────────────
ALTER TABLE messaggi_letture ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON messaggi_letture;
CREATE POLICY club_isolation ON messaggi_letture FOR ALL TO authenticated
  USING  (
    club_id = my_club_id()
    OR messaggio_id IN (SELECT id FROM messaggi WHERE club_id = my_club_id())
    OR utente_id = auth.uid()
    OR is_super_admin()
  )
  WITH CHECK (
    club_id = my_club_id()
    OR messaggio_id IN (SELECT id FROM messaggi WHERE club_id = my_club_id())
    OR is_super_admin()
  );

-- ── prima_nota ────────────────────────────────────────────────────────────
ALTER TABLE prima_nota ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON prima_nota;
CREATE POLICY club_isolation ON prima_nota FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── notifiche_sistema ─────────────────────────────────────────────────────
ALTER TABLE notifiche_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON notifiche_sistema;
CREATE POLICY club_isolation ON notifiche_sistema FOR ALL TO authenticated
  USING  (
    club_id = my_club_id()
    OR destinatario_id = auth.uid()
    OR is_super_admin()
  )
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── quote_iscrizione ──────────────────────────────────────────────────────
ALTER TABLE quote_iscrizione ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON quote_iscrizione;
CREATE POLICY club_isolation ON quote_iscrizione FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ── pagamenti ─────────────────────────────────────────────────────────────
ALTER TABLE pagamenti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON pagamenti;
CREATE POLICY club_isolation ON pagamenti FOR ALL TO authenticated
  USING  (
    club_id = my_club_id()
    OR quota_id IN (SELECT id FROM quote_iscrizione WHERE club_id = my_club_id())
    OR is_super_admin()
  )
  WITH CHECK (
    club_id = my_club_id()
    OR quota_id IN (SELECT id FROM quote_iscrizione WHERE club_id = my_club_id())
    OR is_super_admin()
  );

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

-- ── materiale_sportivo ────────────────────────────────────────────────────
ALTER TABLE materiale_sportivo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON materiale_sportivo;
CREATE POLICY club_isolation ON materiale_sportivo FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- TABELLE GLOBALI (riferimento FIGC/sistema, nessun club_id)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE comunicati_figc ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON comunicati_figc;
DROP POLICY IF EXISTS super_admin_write ON comunicati_figc;
CREATE POLICY read_all ON comunicati_figc FOR SELECT TO authenticated USING (true);
CREATE POLICY super_admin_write ON comunicati_figc FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

ALTER TABLE categorie_pagamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON categorie_pagamento;
CREATE POLICY read_all ON categorie_pagamento FOR SELECT TO authenticated USING (true);

ALTER TABLE documenti_definizioni ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON documenti_definizioni;
CREATE POLICY read_all ON documenti_definizioni FOR SELECT TO authenticated USING (true);

ALTER TABLE documenti_varianti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON documenti_varianti;
CREATE POLICY read_all ON documenti_varianti FOR SELECT TO authenticated USING (true);

ALTER TABLE squalifiche_comunicato ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON squalifiche_comunicato;
CREATE POLICY read_all ON squalifiche_comunicato FOR SELECT TO authenticated USING (true);

ALTER TABLE soglie_fiscali ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON soglie_fiscali;
CREATE POLICY read_all ON soglie_fiscali FOR SELECT TO authenticated USING (true);

ALTER TABLE causali_pagamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON causali_pagamento;
CREATE POLICY read_all ON causali_pagamento FOR SELECT TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 4 — GRANT service_role su TUTTE le tabelle
-- ═══════════════════════════════════════════════════════════════════════════
GRANT ALL ON clubs                   TO service_role;
GRANT ALL ON utenti                  TO service_role;
GRANT ALL ON squadre                 TO service_role;
GRANT ALL ON giocatori               TO service_role;
GRANT ALL ON tesseramenti            TO service_role;
GRANT ALL ON certificati_medici      TO service_role;
GRANT ALL ON contratti               TO service_role;
GRANT ALL ON collaboratori_staff     TO service_role;
GRANT ALL ON famiglie                TO service_role;
GRANT ALL ON sessioni_allenamento    TO service_role;
GRANT ALL ON presenze                TO service_role;
GRANT ALL ON convocazioni            TO service_role;
GRANT ALL ON partite                 TO service_role;
GRANT ALL ON statistiche_partita     TO service_role;
GRANT ALL ON valutazioni_tecniche    TO service_role;
GRANT ALL ON report_scouting         TO service_role;
GRANT ALL ON messaggi                TO service_role;
GRANT ALL ON messaggi_letture        TO service_role;
GRANT ALL ON prima_nota              TO service_role;
GRANT ALL ON notifiche_sistema       TO service_role;
GRANT ALL ON quote_iscrizione        TO service_role;
GRANT ALL ON pagamenti               TO service_role;
GRANT ALL ON quietanze               TO service_role;
GRANT ALL ON registro_iva            TO service_role;
GRANT ALL ON sconti_listino          TO service_role;
GRANT ALL ON fornitori_clienti       TO service_role;
GRANT ALL ON pagamenti_fornitore     TO service_role;
GRANT ALL ON soggetti_pagamento      TO service_role;
GRANT ALL ON accrediti               TO service_role;
GRANT ALL ON sponsors                TO service_role;
GRANT ALL ON sponsor_pagamenti       TO service_role;
GRANT ALL ON trasferte               TO service_role;
GRANT ALL ON visite_mediche          TO service_role;
GRANT ALL ON infortuni               TO service_role;
GRANT ALL ON squalifiche             TO service_role;
GRANT ALL ON allenamenti             TO service_role;
GRANT ALL ON obiettivi_stagionali    TO service_role;
GRANT ALL ON trattative              TO service_role;
GRANT ALL ON documenti_archivio      TO service_role;
GRANT ALL ON piani_pagamento         TO service_role;
GRANT ALL ON rate_pagamento          TO service_role;
GRANT ALL ON compensi                TO service_role;
GRANT ALL ON conti_corrente          TO service_role;
GRANT ALL ON budget_stagionale       TO service_role;
GRANT ALL ON entrate_previste        TO service_role;
GRANT ALL ON uscite_previste         TO service_role;
GRANT ALL ON materiale_sportivo      TO service_role;
GRANT ALL ON manutenzioni            TO service_role;
GRANT ALL ON ritiri                  TO service_role;
GRANT ALL ON comunicazioni_club      TO service_role;
GRANT ALL ON obiettivi_club          TO service_role;
GRANT ALL ON figc_moduli_log         TO service_role;
GRANT ALL ON protocolli_prevenzione  TO service_role;
GRANT ALL ON distinte_gara           TO service_role;
GRANT ALL ON moduli_iscrizione       TO service_role;
GRANT ALL ON richieste_iscrizione    TO service_role;
GRANT ALL ON eventi_calendario       TO service_role;
GRANT ALL ON comunicati_figc         TO service_role;
GRANT ALL ON categorie_pagamento     TO service_role;
GRANT ALL ON documenti_definizioni   TO service_role;
GRANT ALL ON documenti_varianti      TO service_role;
GRANT ALL ON squalifiche_comunicato  TO service_role;
GRANT ALL ON soglie_fiscali          TO service_role;
GRANT ALL ON causali_pagamento       TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 5 — DEFAULT PRIVILEGES: nuove tabelle create in futuro
-- ═══════════════════════════════════════════════════════════════════════════
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
