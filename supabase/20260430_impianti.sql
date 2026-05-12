-- supabase/20260430_impianti.sql

CREATE TABLE IF NOT EXISTS checklist_template (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome            VARCHAR(200) NOT NULL,
  frequenza       VARCHAR(30) NOT NULL DEFAULT 'giornaliera',
  area            VARCHAR(50) NOT NULL,
  voci            JSONB NOT NULL DEFAULT '[]',
  attivo          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE checklist_template DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS checklist_eseguita (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  template_id     UUID NOT NULL REFERENCES checklist_template(id) ON DELETE CASCADE,
  eseguita_da     UUID NOT NULL REFERENCES utenti(id),
  data_esecuzione TIMESTAMPTZ NOT NULL DEFAULT now(),
  partita_id      UUID REFERENCES partite(id),
  voci_completate JSONB NOT NULL DEFAULT '[]',
  completata_al   INT NOT NULL DEFAULT 0,
  flag_incompleta BOOLEAN DEFAULT false,
  note_generali   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE checklist_eseguita DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ticket_impianto (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id              UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  area                 VARCHAR(50) NOT NULL,
  descrizione_problema TEXT NOT NULL,
  foto_urls            TEXT[] DEFAULT '{}',
  urgenza              VARCHAR(20) NOT NULL DEFAULT 'media',
  stato                VARCHAR(20) NOT NULL DEFAULT 'aperto',
  segnalato_da         UUID NOT NULL REFERENCES utenti(id),
  assegnato_a          UUID REFERENCES utenti(id),
  data_apertura        TIMESTAMPTZ DEFAULT now(),
  data_risoluzione     TIMESTAMPTZ,
  note_risoluzione     TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ticket_impianto DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS manutenzioni (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id            UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  area               VARCHAR(50) NOT NULL,
  tipo_intervento    VARCHAR(200) NOT NULL,
  fornitore          VARCHAR(200),
  costo_preventivo   DECIMAL(10,2),
  costo_consuntivo   DECIMAL(10,2),
  data_intervento    DATE NOT NULL,
  data_prossima_scad DATE,
  note               TEXT,
  allegati_urls      TEXT[] DEFAULT '{}',
  inserita_da        UUID NOT NULL REFERENCES utenti(id),
  created_at         TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE manutenzioni DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ritiri (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id            UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome               VARCHAR(200) NOT NULL,
  data_inizio        DATE NOT NULL,
  data_fine          DATE NOT NULL,
  luogo              VARCHAR(200),
  struttura_alloggio VARCHAR(200),
  costo_struttura    DECIMAL(10,2),
  convocati          UUID[] DEFAULT '{}',
  note               TEXT,
  creato_da          UUID NOT NULL REFERENCES utenti(id),
  created_at         TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ritiri DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_checklist_eseguita_club ON checklist_eseguita(club_id);
CREATE INDEX IF NOT EXISTS idx_checklist_eseguita_data ON checklist_eseguita(data_esecuzione DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_impianto_club    ON ticket_impianto(club_id);
CREATE INDEX IF NOT EXISTS idx_ticket_impianto_stato   ON ticket_impianto(stato);
CREATE INDEX IF NOT EXISTS idx_manutenzioni_scadenza   ON manutenzioni(data_prossima_scad);
