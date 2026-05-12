-- Feature 2: Link invito per ruolo

CREATE TABLE IF NOT EXISTS inviti_club (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  ruolo       VARCHAR(30) NOT NULL,
  token       VARCHAR(64) UNIQUE NOT NULL,
  creato_da   UUID REFERENCES utenti(id),
  usato       BOOLEAN DEFAULT false,
  usato_da    UUID REFERENCES utenti(id),
  usato_at    TIMESTAMPTZ,
  scadenza    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE inviti_club DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS inviti_club_token  ON inviti_club(token);
CREATE INDEX IF NOT EXISTS inviti_club_clubid ON inviti_club(club_id, usato);
