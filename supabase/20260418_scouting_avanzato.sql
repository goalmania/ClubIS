ALTER TABLE report_scouting ADD COLUMN IF NOT EXISTS valore_mercato_stimato DECIMAL(10,2);
ALTER TABLE report_scouting ADD COLUMN IF NOT EXISTS storico_club JSONB DEFAULT '[]';
-- [{club: string, stagione: string, campionato: string, presenze: number, gol: number, assist: number}]
ALTER TABLE report_scouting ADD COLUMN IF NOT EXISTS statistiche_stagione JSONB DEFAULT '{}';
-- {presenze: number, gol: number, assist: number, ammonizioni: number, espulsioni: number, minuti: number}
ALTER TABLE report_scouting ADD COLUMN IF NOT EXISTS piede_preferito VARCHAR(15);
ALTER TABLE report_scouting ADD COLUMN IF NOT EXISTS altezza_cm INT;
ALTER TABLE report_scouting ADD COLUMN IF NOT EXISTS peso_kg INT;
ALTER TABLE report_scouting ADD COLUMN IF NOT EXISTS nazionalita VARCHAR(60);
ALTER TABLE report_scouting ADD COLUMN IF NOT EXISTS fonte_dati TEXT;
ALTER TABLE report_scouting ADD COLUMN IF NOT EXISTS stato_pipeline VARCHAR(30) DEFAULT 'in_osservazione';
-- in_osservazione | interessante | da_contattare | archiviato
ALTER TABLE report_scouting ADD COLUMN IF NOT EXISTS velocita INT; -- rating 1-10

-- Storico osservazioni per radar chart (una per sessione di osservazione)
CREATE TABLE IF NOT EXISTS osservazioni_scouting (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id          UUID NOT NULL REFERENCES report_scouting(id) ON DELETE CASCADE,
  data_osservazione  DATE NOT NULL,
  partita_contesto   VARCHAR(200),
  tecnica            INT CHECK (tecnica BETWEEN 1 AND 10),
  fisico             INT CHECK (fisico BETWEEN 1 AND 10),
  tattica            INT CHECK (tattica BETWEEN 1 AND 10),
  mentalita          INT CHECK (mentalita BETWEEN 1 AND 10),
  velocita           INT CHECK (velocita BETWEEN 1 AND 10),
  note               TEXT,
  video_link         TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE osservazioni_scouting DISABLE ROW LEVEL SECURITY;
