-- FIX 006 — Sincronizzazione costi team manager → prima nota
-- Eseguire nel SQL Editor di Supabase dopo aver applicato fix004

-- ──────────────────────────────────────────────────────────────────────────────
-- SEZIONE 1: TRIGGER trasferte → prima_nota
-- Ogni volta che una trasferta viene creata o aggiornata con un costo,
-- il record viene automaticamente specchiato in prima_nota come uscita.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_trasferta_to_prima_nota()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_importo     NUMERIC(12,2);
  v_old_importo NUMERIC(12,2);
  v_existing_id UUID;
  v_descr       TEXT;
BEGIN
  -- Preferisci costo effettivo; se assente usa costo stimato
  v_importo := COALESCE(NULLIF(NEW.costo_effettivo, 0), NULLIF(NEW.costo_stimato, 0));

  IF TG_OP = 'INSERT' THEN
    IF v_importo IS NOT NULL AND v_importo > 0 THEN
      v_descr := 'Trasferta: ' || NEW.destinazione ||
                 ' (' || to_char(NEW.data_partenza, 'DD/MM/YYYY') || ')';
      INSERT INTO public.prima_nota
        (club_id, tipo, categoria, importo, data, descrizione, sorgente, sorgente_id)
      VALUES
        (NEW.club_id, 'uscita', 'trasferte', v_importo,
         NEW.data_partenza, v_descr, 'trasferta', NEW.id);
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old_importo := COALESCE(NULLIF(OLD.costo_effettivo, 0), NULLIF(OLD.costo_stimato, 0));

    IF v_importo IS DISTINCT FROM v_old_importo THEN
      -- Cerca il record non stornato già presente
      SELECT id INTO v_existing_id
      FROM public.prima_nota
      WHERE sorgente = 'trasferta'
        AND sorgente_id = NEW.id
        AND stornato = false
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        -- Storna il vecchio movimento
        UPDATE public.prima_nota SET stornato = true WHERE id = v_existing_id;
        INSERT INTO public.prima_nota
          (club_id, tipo, categoria, importo, data, descrizione, sorgente, sorgente_id)
        VALUES
          (NEW.club_id, 'entrata', 'trasferte', v_old_importo, CURRENT_DATE,
           '[STORNO] Trasferta: ' || NEW.destinazione,
           'storno', v_existing_id);
      END IF;

      IF v_importo IS NOT NULL AND v_importo > 0 THEN
        v_descr := 'Trasferta: ' || NEW.destinazione ||
                   ' (' || to_char(NEW.data_partenza, 'DD/MM/YYYY') || ')';
        INSERT INTO public.prima_nota
          (club_id, tipo, categoria, importo, data, descrizione, sorgente, sorgente_id)
        VALUES
          (NEW.club_id, 'uscita', 'trasferte', v_importo,
           NEW.data_partenza, v_descr, 'trasferta', NEW.id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_trasferta_to_prima_nota ON public.trasferte;
CREATE TRIGGER trig_trasferta_to_prima_nota
  AFTER INSERT OR UPDATE OF costo_effettivo, costo_stimato ON public.trasferte
  FOR EACH ROW EXECUTE FUNCTION public.fn_trasferta_to_prima_nota();

-- ──────────────────────────────────────────────────────────────────────────────
-- SEZIONE 2: aggiungi costo_totale a materiale_sportivo
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.materiale_sportivo
  ADD COLUMN IF NOT EXISTS costo_totale NUMERIC(12,2);

-- ──────────────────────────────────────────────────────────────────────────────
-- SEZIONE 3: TRIGGER materiale_sportivo → prima_nota
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_materiale_to_prima_nota()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_importo     NUMERIC(12,2);
  v_old_importo NUMERIC(12,2);
  v_existing_id UUID;
  v_descr       TEXT;
BEGIN
  v_importo := NULLIF(NEW.costo_totale, 0);

  IF TG_OP = 'INSERT' THEN
    IF v_importo IS NOT NULL AND v_importo > 0 THEN
      v_descr := 'Materiale: ' || COALESCE(NEW.tipo, 'Richiesta') ||
                 CASE WHEN COALESCE(NEW.quantita, 1) > 1 THEN ' x' || NEW.quantita ELSE '' END;
      INSERT INTO public.prima_nota
        (club_id, tipo, categoria, importo, data, descrizione, sorgente, sorgente_id)
      VALUES
        (NEW.club_id, 'uscita', 'materiale_sportivo', v_importo,
         CURRENT_DATE, v_descr, 'materiale', NEW.id);
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old_importo := NULLIF(OLD.costo_totale, 0);

    IF v_importo IS DISTINCT FROM v_old_importo THEN
      SELECT id INTO v_existing_id
      FROM public.prima_nota
      WHERE sorgente = 'materiale'
        AND sorgente_id = NEW.id
        AND stornato = false
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        UPDATE public.prima_nota SET stornato = true WHERE id = v_existing_id;
        INSERT INTO public.prima_nota
          (club_id, tipo, categoria, importo, data, descrizione, sorgente, sorgente_id)
        VALUES
          (NEW.club_id, 'entrata', 'materiale_sportivo', v_old_importo, CURRENT_DATE,
           '[STORNO] Materiale: ' || COALESCE(NEW.tipo, 'Richiesta'),
           'storno', v_existing_id);
      END IF;

      IF v_importo IS NOT NULL AND v_importo > 0 THEN
        v_descr := 'Materiale: ' || COALESCE(NEW.tipo, 'Richiesta') ||
                   CASE WHEN COALESCE(NEW.quantita, 1) > 1 THEN ' x' || NEW.quantita ELSE '' END;
        INSERT INTO public.prima_nota
          (club_id, tipo, categoria, importo, data, descrizione, sorgente, sorgente_id)
        VALUES
          (NEW.club_id, 'uscita', 'materiale_sportivo', v_importo,
           CURRENT_DATE, v_descr, 'materiale', NEW.id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_materiale_to_prima_nota ON public.materiale_sportivo;
CREATE TRIGGER trig_materiale_to_prima_nota
  AFTER INSERT OR UPDATE OF costo_totale ON public.materiale_sportivo
  FOR EACH ROW EXECUTE FUNCTION public.fn_materiale_to_prima_nota();

-- ──────────────────────────────────────────────────────────────────────────────
-- VERIFICA
-- ──────────────────────────────────────────────────────────────────────────────

SELECT 'OK — trigger trasferta_to_prima_nota e materiale_to_prima_nota attivi' AS risultato;
