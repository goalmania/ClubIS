-- FIX 093 — my_club_id() consapevole del dispositivo (multi-device race fix)
--
-- Problema: utenti.club_id è una colonna condivisa tra tutti i dispositivi
-- dello stesso utente. getUserContext() (src/lib/impersonation.ts) la
-- riallinea ad ogni richiesta al club del dispositivo che sta chiamando,
-- perché le policy RLS leggono my_club_id() -> utenti.club_id. Con due
-- dispositivi attivi in contemporanea su club diversi, una query diretta
-- client-side (RLS) su un dispositivo può transitoriamente risolvere sul
-- club dell'altro dispositivo.
--
-- Fix: my_club_id() prova prima a risolvere il club per QUESTO specifico
-- dispositivo/richiesta leggendo l'header custom `x-device-id` (esposto da
-- PostgREST via request.headers) e mappandolo su user_device_clubs,
-- validato contro user_clubs.status='accepted'. Se l'header manca o non
-- risolve a nulla (nessun uso del multi-club switcher su questo device,
-- o utente single-club), fallback identico a oggi su utenti.club_id.
--
-- Nessuna policy RLS viene modificata: continuano a chiamare my_club_id()
-- esattamente come prima. Per i club dilettantistici single-club, che non
-- hanno mai righe in user_device_clubs, il comportamento è invariato al 100%.
--
-- Sicurezza: l'header x-device-id è controllato dal client e non è segreto,
-- ma la subquery filtra sempre per udc.user_id = auth.uid() (dal JWT verificato,
-- non falsificabile) — un valore manomesso può al più far risolvere l'utente
-- su un club che già gli appartiene (user_clubs.status='accepted'), mai su
-- dati di un altro utente/club.

CREATE OR REPLACE FUNCTION my_club_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (
      SELECT udc.club_id
      FROM   user_device_clubs udc
      WHERE  udc.user_id   = auth.uid()
        AND  udc.device_id = (current_setting('request.headers', true)::json ->> 'x-device-id')
        AND  EXISTS (
               SELECT 1 FROM user_clubs uc
               WHERE uc.user_id = udc.user_id
                 AND uc.club_id = udc.club_id
                 AND uc.status  = 'accepted'
             )
      LIMIT 1
    ),
    (SELECT club_id FROM utenti WHERE id = auth.uid() LIMIT 1)
  );
$$;
