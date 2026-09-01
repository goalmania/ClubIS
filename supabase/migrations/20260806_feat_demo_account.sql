-- FEAT — Account demo per il team vendite
-- Un account con is_demo_account = true può usare "Visualizza come" per
-- cambiare il ruolo visualizzato (stesso meccanismo di impersonation dei
-- super_admin), ma SOLO sui club a cui è già iscritto tramite user_clubs
-- (status='accepted') — a differenza di is_super_admin(), non bypassa
-- l'isolamento dati verso i club reali dei clienti.

ALTER TABLE utenti
  ADD COLUMN IF NOT EXISTS is_demo_account BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN utenti.is_demo_account IS
  'Account demo (es. vendite): abilita "Visualizza come" per cambiare ruolo, ristretto ai club a cui è già iscritto in user_clubs. Non concede i privilegi di is_super_admin().';
