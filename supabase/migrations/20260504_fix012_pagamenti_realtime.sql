-- FIX 012 — Sincronizzazione pagamenti e entrate tra ruoli
--
-- Abilita Supabase Realtime sulle tabelle finanziarie.
-- Le RLS esistenti filtrano già per club_id: ogni ruolo vede solo
-- i dati del proprio club. Il realtime eredita le stesse policy.
--
-- APPLICARE in Supabase Dashboard → SQL Editor prima del deploy.

ALTER PUBLICATION supabase_realtime ADD TABLE rate_pagamento;
ALTER PUBLICATION supabase_realtime ADD TABLE piani_pagamento;
ALTER PUBLICATION supabase_realtime ADD TABLE prima_nota;
ALTER PUBLICATION supabase_realtime ADD TABLE quote_iscrizione;

-- Sicurezza: assicura che le righe pre-storni abbiano stornato=false
-- (evita che .eq('stornato', false) escluda righe con NULL)
UPDATE prima_nota SET stornato = false WHERE stornato IS NULL;
