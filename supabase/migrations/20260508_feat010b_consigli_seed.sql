-- FEATURE 010b: Aggiunge is_template e seed data per consigli_interviste
-- is_template=true + club_id=NULL → domande di sistema visibili a tutti i club come punto di partenza

-- Rende club_id nullable per i template di sistema
ALTER TABLE consigli_interviste
  ALTER COLUMN club_id DROP NOT NULL;

-- Aggiunge colonna is_template
ALTER TABLE consigli_interviste
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE;

-- Aggiorna RLS: i template (club_id IS NULL, is_template=TRUE) sono visibili a tutti in sola lettura
DROP POLICY IF EXISTS ci_template_select ON consigli_interviste;
CREATE POLICY ci_template_select ON consigli_interviste
  FOR SELECT
  USING (is_template = TRUE AND attivo = TRUE);

-- ── SEED DATA — Domande pre-caricate per ogni ruolo ───────────────────────────

INSERT INTO consigli_interviste
  (id, club_id, creato_da, destinatario_ruolo, contesto, domanda, consiglio_risposta, priorita, attivo, is_template)
VALUES

-- PRESIDENTE — GENERALE
(gen_random_uuid(), NULL, NULL, 'presidente', 'generale',
 'Presidente, quali sono gli obiettivi della società per questa stagione?',
 'Rispondere con obiettivi concreti ma prudenti, citare la crescita del settore giovanile, la stabilità societaria e il radicamento territoriale prima dei risultati sportivi. Evitare promesse di promozione.',
 1, TRUE, TRUE),

(gen_random_uuid(), NULL, NULL, 'presidente', 'generale',
 'Quali sono i piani di investimento del club?',
 'Parlare di investimenti in strutture, settore giovanile e professionalità dello staff. Non rivelare cifre specifiche. Sottolineare la sostenibilità finanziaria come priorità.',
 2, TRUE, TRUE),

(gen_random_uuid(), NULL, NULL, 'presidente', 'generale',
 'Come valuta il lavoro dell''allenatore?',
 'Esprimere fiducia piena e pubblica nell''allenatore. Mai criticare pubblicamente. Parlare di progetto condiviso e visione comune.',
 2, TRUE, TRUE),

-- PRESIDENTE — CRISI RISULTATI
(gen_random_uuid(), NULL, NULL, 'presidente', 'crisi_risultati',
 'La squadra non vince da settimane. Pensa a un cambio di allenatore?',
 'Rispondere con calma e fermezza. Ribadire la fiducia nel lavoro dell''allenatore, spiegare che i momenti difficili fanno parte dei percorsi di crescita. Non alimentare voci.',
 1, TRUE, TRUE),

(gen_random_uuid(), NULL, NULL, 'presidente', 'crisi_risultati',
 'I tifosi sono delusi. Cosa dice loro?',
 'Riconoscere la delusione dei tifosi come legittima, ringraziarli per la passione, promettere impegno massimo senza promesse di risultati specifici.',
 1, TRUE, TRUE),

-- DIRETTORE SPORTIVO — MERCATO
(gen_random_uuid(), NULL, NULL, 'ds', 'mercato',
 'State trattando qualche giocatore in questa sessione di mercato?',
 'Rispondere con diplomazia: "Stiamo valutando profili interessanti ma non commentiamo trattative in corso". Non confermare né smentire nomi specifici.',
 1, TRUE, TRUE),

(gen_random_uuid(), NULL, NULL, 'ds', 'mercato',
 'Perché avete ceduto quel giocatore?',
 'Parlare di scelte tecniche condivise con l''allenatore e di rispetto per la carriera del giocatore. Non parlare di motivi economici o di conflitti interni.',
 1, TRUE, TRUE),

(gen_random_uuid(), NULL, NULL, 'ds', 'mercato',
 'La rosa è completa o interverrete ancora?',
 'Rispondere che si monitora sempre il mercato e si è pronti a intervenire se si presenta l''opportunità giusta, senza creare aspettative.',
 2, TRUE, TRUE),

-- DIRETTORE SPORTIVO — GENERALE
(gen_random_uuid(), NULL, NULL, 'ds', 'generale',
 'Come valuta la rosa a disposizione dell''allenatore?',
 'Esprimere soddisfazione per il lavoro fatto, citare qualità e profondità della rosa. Evitare di fare confronti con singoli giocatori in positivo o negativo.',
 2, TRUE, TRUE),

-- ALLENATORE — PRE-PARTITA
(gen_random_uuid(), NULL, NULL, 'allenatore', 'pre_partita',
 'Come arriva la squadra a questa partita?',
 'Descrivere la preparazione della settimana in modo positivo, citare la concentrazione del gruppo e il rispetto per l''avversario. Non rivelare la formazione o la tattica.',
 1, TRUE, TRUE),

(gen_random_uuid(), NULL, NULL, 'allenatore', 'pre_partita',
 'Quali sono i punti di forza dell''avversario?',
 'Dimostrare di aver studiato l''avversario citando uno o due caratteristiche generali. Non entrare in dettagli tattici che potrebbero avvantaggiarlo.',
 2, TRUE, TRUE),

(gen_random_uuid(), NULL, NULL, 'allenatore', 'pre_partita',
 'Chi giocherà titolare?',
 'Rispondere che la formazione non è ancora definitiva e che la deciderà solo a ridosso della partita. Mai anticipare la formazione.',
 1, TRUE, TRUE),

-- ALLENATORE — POST-PARTITA VITTORIA
(gen_random_uuid(), NULL, NULL, 'allenatore', 'post_partita',
 'È soddisfatto del risultato?',
 'Esprimere soddisfazione senza esaltazione eccessiva. Ringraziare i giocatori per l''impegno, riconoscere i meriti dell''avversario, mantenere i piedi per terra.',
 2, TRUE, TRUE),

(gen_random_uuid(), NULL, NULL, 'allenatore', 'post_partita',
 'Il giocatore X è stato il migliore in campo, cosa ne pensa?',
 'Elogiare il giocatore citato ma allargare i complimenti a tutta la squadra. Il calcio è uno sport collettivo e nessun singolo può vincere da solo.',
 2, TRUE, TRUE),

-- ALLENATORE — POST-PARTITA SCONFITTA
(gen_random_uuid(), NULL, NULL, 'allenatore', 'post_partita',
 'Cosa è andato storto oggi?',
 'Assumersi la responsabilità come allenatore senza scaricare errori sui giocatori. Citare aspetti tecnici generali. Guardare già alla prossima partita.',
 1, TRUE, TRUE),

(gen_random_uuid(), NULL, NULL, 'allenatore', 'post_partita',
 'È in discussione la sua posizione?',
 'Rispondere con serenità che il proprio lavoro è concentrarsi sul campo e che queste valutazioni spettano alla società. Non mostrarsi né insicuro né arrogante.',
 1, TRUE, TRUE),

-- ALLENATORE — CRISI RISULTATI
(gen_random_uuid(), NULL, NULL, 'allenatore', 'crisi_risultati',
 'Quante partite ancora prima che la situazione diventi critica?',
 'Non accettare il frame della domanda. Rispondere che ogni partita è una finale e che il gruppo è unito e lavora per invertire il trend.',
 1, TRUE, TRUE),

-- GIOCATORE — GENERALE
(gen_random_uuid(), NULL, NULL, 'giocatore', 'generale',
 'Come ti senti fisicamente in questo momento?',
 'Rispondere positivamente sulle proprie condizioni fisiche. Se si è reduci da un infortunio, sottolineare il lavoro fatto per recuperare e la voglia di dare il massimo.',
 2, TRUE, TRUE),

(gen_random_uuid(), NULL, NULL, 'giocatore', 'generale',
 'Come è il rapporto con l''allenatore?',
 'Rispondere sempre positivamente. Parlare di rispetto reciproco, di un allenatore che aiuta a crescere. Mai alimentare tensioni pubblicamente.',
 2, TRUE, TRUE),

(gen_random_uuid(), NULL, NULL, 'giocatore', 'generale',
 'Stai pensando al tuo futuro contrattuale?',
 'Rispondere che il focus è solo sul presente e sul campo. Le questioni contrattuali si gestiscono nelle sedi opportune, non davanti ai microfoni.',
 1, TRUE, TRUE),

-- GIOCATORE — POST-PARTITA
(gen_random_uuid(), NULL, NULL, 'giocatore', 'post_partita',
 'Sei soddisfatto della tua prestazione?',
 'Essere onesti ma equilibrati. Se la prestazione è stata buona: ringraziare i compagni per il supporto. Se è stata negativa: ammettere che si può fare meglio e promettere impegno.',
 2, TRUE, TRUE),

(gen_random_uuid(), NULL, NULL, 'giocatore', 'post_partita',
 'Hai segnato un gol importante, cosa provi?',
 'Esprimere gioia ma dedicare il gol alla squadra. Citare il lavoro collettivo che ha reso possibile l''azione. Non esibirsi in individualismo.',
 2, TRUE, TRUE),

-- TEAM MANAGER — GENERALE
(gen_random_uuid(), NULL, NULL, 'team_manager', 'generale',
 'Qual è il tuo ruolo all''interno del club?',
 'Descrivere il ruolo con precisione: organizzazione logistica, gestione trasferte, raccordo tra staff tecnico e società. Sottolineare il lavoro di squadra.',
 3, TRUE, TRUE),

(gen_random_uuid(), NULL, NULL, 'team_manager', 'generale',
 'Come gestite le trasferte lunghe?',
 'Descrivere l''organizzazione con professionalità, citare l''attenzione al benessere dei giocatori e la pianificazione meticolosa.',
 3, TRUE, TRUE)

ON CONFLICT DO NOTHING;
