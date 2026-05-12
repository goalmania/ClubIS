-- ============================================================
-- DA ESEGUIRE NEL SQL EDITOR DI SUPABASE
-- Dashboard → SQL Editor → New query → incolla → Run
-- ============================================================

-- 1. Crea la tabella materiale_sportivo (usa VARCHAR, no enum)
CREATE TABLE IF NOT EXISTS public.materiale_sportivo (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id        UUID        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  tipo           VARCHAR(120) NOT NULL,
  descrizione    TEXT,
  quantita       INTEGER     NOT NULL DEFAULT 1,
  stato          VARCHAR(20) NOT NULL DEFAULT 'in_attesa',
  urgenza        VARCHAR(20) NOT NULL DEFAULT 'media',
  richiedente    VARCHAR(160),
  data_richiesta TIMESTAMPTZ NOT NULL DEFAULT now(),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Disabilita RLS (l'accesso è controllato dall'API layer)
ALTER TABLE public.materiale_sportivo DISABLE ROW LEVEL SECURITY;

-- 3. Indici
CREATE INDEX IF NOT EXISTS idx_materiale_sportivo_club_data
  ON public.materiale_sportivo(club_id, data_richiesta DESC);

CREATE INDEX IF NOT EXISTS idx_materiale_sportivo_club_stato
  ON public.materiale_sportivo(club_id, stato);

-- 4. Colonne extra su prima_nota per tracciabilità sorgente
ALTER TABLE public.prima_nota
  ADD COLUMN IF NOT EXISTS sorgente    VARCHAR(50) DEFAULT 'manuale',
  ADD COLUMN IF NOT EXISTS sorgente_id UUID;

-- 5. Fix piani_pagamento: importo_totale opzionale + disabilita RLS
ALTER TABLE public.piani_pagamento
  ALTER COLUMN importo_totale SET DEFAULT 0,
  ALTER COLUMN importo_totale DROP NOT NULL;

ALTER TABLE public.piani_pagamento  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_pagamento   DISABLE ROW LEVEL SECURITY;

-- 6. Trigger: rate_pagamento pagata → prima_nota automatica
CREATE OR REPLACE FUNCTION public.fn_rate_pagamento_to_prima_nota()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_descrizione TEXT;
  v_categoria   VARCHAR(60);
BEGIN
  IF NEW.stato <> 'pagata' OR OLD.stato = 'pagata' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.prima_nota
    WHERE sorgente = 'rate_pagamento' AND sorgente_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(pp.descrizione, 'Pagamento rata')
    INTO v_descrizione
    FROM public.piani_pagamento pp
   WHERE pp.id = NEW.piano_id;

  v_categoria := CASE
    WHEN lower(v_descrizione) LIKE '%trasferta%' THEN 'trasferte'
    WHEN lower(v_descrizione) LIKE '%pullman%'   THEN 'trasferte'
    WHEN lower(v_descrizione) LIKE '%viaggio%'   THEN 'trasferte'
    WHEN lower(v_descrizione) LIKE '%materiale%' THEN 'materiale_sportivo'
    WHEN lower(v_descrizione) LIKE '%federazio%' THEN 'federazione'
    WHEN lower(v_descrizione) LIKE '%rimborso%'  THEN 'compensi_staff'
    WHEN lower(v_descrizione) LIKE '%iscrizio%'  THEN 'quote_iscrizione'
    ELSE 'altro'
  END;

  INSERT INTO public.prima_nota
    (club_id, tipo, categoria, importo, data, descrizione, sorgente, sorgente_id)
  VALUES
    (NEW.club_id, 'uscita', v_categoria, NEW.importo,
     COALESCE(NEW.data_pagamento, CURRENT_DATE),
     v_descrizione, 'rate_pagamento', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_rate_to_prima_nota ON public.rate_pagamento;
CREATE TRIGGER trig_rate_to_prima_nota
  AFTER UPDATE OF stato ON public.rate_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.fn_rate_pagamento_to_prima_nota();

SELECT 'OK — tabella materiale_sportivo creata e trigger attivato' AS risultato;
