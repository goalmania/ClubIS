-- Aggiunge colonne per storno movimenti prima nota

ALTER TABLE prima_nota ADD COLUMN IF NOT EXISTS stornato         BOOLEAN DEFAULT false;
ALTER TABLE prima_nota ADD COLUMN IF NOT EXISTS storno_id        UUID REFERENCES prima_nota(id);
ALTER TABLE prima_nota ADD COLUMN IF NOT EXISTS importo_stornato DECIMAL(10,2) DEFAULT 0;
