-- Nuove colonne contratti
ALTER TABLE contratti ALTER COLUMN giocatore_id DROP NOT NULL;
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS staff_id             UUID REFERENCES utenti(id);
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS tipo                 VARCHAR(30) DEFAULT 'rimborso_spese';
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS stato                VARCHAR(20) DEFAULT 'attivo';
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS importo_mensile      DECIMAL(10,2);
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS importo_annuo        DECIMAL(10,2);
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS bonus_firma          DECIMAL(10,2);
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS bonus_gol            DECIMAL(10,2);
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS bonus_presenze       DECIMAL(10,2);
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS clausola_rescissione DECIMAL(10,2);
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS note_private         TEXT;
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS firmato_da           VARCHAR(255);
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS data_firma           DATE;
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS documento_url        TEXT;
ALTER TABLE contratti ADD COLUMN IF NOT EXISTS visibile_ruoli       TEXT[] DEFAULT '{ds,presidente,segretario}';

-- Backfill stato per contratti esistenti basato su data_scadenza
UPDATE contratti
SET stato = CASE
  WHEN data_scadenza >= CURRENT_DATE THEN 'attivo'
  ELSE 'scaduto'
END
WHERE stato IS NULL;

-- Backfill importo_mensile da ingaggio_mensile esistente
UPDATE contratti
SET importo_mensile = ingaggio_mensile
WHERE importo_mensile IS NULL AND ingaggio_mensile IS NOT NULL;
