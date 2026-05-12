-- Codice invito per collegare utenti OAuth a un club
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS codice_invito VARCHAR(20) UNIQUE;
UPDATE clubs SET codice_invito = 'CIS-' || UPPER(SUBSTR(MD5(id::text), 1, 6))
WHERE codice_invito IS NULL;
