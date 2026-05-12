-- Feature 3: Integrazione DM Scout

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS dmscout_api_key                TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS dmscout_abbonamento_attivo     BOOLEAN DEFAULT false;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS dmscout_abbonamento_scadenza   DATE;
