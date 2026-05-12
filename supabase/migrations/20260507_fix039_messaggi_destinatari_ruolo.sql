-- FIX 039: aggiunge le colonne destinatari_ruolo e destinatari_utente_ids
-- alla tabella messaggi (presenti in schema.sql ma mai applicate via migration)

ALTER TABLE messaggi
  ADD COLUMN IF NOT EXISTS destinatari_ruolo       JSONB,
  ADD COLUMN IF NOT EXISTS destinatari_utente_ids  JSONB,
  ADD COLUMN IF NOT EXISTS thread_id               UUID,
  ADD COLUMN IF NOT EXISTS allegato_url            TEXT;
