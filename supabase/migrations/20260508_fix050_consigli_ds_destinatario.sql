-- FIX 050: Rinomina il valore 'ds' in 'direttore_sportivo' nella colonna
-- consigli_interviste.destinatario_ruolo.
--
-- Motivazione: il campo destinatario_ruolo deve usare un valore descrittivo
-- ('direttore_sportivo') indipendente dall'enum ruolo_utente che usa 'ds'.
-- La RLS viene aggiornata per mappare utenti.ruolo='ds' → destinatario_ruolo='direttore_sportivo'.

-- ── 1. Rimuovi il vecchio CHECK constraint ────────────────────────────────────
ALTER TABLE consigli_interviste
  DROP CONSTRAINT IF EXISTS consigli_interviste_destinatario_ruolo_check;

-- ── 2. Aggiorna i record esistenti PRIMA di aggiungere il nuovo constraint ───
UPDATE consigli_interviste
  SET destinatario_ruolo = 'direttore_sportivo'
  WHERE destinatario_ruolo = 'ds';

-- ── 3. Aggiungi nuovo CHECK constraint con 'direttore_sportivo' ───────────────
ALTER TABLE consigli_interviste
  ADD CONSTRAINT consigli_interviste_destinatario_ruolo_check
  CHECK (destinatario_ruolo IN ('presidente','direttore_sportivo','team_manager','allenatore','giocatore'));

-- ── 4. Aggiorna policy RLS per i destinatari ─────────────────────────────────
-- Il DS (ruolo='ds' in utenti) deve vedere i record dove destinatario_ruolo='direttore_sportivo'
DROP POLICY IF EXISTS ci_destinatario_select ON consigli_interviste;
CREATE POLICY ci_destinatario_select ON consigli_interviste
  FOR SELECT
  USING (
    club_id = my_club_id()
    AND attivo = TRUE
    AND (
      -- Direttore Sportivo: ruolo utente è 'ds' ma destinatario_ruolo è 'direttore_sportivo'
      (my_ruolo()::text = 'ds' AND destinatario_ruolo = 'direttore_sportivo')
      OR
      -- Altri ruoli: match diretto
      (my_ruolo()::text IN ('presidente','team_manager','allenatore','giocatore')
       AND destinatario_ruolo = my_ruolo()::text)
    )
  );

-- ── 5. Ricrea l'index per il nuovo valore (opzionale, il vecchio è già valido) ─
-- L'index idx_ci_dest_ruolo su (club_id, destinatario_ruolo) non necessita
-- di essere ricreato — i valori TEXT sono già aggiornati sopra.
