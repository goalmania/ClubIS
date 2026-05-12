-- APPLY_NOW_fix_azione_url.sql
-- Corregge gli azione_url errati già salvati in notifiche_sistema.
-- Le notifiche create prima del fix in materiale/route.ts puntavano a
-- percorsi inesistenti → 404 al click. Questo script li aggiorna.
--
-- ⚠️  Esegui una sola volta nel SQL Editor di Supabase.

-- 1. Richieste materiale notificate al segretario con path sbagliato
UPDATE public.notifiche_sistema
SET    azione_url = '/dashboard/team-manager/materiale'
WHERE  azione_url = '/dashboard/segretario/materiale';

-- 2. Se qualche notifica di comunicazione è stata mandata al TM
--    con il percorso invertito (sicurezza)
UPDATE public.notifiche_sistema
SET    azione_url = '/dashboard/segretario/comunicazioni'
WHERE  azione_url = '/dashboard/team-manager/comunicazioni';

-- 3. Report: quante righe rimangono con URL non-dashboard (anomalie)
SELECT azione_url, COUNT(*) AS tot
FROM   public.notifiche_sistema
WHERE  azione_url IS NOT NULL
  AND  azione_url NOT LIKE '/dashboard/%'
GROUP  BY azione_url
ORDER  BY tot DESC;
