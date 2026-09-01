-- Quote mensili per le scuole calcio: aggiunge la colonna "mese" a
-- quote_iscrizione così un giocatore può avere una quota per ogni mese
-- della stagione (tipico delle scuole calcio, che fatturano mensilmente,
-- a differenza dei club agonistici che hanno una quota unica di stagione).
--
-- mese = 0  → quota di stagione "classica" (comportamento invariato per i
--             club agonistici, che continuano a non usare questo campo)
-- mese = 1-12 → quota del mese specifico (uso esclusivo scuole calcio)
--
-- Additivo e retrocompatibile: le righe esistenti restano con mese=0 e il
-- vincolo di unicità (giocatore_id, club_id, stagione) continua a valere
-- esattamente come prima per loro, dato che ogni giocatore agonistico ha
-- un'unica riga con mese=0.

ALTER TABLE quote_iscrizione
  ADD COLUMN IF NOT EXISTS mese SMALLINT NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quote_iscrizione_mese_check'
  ) THEN
    ALTER TABLE quote_iscrizione ADD CONSTRAINT quote_iscrizione_mese_check CHECK (mese BETWEEN 0 AND 12);
  END IF;
END $$;

-- Sostituisce il vecchio vincolo UNIQUE(giocatore_id, club_id, stagione) con uno
-- che include anche il mese, così una scuola calcio può avere fino a 12 quote
-- per giocatore per stagione (una per mese) invece di una sola.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.table_name = 'quote_iscrizione'
    AND tc.constraint_type = 'UNIQUE'
  GROUP BY tc.constraint_name
  HAVING array_agg(ccu.column_name::text ORDER BY ccu.column_name) = ARRAY['club_id','giocatore_id','stagione']
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE quote_iscrizione DROP CONSTRAINT %I', cname);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quote_iscrizione_giocatore_club_stagione_mese_key'
  ) THEN
    ALTER TABLE quote_iscrizione
      ADD CONSTRAINT quote_iscrizione_giocatore_club_stagione_mese_key
      UNIQUE (giocatore_id, club_id, stagione, mese);
  END IF;
END $$;

SELECT 'OK — colonna mese aggiunta a quote_iscrizione, vincolo di unicità aggiornato' AS risultato;
