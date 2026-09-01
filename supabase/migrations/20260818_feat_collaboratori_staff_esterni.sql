-- Consente di censire in Anagrafica Staff anche collaboratori privi di un
-- account utente nel club (es. figure esterne senza accesso alla piattaforma),
-- sul modello già usato da "compensi" (nome_esterno/cf_esterno).

ALTER TABLE collaboratori_staff ALTER COLUMN utente_id DROP NOT NULL;

ALTER TABLE collaboratori_staff
  ADD COLUMN IF NOT EXISTS nome_esterno    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cognome_esterno VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ruolo_esterno   VARCHAR(80);

-- Ogni riga deve riferirsi a un utente registrato oppure avere i dati
-- anagrafici esterni compilati (mai entrambi vuoti).
ALTER TABLE collaboratori_staff DROP CONSTRAINT IF EXISTS collaboratori_staff_persona_check;
ALTER TABLE collaboratori_staff
  ADD CONSTRAINT collaboratori_staff_persona_check CHECK (
    utente_id IS NOT NULL OR (nome_esterno IS NOT NULL AND cognome_esterno IS NOT NULL)
  );
