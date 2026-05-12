-- FIX 052 — Aggiunge i valori mancanti a ruolo_utente
-- ALTER TYPE ADD VALUE non può stare dentro un DO/EXCEPTION block

ALTER TYPE ruolo_utente ADD VALUE IF NOT EXISTS 'team_manager';
ALTER TYPE ruolo_utente ADD VALUE IF NOT EXISTS 'giocatore';
ALTER TYPE ruolo_utente ADD VALUE IF NOT EXISTS 'custode';
ALTER TYPE ruolo_utente ADD VALUE IF NOT EXISTS 'ufficio_stampa';
