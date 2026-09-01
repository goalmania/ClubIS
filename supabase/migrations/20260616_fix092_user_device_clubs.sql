-- Tabella per isolare il club attivo per dispositivo.
-- Risolve il problema multi-device: utenti.club_id è condiviso tra tutti i dispositivi,
-- questa tabella mappa (user_id, device_id) → club_id per ogni dispositivo separatamente.

CREATE TABLE IF NOT EXISTS user_device_clubs (
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  club_id   uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);

-- Indice per lookup veloci per user_id (utile per pulizia)
CREATE INDEX IF NOT EXISTS idx_user_device_clubs_user_id ON user_device_clubs(user_id);

-- RLS: ogni utente può leggere/scrivere solo le proprie righe
ALTER TABLE user_device_clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_device_clubs_own" ON user_device_clubs
  FOR ALL USING (user_id = auth.uid());
