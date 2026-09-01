-- FEAT 005 — Liste professionistiche (Lista A / Lista B) per club Serie C+

CREATE TABLE IF NOT EXISTS liste_professionistiche (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  stagione          TEXT NOT NULL,
  tipo_lista        TEXT NOT NULL,       -- 'lista_a' | 'lista_b'
  tesserato_id      UUID,
  nome_tesserato    TEXT NOT NULL,
  cognome_tesserato TEXT NOT NULL,
  data_nascita      DATE,
  posizione_lista   INTEGER,
  stato             TEXT NOT NULL DEFAULT 'attivo',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liste_pro_club    ON liste_professionistiche(club_id);
CREATE INDEX IF NOT EXISTS idx_liste_pro_stagione ON liste_professionistiche(club_id, stagione, tipo_lista);

ALTER TABLE liste_professionistiche ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS liste_pro_club ON liste_professionistiche;
CREATE POLICY liste_pro_club ON liste_professionistiche
  FOR ALL USING (club_id = my_club_id() OR is_super_admin());
