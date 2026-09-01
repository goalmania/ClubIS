-- Traccia l'ultima esecuzione del controllo scadenze (certificati medici,
-- quote settore giovanile) per club, così il controllo può essere lanciato
-- anche "al primo accesso del giorno" da un utente (in aggiunta al cron delle
-- 9:00) senza rieseguire la scansione ad ogni singola pagina caricata.

CREATE TABLE IF NOT EXISTS club_controllo_scadenze (
  club_id           UUID PRIMARY KEY REFERENCES clubs(id) ON DELETE CASCADE,
  ultima_esecuzione DATE NOT NULL
);

ALTER TABLE club_controllo_scadenze ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS club_isolation ON club_controllo_scadenze;
CREATE POLICY club_isolation ON club_controllo_scadenze FOR ALL TO authenticated
  USING  (club_id = my_club_id() OR is_super_admin())
  WITH CHECK (club_id = my_club_id() OR is_super_admin());

GRANT ALL ON club_controllo_scadenze TO service_role;
