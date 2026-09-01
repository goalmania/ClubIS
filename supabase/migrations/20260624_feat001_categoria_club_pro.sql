-- FEAT 001 — La colonna clubs.categoria esiste già come enum categoria_club NOT NULL DEFAULT 'eccellenza'.
-- Nessuna modifica strutturale necessaria.
-- I valori pro dell'enum sono: 'serie_c', 'serie_b', 'serie_a'
-- I valori semi-pro: 'serie_d'
-- I valori dilettantistici: 'eccellenza', 'promozione', 'prima_categoria', 'seconda_categoria', 'terza_categoria', 'scuola_calcio'
SELECT 1; -- migration no-op
