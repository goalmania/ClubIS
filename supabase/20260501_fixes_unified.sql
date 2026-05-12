-- supabase/20260501_fixes_unified.sql
-- Fix 1: materiale_sportivo con RLS disabilitato (schema cache error)
-- Fix 2: prima_nota trigger da rate_pagamento (entrate/uscite unified)
-- Fix 3: piani_pagamento importo_totale opzionale + RLS off

-- ── 1. Ricrea materiale_sportivo senza RLS ────────────────────────────────

DO $$ BEGIN
  CREATE TYPE materiale_richiesta_stato AS ENUM ('in_attesa', 'approvata', 'consegnata', 'rifiutata');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE materiale_urgenza AS ENUM ('bassa', 'media', 'alta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS materiale_sportivo (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id        UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tipo           VARCHAR(120) NOT NULL,
  descrizione    TEXT,
  quantita       INTEGER NOT NULL DEFAULT 1,
  stato          VARCHAR(20)  NOT NULL DEFAULT 'in_attesa',
  urgenza        VARCHAR(20)  NOT NULL DEFAULT 'media',
  richiedente    VARCHAR(160),
  data_richiesta TIMESTAMPTZ NOT NULL DEFAULT now(),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE materiale_sportivo DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_materiale_sportivo_club_data  ON materiale_sportivo(club_id, data_richiesta DESC);
CREATE INDEX IF NOT EXISTS idx_materiale_sportivo_club_stato ON materiale_sportivo(club_id, stato);

-- ── 2. piani_pagamento: rendi importo_totale opzionale + disabilita RLS ──

ALTER TABLE piani_pagamento
  ALTER COLUMN importo_totale SET DEFAULT 0,
  ALTER COLUMN importo_totale DROP NOT NULL;

ALTER TABLE piani_pagamento   DISABLE ROW LEVEL SECURITY;
ALTER TABLE rate_pagamento    DISABLE ROW LEVEL SECURITY;

-- ── 3. prima_nota: aggiungi colonna sorgente per tracciabilità ────────────

ALTER TABLE prima_nota
  ADD COLUMN IF NOT EXISTS sorgente        VARCHAR(50) DEFAULT 'manuale',
  -- 'manuale' | 'rate_pagamento' | 'quote_giovanili' | 'sponsor' | ecc.
  ADD COLUMN IF NOT EXISTS sorgente_id     UUID;
  -- FK logica (non enforced) all'ID del record sorgente

CREATE INDEX IF NOT EXISTS idx_prima_nota_sorgente ON prima_nota(sorgente, sorgente_id);

-- ── 4. Trigger: quando rate_pagamento.stato → 'pagata', scrivi in prima_nota

CREATE OR REPLACE FUNCTION fn_rate_pagamento_to_prima_nota()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_descrizione TEXT;
  v_categoria   VARCHAR(60);
  v_club_id     UUID;
BEGIN
  -- Solo quando passa a 'pagata' e non era già pagata
  IF NEW.stato <> 'pagata' OR (OLD.stato = 'pagata') THEN
    RETURN NEW;
  END IF;

  -- Evita duplicati: controlla se esiste già un record con sorgente_id
  IF EXISTS (
    SELECT 1 FROM prima_nota
    WHERE sorgente = 'rate_pagamento' AND sorgente_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Recupera descrizione dal piano collegato
  SELECT
    COALESCE(pp.descrizione, 'Pagamento rata'),
    NEW.club_id
  INTO v_descrizione, v_club_id
  FROM piani_pagamento pp
  WHERE pp.id = NEW.piano_id;

  -- Determina categoria dalla descrizione (keyword matching)
  v_categoria := CASE
    WHEN lower(v_descrizione) LIKE '%trasferta%' THEN 'trasferte'
    WHEN lower(v_descrizione) LIKE '%pullman%'   THEN 'trasferte'
    WHEN lower(v_descrizione) LIKE '%viaggio%'   THEN 'trasferte'
    WHEN lower(v_descrizione) LIKE '%materiale%' THEN 'materiale_sportivo'
    WHEN lower(v_descrizione) LIKE '%federazio%' THEN 'federazione'
    WHEN lower(v_descrizione) LIKE '%rimborso%'  THEN 'compensi_staff'
    WHEN lower(v_descrizione) LIKE '%iscrizio%'  THEN 'quote_iscrizione'
    WHEN lower(v_descrizione) LIKE '%sponsor%'   THEN 'sponsorizzazioni'
    ELSE 'altro'
  END;

  INSERT INTO prima_nota (
    club_id, tipo, categoria, importo, data, descrizione,
    sorgente, sorgente_id
  ) VALUES (
    NEW.club_id,
    'uscita',         -- le rate sono generalmente uscite
    v_categoria,
    NEW.importo,
    COALESCE(NEW.data_pagamento, CURRENT_DATE),
    v_descrizione,
    'rate_pagamento',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_rate_to_prima_nota ON rate_pagamento;
CREATE TRIGGER trig_rate_to_prima_nota
  AFTER UPDATE OF stato ON rate_pagamento
  FOR EACH ROW EXECUTE FUNCTION fn_rate_pagamento_to_prima_nota();

-- ── 5. Trigger: quote_giovanili pagata → prima_nota entrata ──────────────

CREATE OR REPLACE FUNCTION fn_quote_giovanili_to_prima_nota()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stato <> 'pagata' OR (OLD.stato = 'pagata') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM prima_nota
    WHERE sorgente = 'quote_giovanili' AND sorgente_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO prima_nota (
    club_id, tipo, categoria, importo, data, descrizione,
    sorgente, sorgente_id, squadra_id
  ) VALUES (
    NEW.club_id,
    'entrata',
    'quote_iscrizione',
    NEW.importo_mensile,
    COALESCE(NEW.data_pagamento, CURRENT_DATE),
    'Quota mensile ' || to_char(NEW.mese_competenza, 'Month YYYY'),
    'quote_giovanili',
    NEW.id,
    NEW.squadra_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_quote_giovanili_to_prima_nota ON quote_giovanili;
CREATE TRIGGER trig_quote_giovanili_to_prima_nota
  AFTER UPDATE OF stato ON quote_giovanili
  FOR EACH ROW EXECUTE FUNCTION fn_quote_giovanili_to_prima_nota();
