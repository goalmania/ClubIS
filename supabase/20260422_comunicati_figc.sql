-- FIGC-2: Aggiunte alla tabella comunicati_figc per il wizard testo incollato
-- Le colonne url_pdf e testo_estratto esistono già per il flusso PDF.
-- Aggiungiamo: testo_grezzo (testo incollato a mano) e provvedimenti_json (risultato parser).

ALTER TABLE comunicati_figc
  ADD COLUMN IF NOT EXISTS testo_grezzo        TEXT,
  ADD COLUMN IF NOT EXISTS provvedimenti_json  JSONB;

-- Indice GIN per ricerche future sui provvedimenti
CREATE INDEX IF NOT EXISTS idx_comunicati_figc_provvedimenti
  ON comunicati_figc USING GIN (provvedimenti_json);

-- Assicuriamoci che la colonna testo_estratto esista (retro-compatibilità)
ALTER TABLE comunicati_figc
  ADD COLUMN IF NOT EXISTS testo_estratto TEXT;
