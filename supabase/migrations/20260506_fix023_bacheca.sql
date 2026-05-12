-- FIX 023 — Bacheca: colonne mancanti + RLS WITH CHECK
--
-- 20260426_bacheca.sql era nella root supabase/ senza essere mai applicato
-- → messaggi mancava di fissato, tipo_comunicazione, data_scadenza_post,
--   allegati, visibile_a, reazioni → ogni INSERT dalla bacheca falliva.
-- In più la policy mancava di WITH CHECK → INSERT bloccato per tutti i ruoli.

ALTER TABLE messaggi ADD COLUMN IF NOT EXISTS tipo_comunicazione  VARCHAR(20)  DEFAULT 'messaggio';
ALTER TABLE messaggi ADD COLUMN IF NOT EXISTS fissato             BOOLEAN      DEFAULT false;
ALTER TABLE messaggi ADD COLUMN IF NOT EXISTS data_scadenza_post  DATE;
ALTER TABLE messaggi ADD COLUMN IF NOT EXISTS allegati            JSONB        DEFAULT '[]'::jsonb;
ALTER TABLE messaggi ADD COLUMN IF NOT EXISTS visibile_a          TEXT[]       DEFAULT '{tutti}';
ALTER TABLE messaggi ADD COLUMN IF NOT EXISTS reazioni            JSONB        DEFAULT '{}'::jsonb;

-- Aggiorna la policy con WITH CHECK (era FOR ALL USING senza WITH CHECK)
DO $$ BEGIN
  DROP POLICY IF EXISTS club_isolation ON messaggi;
  CREATE POLICY club_isolation ON messaggi
    FOR ALL TO authenticated
    USING     (club_id = my_club_id() OR is_super_admin())
    WITH CHECK (club_id = my_club_id() OR is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS messaggi_fissato       ON messaggi(fissato)              WHERE fissato = true;
CREATE INDEX IF NOT EXISTS messaggi_tipo_com      ON messaggi(tipo_comunicazione);
CREATE INDEX IF NOT EXISTS messaggi_scadenza_post ON messaggi(data_scadenza_post);

-- Forza PostgREST a ricaricare la schema cache (altrimenti ORDER BY fissato fallisce)
NOTIFY pgrst, 'reload schema';
