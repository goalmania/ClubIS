-- supabase/20260430_settore_giovanile.sql
-- Modulo 6 — Settore Giovanile: multi-squadra, quote, prima nota separata

-- ── 1. Aggiungi u13 al tipo categoria_eta se mancante ────────────────────
DO $$ BEGIN
  ALTER TYPE categoria_eta ADD VALUE IF NOT EXISTS 'u13' BEFORE 'u14';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Colonne aggiuntive su squadre ──────────────────────────────────────
-- descrizione e colore badge (utile per UI)
ALTER TABLE squadre
  ADD COLUMN IF NOT EXISTS colore_badge   VARCHAR(20)  DEFAULT '#c8f000',
  ADD COLUMN IF NOT EXISTS descrizione    TEXT,
  ADD COLUMN IF NOT EXISTS max_giocatori  INT          DEFAULT 30;

-- ── 3. squadra_id su prima_nota ───────────────────────────────────────────
ALTER TABLE prima_nota
  ADD COLUMN IF NOT EXISTS squadra_id UUID REFERENCES squadre(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prima_nota_squadra ON prima_nota(squadra_id);

-- ── 4. squadra_id su comunicazioni_club ───────────────────────────────────
ALTER TABLE comunicazioni_club
  ADD COLUMN IF NOT EXISTS squadra_id UUID REFERENCES squadre(id) ON DELETE SET NULL;

-- ── 5. Tabella quote giovanili ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_giovanili (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           UUID NOT NULL REFERENCES clubs(id)    ON DELETE CASCADE,
  squadra_id        UUID NOT NULL REFERENCES squadre(id)  ON DELETE CASCADE,
  giocatore_id      UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  famiglia_id       UUID          REFERENCES utenti(id)   ON DELETE SET NULL,
  -- utente con ruolo 'famiglia' collegato al giocatore

  importo_mensile   DECIMAL(10,2) NOT NULL DEFAULT 0,
  mese_competenza   DATE          NOT NULL,
  -- es. 2025-09-01 = settembre 2025

  stato             VARCHAR(20)   NOT NULL DEFAULT 'da_pagare',
  -- da_pagare | pagata | in_ritardo | esonerata

  data_pagamento    DATE,
  metodo_pagamento  VARCHAR(30),
  -- contanti | bonifico | stripe | paypal | altro

  note              TEXT,
  ricevuta_url      TEXT,
  creato_da         UUID REFERENCES utenti(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE quote_giovanili DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_quote_giovanili_club    ON quote_giovanili(club_id);
CREATE INDEX IF NOT EXISTS idx_quote_giovanili_squadra ON quote_giovanili(squadra_id);
CREATE INDEX IF NOT EXISTS idx_quote_giovanili_gioc    ON quote_giovanili(giocatore_id);
CREATE INDEX IF NOT EXISTS idx_quote_giovanili_mese    ON quote_giovanili(mese_competenza);
CREATE INDEX IF NOT EXISTS idx_quote_giovanili_stato   ON quote_giovanili(stato);

-- ── 6. Associazione famiglia ↔ giocatore ─────────────────────────────────
-- La tabella utenti già ha squadre_ids[], ma aggiungiamo la FK
-- esplicita per il giocatore figlio (1 giocatore per utente famiglia)
ALTER TABLE utenti
  ADD COLUMN IF NOT EXISTS giocatore_figlio_id UUID REFERENCES giocatori(id) ON DELETE SET NULL;

COMMENT ON COLUMN utenti.giocatore_figlio_id IS
  'Per utenti con ruolo famiglia: FK al record giocatore del figlio';
