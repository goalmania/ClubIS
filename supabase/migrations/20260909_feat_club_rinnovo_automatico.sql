-- ============================================================
-- FEAT — Rinnovo automatico abbonamento ClubIS con disdetta self-service
-- ============================================================
-- Aggiunge il flag che riflette lo stato "rinnovo automatico" scelto dal
-- titolare del club (presidente o segretario titolare). La subscription
-- Stripe resta la fonte di verità: questo campo è la copia locale tenuta
-- allineata dal webhook `customer.subscription.updated` e dalla route
-- `/api/abbonamento/rinnovo-automatico`.
--
--   false  → l'abbonamento si rinnova automaticamente a `current_period_end`
--   true   → il titolare ha disattivato il rinnovo: accesso garantito fino a
--            `current_period_end`, poi la subscription NON si rinnova
-- ------------------------------------------------------------

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN clubs.cancel_at_period_end IS
  'true = il titolare ha disattivato il rinnovo automatico: la subscription Stripe resta attiva fino a current_period_end e poi non si rinnova. Allineato da /api/abbonamento/rinnovo-automatico e dal webhook customer.subscription.updated.';

-- Nessuna modifica RLS: la colonna viene scritta solo da route server con
-- service-role (come ogni altro campo di piano), la policy esistente
-- clubs_update_no_plan_change non la vincola.
