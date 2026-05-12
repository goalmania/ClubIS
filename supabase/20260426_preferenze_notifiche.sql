-- Feature 10: Preferenze Notifiche

CREATE TABLE IF NOT EXISTS preferenze_notifiche (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utente_id       UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  tipo_notifica   VARCHAR(100) NOT NULL,
  canale_app      BOOLEAN DEFAULT true,
  canale_email    BOOLEAN DEFAULT false,
  canale_push     BOOLEAN DEFAULT false,
  UNIQUE(utente_id, tipo_notifica)
);

ALTER TABLE preferenze_notifiche DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS preferenze_notifiche_utente ON preferenze_notifiche(utente_id);
