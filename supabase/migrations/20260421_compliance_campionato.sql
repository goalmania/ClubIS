-- Campi compliance per iscrizione campionato
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS statuto_conforme           BOOLEAN DEFAULT FALSE;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS ras_aggiornato             BOOLEAN DEFAULT FALSE;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS figc_affiliazione_stagione VARCHAR(10);
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS figc_affiliazione_pagata   BOOLEAN DEFAULT FALSE;
