-- Collega i movimenti di prima nota al giocatore a cui si riferiscono
-- (in particolare gli stipendi/ingaggi registrati dalla scheda giocatore),
-- per poter mostrare lo storico pagamenti direttamente lì.
ALTER TABLE prima_nota ADD COLUMN IF NOT EXISTS giocatore_id UUID REFERENCES giocatori(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prima_nota_giocatore ON prima_nota(giocatore_id);
