-- ============================================================
-- Scuola calcio: inviti allenatore per categoria + più allenatori per squadra
-- Additivo e idempotente: nessuna tabella/colonna esistente rimossa o alterata.
-- ============================================================

-- ── Invito allenatore legato a una categoria federale ───────────────────
-- Nullable: gli inviti per altri ruoli (segretario, medico, ecc.) non la usano.
-- VARCHAR (non l'enum categoria_eta) perché una categoria federale come
-- "Esordienti" copre più codici tecnici (u12 e u13) — vedi CATEGORIE_FEDERALI
-- in src/lib/settore-giovanile.ts.
ALTER TABLE inviti_club
  ADD COLUMN IF NOT EXISTS categoria_federale VARCHAR(30);

-- ── Più allenatori per squadra (co-allenatori/vice) ─────────────────────
-- squadre.allenatore_id resta invariato (allenatore "titolare", 1 per squadra,
-- usato dai club agonistici). Questa tabella aggiunge una relazione N:N
-- per i club scuola calcio dove più allenatori possono seguire la stessa
-- categoria contemporaneamente.
CREATE TABLE IF NOT EXISTS squadre_allenatori (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  squadra_id    UUID NOT NULL REFERENCES squadre(id) ON DELETE CASCADE,
  allenatore_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (squadra_id, allenatore_id)
);

CREATE INDEX IF NOT EXISTS idx_squadre_allenatori_squadra ON squadre_allenatori(squadra_id);
CREATE INDEX IF NOT EXISTS idx_squadre_allenatori_allenatore ON squadre_allenatori(allenatore_id);

ALTER TABLE squadre_allenatori ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS squadre_allenatori_access ON squadre_allenatori;
  CREATE POLICY squadre_allenatori_access ON squadre_allenatori FOR ALL USING (
    club_id = my_club_id() OR is_super_admin()
  );
END $$;

SELECT 'OK — inviti_club.categoria_federale, squadre_allenatori creati' AS risultato;
