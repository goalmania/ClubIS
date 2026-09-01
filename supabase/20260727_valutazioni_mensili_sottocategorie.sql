-- ============================================================
-- Scuola calcio: sottocategorie dettagliate per le valutazioni mensili
-- Additivo e idempotente: le 4 colonne SMALLINT esistenti (tecnico,
-- impegno, rispetto_regole, socializzazione) restano il voto finale
-- dell'asse (media arrotondata delle sottocategorie) — nessun codice
-- esistente che le legge va aggiornato.
-- ============================================================

ALTER TABLE valutazioni_mensili_scuola_calcio
  ADD COLUMN IF NOT EXISTS dettaglio_assi JSONB;

SELECT 'OK — valutazioni_mensili_scuola_calcio.dettaglio_assi creata' AS risultato;
