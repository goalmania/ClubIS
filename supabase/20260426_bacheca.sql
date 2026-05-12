-- Feature 11: Bacheca e comunicazioni arricchite

ALTER TABLE messaggi ADD COLUMN IF NOT EXISTS tipo_comunicazione VARCHAR(20) DEFAULT 'messaggio';
-- Valori: messaggio | bacheca_post | annuncio

ALTER TABLE messaggi ADD COLUMN IF NOT EXISTS fissato         BOOLEAN DEFAULT false;
ALTER TABLE messaggi ADD COLUMN IF NOT EXISTS data_scadenza_post DATE;
ALTER TABLE messaggi ADD COLUMN IF NOT EXISTS allegati        JSONB DEFAULT '[]'::jsonb;
-- [{nome, url, tipo}]
ALTER TABLE messaggi ADD COLUMN IF NOT EXISTS visibile_a      TEXT[] DEFAULT '{tutti}';
-- ['tutti'] | ['famiglia'] | ['allenatore','ds'] ecc.

ALTER TABLE messaggi ADD COLUMN IF NOT EXISTS reazioni        JSONB DEFAULT '{}'::jsonb;
-- {emoji: count}
ALTER TABLE messaggi ADD COLUMN IF NOT EXISTS corpo           TEXT;
-- testo lungo del post bacheca (distinto da messaggio breve)

CREATE INDEX IF NOT EXISTS messaggi_fissato        ON messaggi(fissato)         WHERE fissato = true;
CREATE INDEX IF NOT EXISTS messaggi_tipo_com       ON messaggi(tipo_comunicazione);
CREATE INDEX IF NOT EXISTS messaggi_scadenza_post  ON messaggi(data_scadenza_post);
