-- FIX 038: aggiunge le colonne necessarie per la registrazione rapida presenze
-- (club_id, data, stato, staff_id) nel caso la migration 20260417 non le abbia applicate

DO $$ BEGIN
  CREATE TYPE stato_presenza_rapida AS ENUM ('presente', 'assente', 'giustificato');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE presenze
  ADD COLUMN IF NOT EXISTS staff_id  UUID REFERENCES utenti(id)  ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS club_id   UUID REFERENCES clubs(id)   ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS data      DATE,
  ADD COLUMN IF NOT EXISTS stato     stato_presenza_rapida;

-- Permetti sessione_id nullable (per presenze rapide senza sessione)
ALTER TABLE presenze ALTER COLUMN sessione_id DROP NOT NULL;
ALTER TABLE presenze ALTER COLUMN giocatore_id DROP NOT NULL;

-- Vincolo: almeno giocatore_id oppure staff_id (idempotente)
DO $$ BEGIN
  ALTER TABLE presenze
    ADD CONSTRAINT presenze_target_check
    CHECK (giocatore_id IS NOT NULL OR staff_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
