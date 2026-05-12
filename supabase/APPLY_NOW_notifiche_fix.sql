-- SQL Editor di Supabase → New query → Run

-- 1. Disabilita RLS su notifiche_sistema
--    L'accesso è controllato dall'API layer (destinatario_id = auth user)
ALTER TABLE public.notifiche_sistema DISABLE ROW LEVEL SECURITY;

-- 2. Assicura che la colonna azione_url esista
ALTER TABLE public.notifiche_sistema
  ADD COLUMN IF NOT EXISTS azione_url TEXT;

-- 3. Abilita Realtime su notifiche_sistema (per il dropdown live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifiche_sistema;

SELECT 'OK — notifiche_sistema pronta' AS risultato;
