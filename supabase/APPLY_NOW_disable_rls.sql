-- Disabilita RLS su tutte le tabelle che usano accesso diretto Supabase client
-- SQL Editor → New query → Run

ALTER TABLE public.materiale_sportivo  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.piani_pagamento     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_pagamento      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gruppi              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gruppi_membri       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.giocatori           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tesseramenti        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.famiglie            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.prima_nota             DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicati_figc        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.squalifiche_comunicato DISABLE ROW LEVEL SECURITY;

-- Verifica
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'materiale_sportivo', 'piani_pagamento', 'rate_pagamento',
    'gruppi', 'gruppi_membri', 'giocatori', 'tesseramenti',
    'famiglie', 'prima_nota', 'comunicati_figc', 'squalifiche_comunicato'
  );
