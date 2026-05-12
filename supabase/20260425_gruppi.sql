-- Gruppi (squadre, categorie, staff)

CREATE TABLE IF NOT EXISTS gruppi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome        VARCHAR(150) NOT NULL,
  descrizione TEXT,
  colore      VARCHAR(7) DEFAULT '#c8f000',
  tipo        VARCHAR(30) DEFAULT 'squadra',
  stagione    VARCHAR(10) DEFAULT '2024-25',
  attivo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE gruppi DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS gruppi_membri (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gruppo_id    UUID NOT NULL REFERENCES gruppi(id) ON DELETE CASCADE,
  giocatore_id UUID REFERENCES giocatori(id) ON DELETE CASCADE,
  utente_id    UUID REFERENCES utenti(id) ON DELETE CASCADE,
  ruolo_nel_gruppo VARCHAR(50),
  data_ingresso    DATE DEFAULT CURRENT_DATE,
  UNIQUE(gruppo_id, giocatore_id),
  UNIQUE(gruppo_id, utente_id)
);
ALTER TABLE gruppi_membri DISABLE ROW LEVEL SECURITY;
