-- FIX 049: Aggiunge regione_provenienza e nazione_provenienza a report_scouting
-- per la visualizzazione sulla mappa geografica nella dashboard osservatore

ALTER TABLE report_scouting
  ADD COLUMN IF NOT EXISTS regione_provenienza VARCHAR(60),
  ADD COLUMN IF NOT EXISTS nazione_provenienza VARCHAR(80) DEFAULT 'Italia',
  ADD COLUMN IF NOT EXISTS ruolo_osservato     VARCHAR(60),
  ADD COLUMN IF NOT EXISTS eta_stimata         SMALLINT;
