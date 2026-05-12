-- FIX 026 — Tuttocampo: colonne mancanti su clubs e partite
--
-- Il codice già referenziava tuttocampo_url (clubs) e inseriva club_id (partite)
-- ma le colonne non esistevano nel DDL base → le write silently falliva.

ALTER TABLE clubs   ADD COLUMN IF NOT EXISTS tuttocampo_url TEXT;

-- club_id su partite: necessario per RLS e per le insert già presenti nel frontend
ALTER TABLE partite ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_partite_club ON partite(club_id);

-- tuttocampo_id: chiave di dedup per import da Tuttocampo (formato: YYYYMMDD_slug)
ALTER TABLE partite ADD COLUMN IF NOT EXISTS tuttocampo_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_partite_tuttocampo_id ON partite(tuttocampo_id) WHERE tuttocampo_id IS NOT NULL;

-- RLS su partite: se non già presente, aggiungi policy club_isolation
ALTER TABLE partite ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON partite;
  CREATE POLICY club_isolation ON partite
    FOR ALL TO authenticated
    USING (
      squadra_id IN (SELECT id FROM squadre WHERE club_id = my_club_id())
      OR is_super_admin()
    )
    WITH CHECK (
      squadra_id IN (SELECT id FROM squadre WHERE club_id = my_club_id())
      OR is_super_admin()
    );
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON partite TO authenticated;
