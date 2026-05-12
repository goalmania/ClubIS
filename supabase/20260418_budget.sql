CREATE TABLE IF NOT EXISTS budget_societario (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  stagione     VARCHAR(10) NOT NULL,
  categoria    VARCHAR(80) NOT NULL,
  tipo         VARCHAR(10) NOT NULL,  -- entrata | uscita
  budget_annuo DECIMAL(12,2) DEFAULT 0,
  speso_ytd    DECIMAL(12,2) DEFAULT 0,
  note         TEXT,
  UNIQUE(club_id, stagione, categoria)
);
ALTER TABLE budget_societario DISABLE ROW LEVEL SECURITY;

INSERT INTO budget_societario (club_id, stagione, categoria, tipo, budget_annuo)
SELECT
  id,
  '2024-25',
  unnest(ARRAY[
    'ingaggi','rimborsi_giocatori','staff_tecnico','trasferte',
    'affiliazioni','arbitraggi','materiale','strutture','altro_uscite'
  ]),
  'uscita',
  0
FROM clubs
ON CONFLICT DO NOTHING;

INSERT INTO budget_societario (club_id, stagione, categoria, tipo, budget_annuo)
SELECT
  id,
  '2024-25',
  unnest(ARRAY['quote_famiglie','sponsorizzazioni','contributi','botteghino','cessioni','altro_entrate']),
  'entrata',
  0
FROM clubs
ON CONFLICT DO NOTHING;
