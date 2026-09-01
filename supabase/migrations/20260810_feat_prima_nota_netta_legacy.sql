-- Prima Nota netta anche per i due path legacy (quote_giovanili, rate_pagamento)
-- quando il pagamento è avvenuto tramite ClubIS Pay (metodo_pagamento = 'stripe'):
-- registra l'importo netto che il club incassa davvero (dopo la sua metà di
-- commissione, 0,75%), non l'importo lordo pagato dalla famiglia. Per
-- contanti/bonifico/altro il comportamento resta invariato.
-- Commissione ClubIS Pay: 1,5% totale, metà a carico del club → netto club
-- = importo * (1 - 0.0075) = importo * 0.9925 (stessa formula di
-- importoNettoClub() in src/lib/stripe.ts).

CREATE OR REPLACE FUNCTION fn_rate_pagamento_to_prima_nota()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_descrizione TEXT;
  v_categoria   VARCHAR(60);
  v_importo     DECIMAL(10,2);
BEGIN
  IF NEW.stato <> 'pagata' OR (OLD.stato = 'pagata') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM prima_nota
    WHERE sorgente = 'rate_pagamento' AND sorgente_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(pp.descrizione, 'Pagamento rata')
  INTO v_descrizione
  FROM piani_pagamento pp
  WHERE pp.id = NEW.piano_id;

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

  v_importo := CASE
    WHEN NEW.metodo_pagamento = 'stripe' THEN ROUND(NEW.importo * 0.9925, 2)
    ELSE NEW.importo
  END;

  INSERT INTO prima_nota (
    club_id, tipo, categoria, importo, data, descrizione,
    sorgente, sorgente_id
  ) VALUES (
    NEW.club_id,
    'uscita',
    v_categoria,
    v_importo,
    COALESCE(NEW.data_pagamento, CURRENT_DATE),
    v_descrizione,
    'rate_pagamento',
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_quote_giovanili_to_prima_nota()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_importo DECIMAL(10,2);
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

  v_importo := CASE
    WHEN NEW.metodo_pagamento = 'stripe' THEN ROUND(NEW.importo_mensile * 0.9925, 2)
    ELSE NEW.importo_mensile
  END;

  INSERT INTO prima_nota (
    club_id, tipo, categoria, importo, data, descrizione,
    sorgente, sorgente_id, squadra_id
  ) VALUES (
    NEW.club_id,
    'entrata',
    'quote_iscrizione',
    v_importo,
    COALESCE(NEW.data_pagamento, CURRENT_DATE),
    'Quota mensile ' || to_char(NEW.mese_competenza, 'Month YYYY'),
    'quote_giovanili',
    NEW.id,
    NEW.squadra_id
  );

  RETURN NEW;
END;
$$;
