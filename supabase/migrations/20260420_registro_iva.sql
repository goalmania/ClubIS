CREATE TABLE IF NOT EXISTS registro_iva (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id                  UUID NOT NULL REFERENCES clubs(id),
  numero_progressivo       VARCHAR(20) NOT NULL,
  data_operazione          DATE NOT NULL,
  tipo                     VARCHAR(20) NOT NULL,    -- entrata / uscita
  natura                   VARCHAR(100) NOT NULL,
  controparte              VARCHAR(200),
  imponibile               NUMERIC(10,2) NOT NULL,
  iva                      NUMERIC(10,2) DEFAULT 0,
  totale                   NUMERIC(10,2) NOT NULL,
  regime                   VARCHAR(50) DEFAULT 'esente_art10', -- esente_art10 / imponibile / fuori_campo
  riferimento_pagamento_id UUID,
  note                     TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE registro_iva DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_registro_iva_club_anno
  ON registro_iva(club_id, data_operazione);

CREATE INDEX IF NOT EXISTS idx_registro_iva_riferimento
  ON registro_iva(riferimento_pagamento_id);
