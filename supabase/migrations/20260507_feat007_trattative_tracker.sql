-- FEATURE 007: Tracker Movimenti di Mercato
-- Aggiunge colonne mancanti alla tabella trattative per la nuova UI mercato

ALTER TABLE trattative
  ADD COLUMN IF NOT EXISTS nome_giocatore    VARCHAR(200),
  ADD COLUMN IF NOT EXISTS tipo              VARCHAR(20),
  ADD COLUMN IF NOT EXISTS importo_richiesto NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS importo_offerto   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS importo_accordo   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS procuratore       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS data_contatto     DATE,
  ADD COLUMN IF NOT EXISTS data_scadenza     DATE,
  ADD COLUMN IF NOT EXISTS ds_responsabile   UUID REFERENCES utenti(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS giocatore_id      UUID REFERENCES giocatori(id) ON DELETE SET NULL;

-- Migra i dati vecchi nelle nuove colonne se presenti
UPDATE trattative
  SET nome_giocatore = giocatore_nome,
      tipo           = tipo_operazione
  WHERE nome_giocatore IS NULL AND giocatore_nome IS NOT NULL;
