-- Aggiunge ON DELETE SET NULL alle FK che puntano a utenti(id) senza
-- comportamento di cascata esplicito. Senza questa modifica, eliminare un
-- utente dalla tabella utenti fallisce con un FK violation.

-- compensi.collaboratore_id
ALTER TABLE compensi
  DROP CONSTRAINT IF EXISTS compensi_collaboratore_id_fkey,
  ADD CONSTRAINT compensi_collaboratore_id_fkey
    FOREIGN KEY (collaboratore_id) REFERENCES utenti(id) ON DELETE SET NULL;

-- presenze.registrato_da
ALTER TABLE presenze
  DROP CONSTRAINT IF EXISTS presenze_registrato_da_fkey,
  ADD CONSTRAINT presenze_registrato_da_fkey
    FOREIGN KEY (registrato_da) REFERENCES utenti(id) ON DELETE SET NULL;

-- pagamenti.registrato_da
ALTER TABLE pagamenti
  DROP CONSTRAINT IF EXISTS pagamenti_registrato_da_fkey,
  ADD CONSTRAINT pagamenti_registrato_da_fkey
    FOREIGN KEY (registrato_da) REFERENCES utenti(id) ON DELETE SET NULL;

-- prima_nota.registrato_da
ALTER TABLE prima_nota
  DROP CONSTRAINT IF EXISTS prima_nota_registrato_da_fkey,
  ADD CONSTRAINT prima_nota_registrato_da_fkey
    FOREIGN KEY (registrato_da) REFERENCES utenti(id) ON DELETE SET NULL;
