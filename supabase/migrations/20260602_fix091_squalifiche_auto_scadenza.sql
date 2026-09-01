-- FIX 091 — Auto-scadenza squalifiche
--
-- 1. Aggiunge colonna stato a squalifiche ('attiva' | 'scaduta' | 'revocata')
-- 2. Trigger che decrementa giornate_rimanenti quando una partita viene
--    marcata come disputata e il giocatore era convocato (o nella squadra).
--    Quando giornate_rimanenti <= 0, marca automaticamente 'scaduta'.
-- 3. Non sovrascrive dati esistenti: solo aggiunta di stato.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Colonne stato + scaduta_at su squalifiche
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE squalifiche
  ADD COLUMN IF NOT EXISTS stato       VARCHAR(20) NOT NULL DEFAULT 'attiva'
    CHECK (stato IN ('attiva','scaduta','revocata')),
  ADD COLUMN IF NOT EXISTS scaduta_at  TIMESTAMPTZ;

-- Backfill: se data_fine è già passata, marca subito come scaduta
UPDATE squalifiche
SET    stato      = 'scaduta',
       scaduta_at = NOW()
WHERE  stato = 'attiva'
  AND  data_fine IS NOT NULL
  AND  data_fine < CURRENT_DATE;

-- Backfill: se giornate_rimanenti è 0, marca scaduta
UPDATE squalifiche
SET    stato      = 'scaduta',
       scaduta_at = NOW()
WHERE  stato = 'attiva'
  AND  giornate_rimanenti IS NOT NULL
  AND  giornate_rimanenti <= 0;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Indice su stato per query veloci
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_squalifiche_stato ON squalifiche(club_id, stato);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Trigger: decrementa squalifiche quando una partita è disputata
--
-- Logica:
--   - Si attiva AFTER UPDATE su partite quando stato cambia a
--     'disputata' o 'completata'
--   - Per ogni giocatore convocato per quella partita (o, in mancanza
--     di convocazioni, per ogni tesserato attivo della squadra)
--     cerca squalifiche attive con data_inizio <= data partita
--   - Decrementa giornate_rimanenti di 1
--   - Se giornate_rimanenti <= 0 → stato = 'scaduta'
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_decrementa_squalifiche_per_partita()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_stato_vecchio TEXT := OLD.stato;
  v_stato_nuovo   TEXT := NEW.stato;
  v_data_partita  DATE := NEW.data_ora::DATE;
  v_club_id       UUID := NEW.club_id;
  v_giocatore     UUID;
  v_sq_id         UUID;
  v_restanti      INTEGER;
BEGIN
  -- Esegui solo quando la partita passa a disputata/completata
  IF v_stato_nuovo NOT IN ('disputata','completata') THEN
    RETURN NEW;
  END IF;
  IF v_stato_vecchio = v_stato_nuovo THEN
    RETURN NEW;
  END IF;

  -- Raccoglie i giocatori da considerare:
  --   1. Convocati confermati per questa partita
  --   2. Fallback: tutti i tesserati attivi della squadra della partita
  FOR v_giocatore IN
    SELECT DISTINCT giocatore_id
    FROM convocazioni
    WHERE partita_id = NEW.id
      AND stato_risposta IN ('confermato','in_attesa')  -- includiamo anche chi non ha risposto
    UNION
    SELECT t.giocatore_id
    FROM tesseramenti t
    WHERE t.squadra_id = NEW.squadra_id
      AND t.stato = 'attivo'
      AND NOT EXISTS (
        SELECT 1 FROM convocazioni cv
        WHERE cv.partita_id = NEW.id
          AND cv.giocatore_id = t.giocatore_id
      )
  LOOP
    -- Per ogni squalifica attiva del giocatore con data_inizio <= data partita
    FOR v_sq_id, v_restanti IN
      SELECT id, COALESCE(giornate_rimanenti, partite_restanti, 1)
      FROM squalifiche
      WHERE giocatore_id = v_giocatore
        AND club_id      = v_club_id
        AND stato        = 'attiva'
        AND (data_inizio IS NULL OR data_inizio <= v_data_partita)
      ORDER BY data_inizio ASC NULLS LAST
    LOOP
      v_restanti := v_restanti - 1;

      IF v_restanti <= 0 THEN
        -- Squalifica completamente scontata
        UPDATE squalifiche
        SET    giornate_rimanenti = 0,
               partite_restanti  = 0,
               stato             = 'scaduta',
               scaduta_at        = NOW(),
               updated_at        = NOW()
        WHERE  id = v_sq_id;
      ELSE
        -- Decrementa senza scadere
        UPDATE squalifiche
        SET    giornate_rimanenti = v_restanti,
               partite_restanti  = v_restanti,
               updated_at        = NOW()
        WHERE  id = v_sq_id;
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrementa_squalifiche ON partite;
CREATE TRIGGER trg_decrementa_squalifiche
  AFTER UPDATE OF stato ON partite
  FOR EACH ROW
  EXECUTE FUNCTION fn_decrementa_squalifiche_per_partita();

-- ─────────────────────────────────────────────────────────────────────
-- 4. Funzione di scadenza per data (chiamata dall'API al caricamento)
--    Scade tutte le squalifiche attive la cui data_fine è nel passato.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_scadi_squalifiche_per_data()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE squalifiche
  SET    stato      = 'scaduta',
         scaduta_at = NOW(),
         updated_at = NOW()
  WHERE  stato     = 'attiva'
    AND  data_fine IS NOT NULL
    AND  data_fine < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_scadi_squalifiche_per_data() TO service_role;
