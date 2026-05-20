-- FIX 004 — prima_nota: aggiungi colonne mancanti
-- Eseguire nel SQL Editor di Supabase (sicuro da ri-eseguire, usa IF NOT EXISTS)

-- 1. Colonne per storni (da 20260425_prima_nota_storni)
ALTER TABLE prima_nota
  ADD COLUMN IF NOT EXISTS stornato          BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS storno_id         UUID         REFERENCES prima_nota(id),
  ADD COLUMN IF NOT EXISTS importo_stornato  DECIMAL(10,2) DEFAULT 0;

-- 2. Colonne tracciabilità sorgente (da 20260501_fixes_unified)
ALTER TABLE prima_nota
  ADD COLUMN IF NOT EXISTS sorgente     VARCHAR(50) DEFAULT 'manuale',
  ADD COLUMN IF NOT EXISTS sorgente_id  UUID;

-- 3. Colonne extra usate dalle API/pagine
ALTER TABLE prima_nota
  ADD COLUMN IF NOT EXISTS note         TEXT,
  ADD COLUMN IF NOT EXISTS squadra_id   UUID REFERENCES squadre(id) ON DELETE SET NULL;

-- 4. Aggiorna tutti i NULL di stornato a false (per coerenza con query .eq('stornato', false))
UPDATE prima_nota SET stornato = false WHERE stornato IS NULL;

-- 5. Indici utili
CREATE INDEX IF NOT EXISTS idx_prima_nota_sorgente   ON prima_nota(sorgente, sorgente_id);
CREATE INDEX IF NOT EXISTS idx_prima_nota_club_data  ON prima_nota(club_id, data DESC);

-- 6. Verifica: mostra le colonne della tabella
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'prima_nota'
ORDER BY ordinal_position;
