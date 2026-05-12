-- FIX 014 — Sconti: GRANT mancanti e RLS corretta
--
-- La migration 20260424_sconti.sql creava la tabella con
-- DISABLE ROW LEVEL SECURITY senza alcun GRANT → il ruolo
-- authenticated riceveva "permission denied" su qualsiasi operazione.

-- ── 1. Abilita RLS con policy club_id (coerente col resto del codebase) ────────

ALTER TABLE sconti_listino ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON sconti_listino;
  CREATE POLICY club_isolation ON sconti_listino
    FOR ALL USING (
      club_id = my_club_id()
      OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
    );
END $$;

-- ── 2. GRANT a authenticated ──────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON sconti_listino TO authenticated;

-- ── 3. Colonne sconti su rate_pagamento (idempotenti se già esistono) ──────────

ALTER TABLE rate_pagamento
  ADD COLUMN IF NOT EXISTS sconto_id        UUID REFERENCES sconti_listino(id),
  ADD COLUMN IF NOT EXISTS sconto_importo   DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS importo_originale DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS importo_scontato  DECIMAL(8,2);

-- ── 4. Trigger calcola_importo_scontato (ricreato idempotente) ─────────────────

CREATE OR REPLACE FUNCTION calcola_importo_scontato()
RETURNS TRIGGER AS $$
BEGIN
  NEW.importo_originale = COALESCE(NEW.importo_originale, NEW.importo);
  IF NEW.sconto_id IS NOT NULL AND NEW.sconto_importo > 0 THEN
    NEW.importo_scontato = GREATEST(0, NEW.importo_originale - NEW.sconto_importo);
    NEW.importo          = NEW.importo_scontato;
  ELSE
    NEW.importo_scontato = NEW.importo_originale;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_importo_scontato ON rate_pagamento;
CREATE TRIGGER trig_importo_scontato
  BEFORE INSERT OR UPDATE OF sconto_id, sconto_importo ON rate_pagamento
  FOR EACH ROW EXECUTE FUNCTION calcola_importo_scontato();
