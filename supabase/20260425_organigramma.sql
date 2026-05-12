-- Organigramma staff

ALTER TABLE utenti ADD COLUMN IF NOT EXISTS bio                       TEXT;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS ordine_organigramma       INT DEFAULT 99;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS visibile_organigramma     BOOLEAN DEFAULT true;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS titolo_organigramma       VARCHAR(100);
