-- FIX 034: consente al medico di aggiornare i campi sanitari di giocatori
-- La policy FOR ALL esistente copre SELECT/UPDATE ma potrebbe essere sovrascritta
-- da versioni concorrenti. Aggiunge una policy UPDATE esplicita per il ruolo medico.

DROP POLICY IF EXISTS giocatori_medico_update ON giocatori;

CREATE POLICY giocatori_medico_update ON giocatori
  FOR UPDATE
  USING (
    id IN (
      SELECT t.giocatore_id FROM tesseramenti t
      JOIN utenti u ON u.club_id = t.club_id
      WHERE u.id = auth.uid()
        AND u.ruolo = 'medico'
    )
  );
