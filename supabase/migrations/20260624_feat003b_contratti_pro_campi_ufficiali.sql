-- FEAT 003b — Campi aggiuntivi per template ufficiali Lega Pro / Serie B

ALTER TABLE contratti_professionisti
  ADD COLUMN IF NOT EXISTS rappresentante_legale     TEXT,
  ADD COLUMN IF NOT EXISTS qualifica_rappresentante  TEXT,
  ADD COLUMN IF NOT EXISTS cf_tesserato              TEXT,
  ADD COLUMN IF NOT EXISTS data_nascita_tesserato    TEXT,
  ADD COLUMN IF NOT EXISTS luogo_nascita_tesserato   TEXT,
  ADD COLUMN IF NOT EXISTS domicilio_tesserato       TEXT,
  ADD COLUMN IF NOT EXISTS matricola_tesserato       TEXT,
  ADD COLUMN IF NOT EXISTS agente_calciatore_nome    TEXT,
  ADD COLUMN IF NOT EXISTS agente_calciatore_reg     TEXT,
  ADD COLUMN IF NOT EXISTS agente_societa_nome       TEXT,
  ADD COLUMN IF NOT EXISTS agente_societa_reg        TEXT,
  ADD COLUMN IF NOT EXISTS numero_modulo             TEXT;
