-- ============================================================
-- Stripe Connect Express per club: onboarding + tracciamento retta.
-- Additivo e idempotente: nessuna colonna esistente toccata.
-- stripe_customer_id (già esistente) resta per l'abbonamento ClubIS del club;
-- questi campi nuovi sono per l'account Connect che riceve le rette.
-- ============================================================

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS retta_abbonamenti (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id                 UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  giocatore_id            UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  stripe_customer_id      VARCHAR(255),
  stripe_subscription_id  VARCHAR(255) UNIQUE,
  importo_centesimi       INT NOT NULL,
  stato                   VARCHAR(20) NOT NULL DEFAULT 'in_attesa' CHECK (stato IN ('in_attesa','attivo','pausa','cancellato')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retta_abbonamenti_club ON retta_abbonamenti(club_id);
CREATE INDEX IF NOT EXISTS idx_retta_abbonamenti_giocatore ON retta_abbonamenti(giocatore_id);

ALTER TABLE retta_abbonamenti ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS retta_abbonamenti_access ON retta_abbonamenti;
  CREATE POLICY retta_abbonamenti_access ON retta_abbonamenti FOR ALL USING (
    club_id = my_club_id() OR is_super_admin()
  );
END $$;

SELECT 'OK — colonne stripe_connect_* su clubs e tabella retta_abbonamenti create' AS risultato;
