-- Categorie pagamento standard per tipo organizzazione

CREATE TABLE IF NOT EXISTS categorie_pagamento (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome         VARCHAR(150) NOT NULL,
  descrizione  TEXT,
  tipo_club    VARCHAR(30) DEFAULT 'tutti',
  -- tutti | scuola_calcio | dilettantistica | professionistica
  visibile     BOOLEAN DEFAULT true,
  ordine       INT DEFAULT 1
);

ALTER TABLE categorie_pagamento DISABLE ROW LEVEL SECURITY;

-- Indice per lookup rapido per club e tipo
CREATE INDEX IF NOT EXISTS idx_categorie_pagamento_club ON categorie_pagamento(club_id, tipo_club);
