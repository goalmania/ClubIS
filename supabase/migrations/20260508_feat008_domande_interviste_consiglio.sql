-- FEATURE 008: Separa note ufficio stampa da consiglio risposta
-- note_suggerimento → nota riservata all'ufficio stampa (contesto/strategia domanda)
-- consiglio_risposta → suggerimento per il destinatario su come rispondere

ALTER TABLE domande_interviste
  ADD COLUMN IF NOT EXISTS consiglio_risposta TEXT;
