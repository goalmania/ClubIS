-- Fix: "permission denied for table consigli_interviste" (16/11/2026)
-- La pagina Ufficio stampa → Consigli interviste falliva per tutti i club:
-- l'API legge la tabella con il service_role, che non aveva il GRANT.
-- fix076 (20260518) lo prevedeva ma in produzione il permesso non c'è.
-- La tabella ha RLS attiva (feat010/fix050/fix056): il GRANT non apre i dati,
-- le policy continuano a limitare ogni utente al proprio club.
-- Niente GRANT ad anon: la tabella non serve a utenti non autenticati.

GRANT ALL ON TABLE public.consigli_interviste TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.consigli_interviste TO authenticated;
