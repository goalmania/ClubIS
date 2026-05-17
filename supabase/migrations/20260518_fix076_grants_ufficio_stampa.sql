-- Fix: aggiungi GRANT per eventi_media e brief_locandine
-- Queste tabelle erano create senza GRANTs espliciti, causando "permission denied"
-- anche con il service_role key.

GRANT ALL ON TABLE eventi_media TO anon, authenticated, service_role;
GRANT ALL ON TABLE brief_locandine TO anon, authenticated, service_role;

-- Per sicurezza, verifichiamo anche accrediti (stessa sezione del schema)
GRANT ALL ON TABLE accrediti TO anon, authenticated, service_role;

-- consigli_interviste (ufficio stampa)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consigli_interviste') THEN
    GRANT ALL ON TABLE consigli_interviste TO anon, authenticated, service_role;
  END IF;
END $$;
