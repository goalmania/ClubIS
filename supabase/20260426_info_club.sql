-- Feature 8: Info Club – additional columns on clubs table

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS forma_giuridica           TEXT;
-- es: 'asd', 'ssd', 'societa_sportiva', 'associazione'
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS codice_fiscale            TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS partita_iva               TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS pec                       TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS sdi                       TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS iban                      TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS bic                       TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS intestatario_conto        TEXT;

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS legale_rappresentante_nome  TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS legale_rappresentante_cf    TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS legale_rappresentante_ruolo TEXT DEFAULT 'Presidente';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS firma_presidente_url        TEXT;

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS via                       TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS cap                       TEXT;
-- citta, provincia, regione already exist

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS coni_codice               TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS csi_codice                TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS uisp_codice               TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS altra_federazione_nome    TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS altra_federazione_codice  TEXT;

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS social_instagram          TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS social_facebook           TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS social_twitter            TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS social_youtube            TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS social_tiktok             TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS social_linkedin           TEXT;

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS sponsor_principale        TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS sponsor_logo_url          TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS sponsor_sito              TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS sponsor_secondari         JSONB DEFAULT '[]'::jsonb;

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS colori_maglia_principale  TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS colori_maglia_portiere    TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS note_interne              TEXT;
