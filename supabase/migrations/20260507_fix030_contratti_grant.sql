-- FIX 030 — contratti: GRANT mancante
--
-- La tabella ha RLS abilitata e policy contratti_restricted, ma non era mai
-- stato eseguito un GRANT sul ruolo authenticated → default-deny su tutte
-- le operazioni (SELECT incluso, quindi il selettore giocatore risultava vuoto).

GRANT SELECT, INSERT, UPDATE, DELETE ON contratti TO authenticated;

-- La policy esistente usa FOR ALL USING(...) senza WITH CHECK: PostgreSQL
-- applica automaticamente l'espressione USING anche come WITH CHECK.
-- La policy è quindi già corretta; serve solo il GRANT per sbloccarla.

NOTIFY pgrst, 'reload schema';
