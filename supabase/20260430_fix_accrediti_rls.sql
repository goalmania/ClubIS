-- Fix: disabilita RLS sulla tabella accrediti
-- Il controllo club_id è gestito lato API (pattern coerente con il resto del progetto)
ALTER TABLE accrediti DISABLE ROW LEVEL SECURITY;
