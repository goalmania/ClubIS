CREATE TABLE IF NOT EXISTS sconti_listino (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome        VARCHAR(150) NOT NULL,
  tipo        VARCHAR(10) NOT NULL DEFAULT 'percentuale',
  valore      DECIMAL(8,2) NOT NULL,
  applicabile_a VARCHAR(30) DEFAULT 'quota',
  attivo      BOOLEAN DEFAULT true,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE sconti_listino DISABLE ROW LEVEL SECURITY;

ALTER TABLE rate_pagamento
  ADD COLUMN IF NOT EXISTS sconto_id UUID REFERENCES sconti_listino(id),
  ADD COLUMN IF NOT EXISTS sconto_importo DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS importo_originale DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS importo_scontato DECIMAL(8,2);

CREATE OR REPLACE FUNCTION calcola_importo_scontato()
RETURNS TRIGGER AS $$
BEGIN
  NEW.importo_originale = COALESCE(NEW.importo_originale, NEW.importo);
  IF NEW.sconto_id IS NOT NULL AND NEW.sconto_importo > 0 THEN
    NEW.importo_scontato = GREATEST(0, NEW.importo_originale - NEW.sconto_importo);
    NEW.importo = NEW.importo_scontato;
  ELSE
    NEW.importo_scontato = NEW.importo_originale;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_importo_scontato ON rate_pagamento;
CREATE TRIGGER trig_importo_scontato
  BEFORE INSERT OR UPDATE OF sconto_id, sconto_importo ON rate_pagamento
  FOR EACH ROW EXECUTE FUNCTION calcola_importo_scontato();
