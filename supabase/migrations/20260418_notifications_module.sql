DO $cis$ BEGIN CREATE TYPE priorita_evento_calendario AS ENUM ('bassa','media','alta','urgente'); EXCEPTION WHEN duplicate_object THEN NULL; END $cis$;
DO $cis$ BEGIN CREATE TYPE cis_contesto_ruolo_notifiche AS ENUM ('presidente','segretario','team_manager','allenatore','medico','giocatore','famiglia'); EXCEPTION WHEN duplicate_object THEN NULL; END $cis$;
DO $cis$ BEGIN CREATE TYPE cis_canale_notifica AS ENUM ('push','email','notifica_interna'); EXCEPTION WHEN duplicate_object THEN NULL; END $cis$;
DO $cis$ BEGIN CREATE TYPE cis_frequenza_notifiche AS ENUM ('immediata','giornaliera','disattivata'); EXCEPTION WHEN duplicate_object THEN NULL; END $cis$;
DO $cis$ BEGIN CREATE TYPE cis_outbox_stato AS ENUM ('queued','sent','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $cis$;

CREATE TABLE IF NOT EXISTS cis_notification_preferences (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utente_id               UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  contesto_ruolo          cis_contesto_ruolo_notifiche NOT NULL,
  canale_push_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  canale_email_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  canale_interna_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  frequenza_interna       cis_frequenza_notifiche NOT NULL DEFAULT 'immediata',
  frequenza_email         cis_frequenza_notifiche NOT NULL DEFAULT 'immediata',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(utente_id, contesto_ruolo)
);

CREATE INDEX IF NOT EXISTS idx_cis_prefs_utente ON cis_notification_preferences(utente_id, contesto_ruolo);

CREATE TABLE IF NOT EXISTS cis_notification_outbox (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  utente_id        UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  evento_id        UUID,
  contesto_ruolo   cis_contesto_ruolo_notifiche NOT NULL,
  canale           cis_canale_notifica NOT NULL,
  priorita         priorita_evento_calendario NOT NULL,
  anticipo_min     INTEGER,
  send_at          TIMESTAMPTZ NOT NULL,
  titolo           VARCHAR(200) NOT NULL,
  messaggio        TEXT NOT NULL,
  azione_url       TEXT,
  payload          JSONB NOT NULL DEFAULT '{}'::JSONB,
  stato            cis_outbox_stato NOT NULL DEFAULT 'queued',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cis_outbox_due ON cis_notification_outbox(utente_id, stato, send_at);
CREATE INDEX IF NOT EXISTS idx_cis_outbox_evento ON cis_notification_outbox(evento_id);

CREATE TABLE IF NOT EXISTS cis_push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utente_id   UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(utente_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_cis_push_subs_utente ON cis_push_subscriptions(utente_id);

ALTER TABLE cis_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE cis_notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE cis_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cis_prefs_owner ON cis_notification_preferences;
CREATE POLICY cis_prefs_owner ON cis_notification_preferences FOR ALL USING (utente_id = auth.uid());

DROP POLICY IF EXISTS cis_outbox_select_own ON cis_notification_outbox;
CREATE POLICY cis_outbox_select_own ON cis_notification_outbox FOR SELECT USING (utente_id = auth.uid());

DROP POLICY IF EXISTS cis_outbox_insert_club ON cis_notification_outbox;
CREATE POLICY cis_outbox_insert_club ON cis_notification_outbox FOR INSERT WITH CHECK (club_id = my_club_id());

DROP POLICY IF EXISTS cis_outbox_update_club ON cis_notification_outbox;
CREATE POLICY cis_outbox_update_club ON cis_notification_outbox FOR UPDATE USING (utente_id = auth.uid());

DROP POLICY IF EXISTS cis_outbox_delete_club ON cis_notification_outbox;
CREATE POLICY cis_outbox_delete_club ON cis_notification_outbox FOR DELETE USING (utente_id = auth.uid());

DROP POLICY IF EXISTS cis_push_owner ON cis_push_subscriptions;
CREATE POLICY cis_push_owner ON cis_push_subscriptions FOR ALL USING (utente_id = auth.uid());
