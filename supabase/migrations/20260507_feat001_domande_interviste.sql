-- FEATURE 001 + 002: Banca domande per interviste (addetto stampa)
-- Tabella, RLS, e seed data di default (club_id = NULL = globali di sistema)

-- ── 1. Tabella ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS domande_interviste (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           UUID REFERENCES clubs(id) ON DELETE CASCADE,
  testo_domanda     TEXT NOT NULL,
  categoria         TEXT NOT NULL CHECK (categoria IN ('presidente','giocatore','allenatore','ds')),
  contesto          TEXT NOT NULL CHECK (contesto IN ('pre_partita','post_partita','conferenza_stampa','mercato','generale')),
  note_suggerimento TEXT,
  creato_da         UUID REFERENCES utenti(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indice per ricerca rapida per club + categoria
CREATE INDEX IF NOT EXISTS idx_domande_interviste_club_cat
  ON domande_interviste (club_id, categoria);

-- ── 2. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE domande_interviste ENABLE ROW LEVEL SECURITY;

-- SELECT: domande globali (club_id IS NULL) oppure del proprio club
--         accessibile a ufficio_stampa, presidente, ds, allenatore del club
DROP POLICY IF EXISTS domande_interviste_select ON domande_interviste;
CREATE POLICY domande_interviste_select ON domande_interviste
  FOR SELECT
  USING (
    club_id IS NULL
    OR club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  );

-- INSERT: solo ufficio_stampa del proprio club
DROP POLICY IF EXISTS domande_interviste_insert ON domande_interviste;
CREATE POLICY domande_interviste_insert ON domande_interviste
  FOR INSERT
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM utenti
      WHERE id = auth.uid()
        AND ruolo = 'ufficio_stampa'
    )
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  );

-- UPDATE: solo ufficio_stampa sulle proprie domande (non su quelle globali)
DROP POLICY IF EXISTS domande_interviste_update ON domande_interviste;
CREATE POLICY domande_interviste_update ON domande_interviste
  FOR UPDATE
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM utenti
      WHERE id = auth.uid()
        AND ruolo = 'ufficio_stampa'
    )
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  )
  WITH CHECK (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  );

-- DELETE: solo ufficio_stampa sulle proprie domande (non su quelle globali)
DROP POLICY IF EXISTS domande_interviste_delete ON domande_interviste;
CREATE POLICY domande_interviste_delete ON domande_interviste
  FOR DELETE
  USING (
    club_id = (SELECT club_id FROM utenti WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM utenti
      WHERE id = auth.uid()
        AND ruolo = 'ufficio_stampa'
    )
    OR EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ── 3. Seed data — domande globali di sistema (club_id = NULL) ────────────────
-- FEATURE 002: pre-caricate per categoria, realistiche per il calcio italiano

INSERT INTO domande_interviste (club_id, testo_domanda, categoria, contesto, note_suggerimento) VALUES

-- ── PRESIDENTE ────────────────────────────────────────────────────────────────
(NULL, 'Quali sono gli obiettivi principali del club per questa stagione?', 'presidente', 'generale',
 'Lasciare spazio per risposta articolata. Se risponde solo con "vincere il campionato" chiedere di specificare obiettivi strutturali.'),

(NULL, 'Come valuta il percorso del club negli ultimi anni e dove vuole portarlo?', 'presidente', 'generale',
 'Domanda di visione a lungo termine. Utile per aprire interviste istituzionali o fine stagione.'),

(NULL, 'Quali investimenti ha in programma per migliorare le infrastrutture del club?', 'presidente', 'generale',
 'Campo, centro sportivo, settore giovanile. Evitare di usare la parola "soldi" — preferire "risorse" o "investimenti".'),

(NULL, 'Come vede il rapporto tra il club e il territorio cittadino?', 'presidente', 'generale',
 'Domanda sul radicamento sociale. Ottima per interviste con enti locali o sponsor territoriali presenti.'),

(NULL, 'È soddisfatto del lavoro dello staff tecnico e della rosa attuale?', 'presidente', 'post_partita',
 'Porre dopo vittorie importanti o in periodi positivi. Evitare dopo sconfitte pesanti — potrebbe creare tensioni con allenatore.'),

(NULL, 'Quali sono le priorità del club nella prossima sessione di mercato?', 'presidente', 'mercato',
 'Non aspettarsi nomi specifici. Utile per capire la filosofia: si punta su giovani, usati, esperti?'),

(NULL, 'Come si finanzia il club e quali sono i rapporti con gli sponsor principali?', 'presidente', 'generale',
 'Domanda delicata. Verificare prima con la dirigenza se ci sono argomenti da evitare.'),

(NULL, 'Qual è la sua visione sul settore giovanile e sulla valorizzazione dei talenti locali?', 'presidente', 'generale',
 'Ottima domanda per segnalare l''attenzione al territorio. I presidenti amano parlare del vivaio.'),

-- ── GIOCATORE ──────────────────────────────────────────────────────────────────
(NULL, 'Come ha vissuto questa partita personalmente? Sei soddisfatto della tua prestazione?', 'giocatore', 'post_partita',
 'Iniziare sempre dalla partita appena conclusa. Lasciare che si esprima liberamente prima di entrare sui dettagli.'),

(NULL, 'Com''è il clima nello spogliatoio in questo momento della stagione?', 'giocatore', 'generale',
 'Domanda sull''atmosfera di gruppo. Utile per capire la coesione. Evitare di insistere se la risposta è vaga.'),

(NULL, 'Come ti stai preparando per la prossima partita? Cosa ti aspetti dall''avversario?', 'giocatore', 'pre_partita',
 'Chiedere solo aspetti tattici generali — non strategie riservate. Utile per creare anticipazione nei tifosi.'),

(NULL, 'Stai vivendo un buon momento di forma. A cosa lo attribuisci?', 'giocatore', 'generale',
 'Da usare solo se il giocatore è realmente in forma. Controllare le ultime prestazioni prima dell''intervista.'),

(NULL, 'Cosa ha rappresentato per te arrivare in questo club?', 'giocatore', 'generale',
 'Perfetta per nuovi acquisti nei primi mesi. Crea contenuto emozionale per i social e i comunicati.'),

(NULL, 'C''è un gol o una partita di questa stagione che ricorderai particolarmente?', 'giocatore', 'post_partita',
 'Domanda leggera e narrativa. Ottima per i contenuti social — la risposta è quasi sempre utilizzabile.'),

(NULL, 'Come descriveresti il tuo rapporto con i compagni di squadra fuori dal campo?', 'giocatore', 'generale',
 'Umanizza il giocatore. Buona per contenuti di club storytelling.'),

(NULL, 'Qual è il tuo obiettivo personale da qui a fine stagione?', 'giocatore', 'generale',
 'Aspettarsi risposte sulla squadra piuttosto che personali — è la norma nel calcio. Non insistere su numeri specifici.'),

-- ── ALLENATORE ────────────────────────────────────────────────────────────────
(NULL, 'Come analizza la prestazione della squadra oggi? Cosa ha funzionato e cosa no?', 'allenatore', 'post_partita',
 'Prima domanda standard post-partita. Dare tempo — gli allenatori hanno bisogno di qualche secondo per raccogliere le idee.'),

(NULL, 'Qual è il piano tattico per la prossima partita? Come si preparerà la squadra?', 'allenatore', 'pre_partita',
 'Non aspettarsi rivelazioni tattiche. Utile per creare aspettativa. Focalizzarsi su approccio mentale e obiettivi.'),

(NULL, 'Come sta rispondendo la squadra al suo metodo di lavoro? È soddisfatto del gruppo?', 'allenatore', 'generale',
 'Domanda aperta sulla gestione del gruppo. Ottima per interviste di metà stagione.'),

(NULL, 'Come valuta l''inserimento dei nuovi acquisti? Si stanno adattando come previsto?', 'allenatore', 'mercato',
 'Utile dopo una sessione di mercato. Permette di valorizzare i nuovi arrivati senza creare gerarchie esplicite.'),

(NULL, 'Ci sono giocatori che stanno crescendo più del previsto? Qualcuno che l''ha sorpresa positivamente?', 'allenatore', 'generale',
 'Valorizza lo spogliatoio. Risposta quasi sempre utilizzabile nei contenuti del club.'),

(NULL, 'La classifica attuale riflette il valore reale della squadra?', 'allenatore', 'generale',
 'Domanda delicata — usarla solo se la classifica è positiva o neutrale. In caso di crisi, evitare.'),

(NULL, 'Qual è l''aspetto su cui state lavorando di più in questa fase della stagione?', 'allenatore', 'generale',
 'Risposta tecnica ma accessibile. Ottima per far capire ai tifosi il lavoro dietro le quinte.'),

(NULL, 'Come gestisce la pressione nei momenti difficili? Cosa trasmette ai giocatori?', 'allenatore', 'generale',
 'Domanda di leadership. Da usare in momenti di difficoltà o dopo un filotto negativo — con tatto.'),

-- ── DIRETTORE SPORTIVO ────────────────────────────────────────────────────────
(NULL, 'Come valuta la rosa attuale? Ci sono esigenze che il mercato potrebbe soddisfare?', 'ds', 'mercato',
 'Domanda di apertura standard per interviste di mercato. Il DS risponderà in modo diplomatico — seguire con domande più specifiche.'),

(NULL, 'Su quale profilo di giocatore si concentrerà il club nel prossimo mercato?', 'ds', 'mercato',
 'Evitare di nominare giocatori specifici se non li ha già citati lui. Utile per anticipare la finestra di mercato.'),

(NULL, 'Ci sono trattative in corso di cui può darci qualche aggiornamento?', 'ds', 'mercato',
 'Il DS non dirà quasi mai nulla di concreto. Utile comunque per creare contenuto e mostrare attenzione al mercato.'),

(NULL, 'Come descrive il lavoro svolto durante la sessione di mercato estiva/invernale?', 'ds', 'mercato',
 'Domanda di bilancio. Ottima per l''ultima settimana di mercato o subito dopo la chiusura.'),

(NULL, 'Qual è la filosofia del club nella costruzione della rosa? Si punta su giovani o su esperienza?', 'ds', 'generale',
 'Domanda strategica. Risposta utile per comunicare l''identità del club verso tifosi e media.'),

(NULL, 'Come viene svolto il lavoro di scouting? Il club guarda mercati esteri?', 'ds', 'generale',
 'Ottima per valorizzare il lavoro degli osservatori. Evitare di chiedere nomi specifici di giocatori monitorati.'),

(NULL, 'Qual è il rapporto tra direzione sportiva e area tecnica? Come collaborate con l''allenatore?', 'ds', 'generale',
 'Domanda istituzionale. Permette di mostrare coesione societaria. Da usare in periodi stabili.'),

(NULL, 'Come gestite le cessioni? C''è la volontà di trattenere i giocatori chiave?', 'ds', 'mercato',
 'Utile quando circolano voci su cessioni. Permette al DS di rassicurare i tifosi o di essere onesto sulla situazione.');
