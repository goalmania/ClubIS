-- FIX 056: Aggiorna RLS di consigli_interviste per supportare destinatario_specifico_id.
--
-- Logica:
--   - Se destinatario_specifico_id IS NULL  → visibile a tutti i membri del ruolo destinatario
--   - Se destinatario_specifico_id IS NOT NULL → visibile SOLO a quel singolo utente

DROP POLICY IF EXISTS ci_destinatario_select ON consigli_interviste;

CREATE POLICY ci_destinatario_select ON consigli_interviste
  FOR SELECT
  USING (
    club_id = my_club_id()
    AND attivo = TRUE
    AND (
      -- Consiglio indirizzato a persona specifica: solo quella persona lo vede
      (destinatario_specifico_id IS NOT NULL AND destinatario_specifico_id = auth.uid())
      OR
      -- Consiglio generico per ruolo (nessun destinatario specifico):
      -- visibile a tutti i membri di quel ruolo
      (destinatario_specifico_id IS NULL AND (
        (my_ruolo()::text = 'ds'          AND destinatario_ruolo = 'direttore_sportivo')
        OR
        (my_ruolo()::text IN ('presidente','team_manager','allenatore','giocatore')
         AND destinatario_ruolo = my_ruolo()::text)
      ))
    )
  );
