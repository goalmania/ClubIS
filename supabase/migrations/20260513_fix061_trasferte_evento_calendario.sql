-- FIX 061 — trasferte: aggiungi evento_calendario_id
--
-- Il selettore "Competizione/Evento" nel drawer trasferte mostra solo le
-- partite dalla tabella `partite` (vecchio sistema).
-- I team manager registrano le partite nel calendario (eventi_calendario,
-- tipologia='partita'), non nella tabella `partite`.
--
-- Fix: aggiungiamo una colonna nullable `evento_calendario_id` a `trasferte`
-- così una trasferta può essere collegata a un evento del calendario oppure
-- a una partita tradizionale (o a nessuna delle due).

ALTER TABLE trasferte
  ADD COLUMN IF NOT EXISTS evento_calendario_id UUID
    REFERENCES eventi_calendario(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trasferte_evento_calendario
  ON trasferte(evento_calendario_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON trasferte TO authenticated;
GRANT ALL ON trasferte TO service_role;
