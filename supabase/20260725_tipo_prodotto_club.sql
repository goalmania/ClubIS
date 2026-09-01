-- ============================================================
-- Asse "tipo prodotto": club agonistico vs scuola calcio standalone
-- Additivo e idempotente: non tocca nessuna colonna/regola esistente.
-- Default 'club_agonistico' su tutte le righe esistenti -> zero impatto
-- sui club già attivi.
--
-- NB naming: esiste già un valore 'scuola_calcio' dentro l'enum
-- categoria_club (usato come tab/filtro per il settore più giovane
-- DENTRO un club agonistico esistente: vedi CategoriaTab in
-- src/app/dashboard/segretario/distinte, giocatori, figc/rosa, ecc).
-- Quel concetto è diverso da questo: qui si tratta del tipo di
-- ORGANIZZAZIONE abbonata (l'intero club_id è una scuola calcio
-- indipendente, senza prima squadra/campionato agonistico).
-- Per questo il valore qui si chiama 'scuola_calcio_standalone' e non
-- 'scuola_calcio', per evitare qualunque collisione concettuale con
-- l'enum categoria_club già esistente.
-- ============================================================

DO $$ BEGIN CREATE TYPE tipo_prodotto_club AS ENUM (
  'club_agonistico', 'scuola_calcio_standalone'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS tipo_prodotto tipo_prodotto_club NOT NULL DEFAULT 'club_agonistico';

SELECT 'OK — colonna tipo_prodotto aggiunta a clubs, default club_agonistico per tutte le righe esistenti' AS risultato;
