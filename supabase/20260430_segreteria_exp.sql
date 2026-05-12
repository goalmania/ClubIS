-- supabase/20260430_segreteria_exp.sql

-- Scadenziario FIGC
CREATE TABLE IF NOT EXISTS scadenze_figc (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  titolo            VARCHAR(300) NOT NULL,
  data_scadenza     DATE NOT NULL,
  tipo              VARCHAR(30) NOT NULL DEFAULT 'altro',
  -- iscrizione | tassa_federale | tesseramento | visita_medica | altro
  importo_previsto  DECIMAL(10,2),
  stato             VARCHAR(20) NOT NULL DEFAULT 'da_fare',
  -- da_fare | in_corso | completata | scaduta
  note              TEXT,
  link_riferimento  VARCHAR(500),
  alert_giorni_prima INT DEFAULT 30,
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE scadenze_figc DISABLE ROW LEVEL SECURITY;

-- Comunicazioni massive
CREATE TABLE IF NOT EXISTS comunicazioni_club (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id               UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  oggetto               VARCHAR(300) NOT NULL,
  testo                 TEXT NOT NULL,
  destinatari_gruppo    VARCHAR(50) NOT NULL DEFAULT 'tutti_tesserati',
  -- tutti_tesserati | prima_squadra | staff_tecnico |
  -- settore_giovanile | famiglie | personalizzato
  destinatari_custom    UUID[] DEFAULT '{}',
  canale                VARCHAR(20) NOT NULL DEFAULT 'in_app',
  -- in_app | email | entrambi
  inviata_da            UUID NOT NULL REFERENCES utenti(id),
  data_invio            TIMESTAMPTZ DEFAULT now(),
  letta_da              UUID[] DEFAULT '{}'
);
ALTER TABLE comunicazioni_club DISABLE ROW LEVEL SECURITY;

-- Pratiche tesseramento esteso
ALTER TABLE tesseramenti
  ADD COLUMN IF NOT EXISTS tipo_pratica VARCHAR(30) DEFAULT 'nuovo',
  -- nuovo | rinnovo | cessione | svincolo | prestito
  ADD COLUMN IF NOT EXISTS stato_pratica VARCHAR(30) DEFAULT 'completata',
  -- da_avviare | in_corso | bloccata | completata
  ADD COLUMN IF NOT EXISTS motivo_blocco TEXT,
  ADD COLUMN IF NOT EXISTS documenti_mancanti TEXT[],
  ADD COLUMN IF NOT EXISTS note_figc TEXT;
