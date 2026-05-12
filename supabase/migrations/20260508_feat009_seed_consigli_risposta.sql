-- FEATURE 009: Aggiunge consiglio_risposta alle domande seed già esistenti
-- e inserisce nuove domande per tutti i ruoli (presidente, allenatore, ds, giocatore)
-- con sia la nota riservata per l'ufficio stampa sia il consiglio per il destinatario.

-- ── Aggiorna le domande seed esistenti con consiglio_risposta ─────────────────

UPDATE domande_interviste SET consiglio_risposta =
  'Elenca 2-3 obiettivi concreti: uno sportivo (posizione in classifica o salvezza), uno strutturale (infrastrutture o vivaio) e uno sociale (radicamento nel territorio). Usa parole come "costruire" e "progetto" per trasmettere solidità e visione.'
WHERE testo_domanda = 'Quali sono gli obiettivi principali del club per questa stagione?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Parti da un punto di partenza concreto (es: "quando sono arrivato, il club era in una fase di transizione…"), cita i progressi fatti, poi proiettati 2-3 anni nel futuro. Evita paragoni con altre società — parla solo del vostro percorso.'
WHERE testo_domanda = 'Come valuta il percorso del club negli ultimi anni e dove vuole portarlo?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Cita aree specifiche già pianificate (campo in sintetico, spogliatoi, campo di allenamento, settore giovanile). Se non hai annunci definitivi usa "stiamo valutando soluzioni concrete" senza promettere date. Non citare cifre precise.'
WHERE testo_domanda = 'Quali investimenti ha in programma per migliorare le infrastrutture del club?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Porta 1-2 esempi concreti recenti: collaborazioni con scuole, iniziative di quartiere, presenza ai tornei giovanili locali. Sottolinea il radicamento storico del club nel tessuto cittadino. Questo tipo di risposta funziona bene anche per i media locali.'
WHERE testo_domanda = 'Come vede il rapporto tra il club e il territorio cittadino?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Esprimi piena fiducia nel lavoro di tutto il gruppo tecnico e societario, senza entrare in valutazioni su singoli. Usa frasi come "lo staff lavora con grande dedizione e professionalità" e "sono orgoglioso di chi abbiamo intorno". Evita numeri o classifiche.'
WHERE testo_domanda = 'È soddisfatto del lavoro dello staff tecnico e della rosa attuale?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Parla di "profili funzionali al nostro progetto" senza fare nomi. Comunica equilibrio tra entrate e uscite: "il club gestisce il mercato in modo responsabile". Evita di creare aspettative irrealistiche che poi potrebbero deludere i tifosi.'
WHERE testo_domanda = 'Quali sono le priorità del club nella prossima sessione di mercato?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Cita la solidità della struttura societaria e l''importanza della partnership con gli sponsor. Se sono presenti, ringraziali per nome. Non rivelare cifre di contratto. Usa "rapporto di fiducia reciproca costruito nel tempo" per descrivere le partnership.'
WHERE testo_domanda = 'Come si finanzia il club e quali sono i rapporti con gli sponsor principali?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Il vivaio è sempre un tema positivo: cita i giovani promossi in prima squadra, i risultati delle squadre giovanili, l''investimento formativo. Usa "formare prima l''uomo e poi il calciatore" come filo conduttore — funziona sempre bene con i media.'
WHERE testo_domanda = 'Qual è la sua visione sul settore giovanile e sulla valorizzazione dei talenti locali?' AND club_id IS NULL;

-- giocatore
UPDATE domande_interviste SET consiglio_risposta =
  'Parla prima del risultato della squadra, poi della tua prestazione individuale. Anche in caso di buona gara usa "sono cresciuto" invece di "sono stato bravo". Chiudi sempre con un riferimento alla prossima sfida.'
WHERE testo_domanda = 'Come ha vissuto questa partita personalmente? Sei soddisfatto della tua prestazione?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Sottolinea la coesione e la fiducia reciproca nel gruppo. Evita di fare nomi o creare gerarchie. Il messaggio centrale deve essere "il gruppo è compatto e lavoriamo tutti per lo stesso obiettivo". Non commentare eventuali tensioni interne.'
WHERE testo_domanda = 'Com''è il clima nello spogliatoio in questo momento della stagione?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Parla del lavoro in allenamento e della concentrazione mentale, non di schemi o strategie. Rispetta sempre l''avversario anche se è più debole ("ogni partita è difficile a modo suo, bisogna essere concentrati"). Evita pronostici sul risultato.'
WHERE testo_domanda = 'Come ti stai preparando per la prossima partita? Cosa ti aspetti dall''avversario?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Ringrazia compagni, staff tecnico e preparatori per il supporto. Cita lavoro e sacrificio quotidiano come base. Evita di sembrare presuntuoso — usa "sto cercando di dare il massimo ogni giorno" più che "sto benissimo e sono in grande forma".'
WHERE testo_domanda = 'Stai vivendo un buon momento di forma. A cosa lo attribuisci?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Parla di emozione genuina, del progetto sportivo e dell''ambiente che hai trovato. Cita elementi specifici come la tifoseria, la struttura o la storia del club per mostrare che ti sei documentato e che la scelta non è stata casuale.'
WHERE testo_domanda = 'Cosa ha rappresentato per te arrivare in questo club?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Scegli un momento legato a una vittoria importante per la squadra, non solo un episodio personale. Aggiungi un dettaglio emotivo autentico (cosa hai pensato, cosa hai sentito) — rende la risposta umana e adatta ai contenuti social del club.'
WHERE testo_domanda = 'C''è un gol o una partita di questa stagione che ricorderai particolarmente?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Cita 1-2 attività concrete (cene di squadra, uscite, momenti di aggregazione spontanea) per rendere la risposta reale e non generica. Evita "andiamo tutti d''accordo" — troppo vuoto. Un aneddoto specifico funziona molto meglio.'
WHERE testo_domanda = 'Come descriveresti il tuo rapporto con i compagni di squadra fuori dal campo?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Lega il tuo obiettivo personale a quello della squadra: "Voglio aiutare il gruppo a raggiungere…". Evita target numerici specifici (es: "segno 10 gol") che diventano pressione. L''obiettivo collettivo deve sempre venire prima di quello individuale.'
WHERE testo_domanda = 'Qual è il tuo obiettivo personale da qui a fine stagione?' AND club_id IS NULL;

-- allenatore
UPDATE domande_interviste SET consiglio_risposta =
  'Struttura la risposta in positivo-negativo-positivo: inizia con un punto forte, poi cita cosa migliorare in modo costruttivo ("dobbiamo lavorare su…"), chiudi con fiducia nel gruppo. Non criticare mai un giocatore per nome in conferenza stampa.'
WHERE testo_domanda = 'Come analizza la prestazione della squadra oggi? Cosa ha funzionato e cosa no?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Parla di approccio mentale e di intensità, non di schemi o tattiche specifiche. Usa "dobbiamo essere concentrati fin dal primo minuto" e "pensiamo partita per partita". Rispetta l''avversario anche se è più debole — non creare pressione inutile.'
WHERE testo_domanda = 'Qual è il piano tattico per la prossima partita? Come si preparerà la squadra?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Cita la crescita del collettivo più che dei singoli. Usa parole come "impegno", "sacrificio" e "identità di squadra". Se ci sono stati momenti difficili, usa "il gruppo ha risposto bene alle difficoltà" per mostrare compattezza e leadership.'
WHERE testo_domanda = 'Come sta rispondendo la squadra al suo metodo di lavoro? È soddisfatto del gruppo?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Sii positivo ma non eccessivo. Evita confronti con chi ha sostituito. Usa "stanno capendo la nostra idea di gioco" e "hanno bisogno di tempo come tutti, ma stanno lavorando bene". Proteggili dalla pressione — il confronto fa male all''adattamento.'
WHERE testo_domanda = 'Come valuta l''inserimento dei nuovi acquisti? Si stanno adattando come previsto?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Cita 1-2 nomi specifici per rendere la risposta concreta e credibile, ma aggiungi subito "tutto il gruppo sta crescendo" per non creare divisioni nello spogliatoio. I giocatori citati apprezzeranno la fiducia pubblica.'
WHERE testo_domanda = 'Ci sono giocatori che stanno crescendo più del previsto? Qualcuno che l''ha sorpresa positivamente?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Se la classifica è positiva rispondi con umiltà: "stiamo lavorando bene ma c''è ancora tanto da fare". Se è negativa: "i numeri non riflettono tutto il lavoro che vediamo ogni giorno — dobbiamo essere più concreti". Mai attaccare arbitri o avversari.'
WHERE testo_domanda = 'La classifica attuale riflette il valore reale della squadra?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Cita un aspetto tecnico-tattico generico (pressing alto, transizioni veloci, solidità sulle palle inattive) che mostri lavoro specifico e professionalità. Evita di fare nomi di avversari prossimi — potrebbe sembrare che stai già guardando oltre.'
WHERE testo_domanda = 'Qual è l''aspetto su cui state lavorando di più in questa fase della stagione?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Parla di dialogo diretto con i giocatori, lavoro quotidiano e fiducia nel gruppo. Cita la forza del collettivo come antidoto alla pressione individuale. Un breve esempio concreto ("in settimana abbiamo avuto una bella riunione di squadra") rende la risposta autentica.'
WHERE testo_domanda = 'Come gestisce la pressione nei momenti difficili? Cosa trasmette ai giocatori?' AND club_id IS NULL;

-- ds
UPDATE domande_interviste SET consiglio_risposta =
  'Esprimi soddisfazione per la qualità della rosa ma lascia aperta la porta a interventi mirati. Usa "monitoriamo il mercato con attenzione" senza creare attese specifiche. Evita di dire che "manca" qualcosa — potrebbe destabilizzare giocatori già presenti.'
WHERE testo_domanda = 'Come valuta la rosa attuale? Ci sono esigenze che il mercato potrebbe soddisfare?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Parla di caratteristiche del profilo ideale (giovane con esperienza nella categoria, duttile, mentalità giusta) invece di ruoli specifici. Evita di indicare reparti carenti — crea insicurezza nei giocatori presenti in quel ruolo.'
WHERE testo_domanda = 'Su quale profilo di giocatore si concentrerà il club nel prossimo mercato?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'La risposta standard è "ci sono contatti ma nulla di definito al momento". Puoi dire "seguiamo situazioni interessanti" senza confermare né smentire. Mantieni il controllo della comunicazione — mai inseguire le voci di mercato dei giornalisti.'
WHERE testo_domanda = 'Ci sono trattative in corso di cui può darci qualche aggiornamento?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Elenca brevemente gli obiettivi raggiunti: reparti rinforzati, budget rispettato, mix giovani-esperienza trovato. Ringrazia la proprietà per il supporto. Evita confronti con altri club o mercati — parla solo del vostro progetto.'
WHERE testo_domanda = 'Come descrive il lavoro svolto durante la sessione di mercato estiva/invernale?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Articola 2-3 principi chiari: identità di gioco (tipo di calcio che vuole l''allenatore), mix di esperienza e gioventù, attenzione al territorio. Questo diventa un messaggio identitario ripetibile che l''ufficio stampa può usare su tutti i canali.'
WHERE testo_domanda = 'Qual è la filosofia del club nella costruzione della rosa? Si punta su giovani o su esperienza?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Valorizza il lavoro degli osservatori senza fare nomi di giocatori monitorati. Puoi parlare di metodologia (database aggiornato, partite dal vivo, analisi video) per trasmettere professionalità e modernità nell''approccio della direzione sportiva.'
WHERE testo_domanda = 'Come viene svolto il lavoro di scouting? Il club guarda mercati esteri?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Sottolinea il dialogo quotidiano e la visione condivisa con l''allenatore. Usa "lavoriamo in totale sintonia su ogni decisione" e cita un esempio generico di collaborazione ("condividiamo ogni valutazione sulla rosa"). Mostra unità societaria — è fondamentale.'
WHERE testo_domanda = 'Qual è il rapporto tra direzione sportiva e area tecnica? Come collaborate con l''allenatore?' AND club_id IS NULL;

UPDATE domande_interviste SET consiglio_risposta =
  'Sii chiaro sulla volontà di trattenere i giocatori chiave: "il progetto è ambizioso e vogliamo costruire continuità". Per cessioni inevitabili usa "rispettiamo le aspirazioni di tutti, ma la nostra priorità è la stabilità del gruppo".'
WHERE testo_domanda = 'Come gestite le cessioni? C''è la volontà di trattenere i giocatori chiave?' AND club_id IS NULL;


-- ── Nuove domande per tutti i ruoli con consiglio_risposta già compilato ──────

INSERT INTO domande_interviste (club_id, testo_domanda, categoria, contesto, consiglio_risposta, note_suggerimento) VALUES

-- PRESIDENTE – nuove
(NULL, 'Come risponde alle critiche dei tifosi o dei media sul rendimento della squadra?',
 'presidente', 'generale',
 'Mostra empatia genuina verso la frustrazione dei tifosi ("capisco la delusione, la condivido") senza essere difensivo. Sottolinea il lavoro in corso e la direzione del progetto. Non attaccare mai i critici — trasforma la critica in motivazione.',
 'Usare in periodi di difficoltà risultati. Il presidente deve sembrare vicino ai tifosi, non arroccato.'),

(NULL, 'Quali sono i valori fondanti del club che vuole trasmettere alle nuove generazioni?',
 'presidente', 'generale',
 'Cita 3 valori concreti legati alla storia del club (es: attaccamento alla maglia, rispetto, sacrificio). Lega i valori al territorio e alla comunità. Funziona bene nelle interviste istituzionali e nei comunicati ufficiali.',
 'Ottima per inaugurazioni, eventi celebrativi o anniversari del club.'),

(NULL, 'Come si prepara a gestire una stagione con aspettative alte da parte dei tifosi?',
 'presidente', 'pre_partita',
 'Usa la pressione come energia positiva: "le aspettative ci dicono quanto la gente tiene a questo club — è uno stimolo, non un peso". Invita alla pazienza nel percorso senza sminuire le ambizioni.',
 'Fare prima dell''inizio stagione o a gennaio se si è ai vertici della classifica.'),

-- ALLENATORE – nuove
(NULL, 'Come ha visto la reazione della squadra dopo la sconfitta? Ha già parlato con il gruppo?',
 'allenatore', 'post_partita',
 'Conferma di aver già parlato con la squadra (anche se non è vero in quel momento — succederà presto). Usa "abbiamo analizzato insieme gli errori in modo costruttivo". Non scaricare la colpa sui giocatori — la responsabilità è collettiva e prima di tutto tua.',
 'Solo dopo sconfitte. Non usare mai in conferenza post-vittoria — risulterebbe fuori contesto.'),

(NULL, 'C''è qualcosa che le chiede il presidente che non riesce ancora a ottenere dalla squadra?',
 'allenatore', 'generale',
 'Risposta diplomatica: "il presidente e io siamo allineati sugli obiettivi e sul percorso". Evita qualsiasi accenno a tensioni interne. Se c''è qualcosa su cui lavorare, parlane in termini tecnici generici ("vogliamo migliorare la fase difensiva").',
 'Domanda trabocchetto — usarla solo se il rapporto presidente-allenatore è solido e visibile.'),

(NULL, 'Quanto conta la mentalità rispetto alla qualità tecnica nella sua idea di calcio?',
 'allenatore', 'generale',
 'Dai il 70% alla mentalità e il 30% alla tecnica — è la risposta che la gente vuole sentire e che costruisce identità di squadra. Cita esempi concreti di giocatori "di carattere" che hanno fatto la differenza. Funziona bene per costruire narrativa attorno alla squadra.',
 'Domanda di filosofia — ottima per profili approfonditi o interviste di inizio stagione.'),

-- DS – nuove
(NULL, 'Come definirebbe il successo di una sessione di mercato per il vostro club?',
 'ds', 'mercato',
 'Definisci il successo in termini di equilibrio: "aver migliorato la rosa rispettando il budget e la strategia". Cita la qualità dei profili trovati, non la quantità. Evita di usare cifre di trasferimento — non è mai utile in conferenza.',
 'Ottima per chiusura finestra di mercato. Permette di fare un bilancio controllato.'),

(NULL, 'Avete già definito l''obiettivo minimo di questa stagione a livello societario?',
 'ds', 'generale',
 'Usa "l''obiettivo principale è sempre la crescita continua del club" come base, poi aggiungi un obiettivo sportivo realistico ("vogliamo stare nelle prime posizioni e giocarcela fino alla fine"). Non sbilanciarti con posizioni specifiche se non sei sicuro.',
 'Usare a inizio stagione o prima dei play-off. Evitare in periodi di crisi risultati.'),

-- GIOCATORE – nuove
(NULL, 'Hai mai pensato di lasciare questo club? Come gestisci le voci di mercato?',
 'giocatore', 'mercato',
 'La risposta corretta è sempre "sono concentrato al 100% su questa maglia, tutto il resto non mi interessa". Evita commenti su trattative o contatti — anche indiretti. Se ci sono voci concrete, parla prima con il DS di cosa puoi dire.',
 'Domanda insidiosa. Usarla solo se non ci sono trattative reali in corso — altrimenti evitare.'),

(NULL, 'Come ti relazioni con i giovani della squadra? Senti di avere un ruolo da punto di riferimento?',
 'giocatore', 'generale',
 'Rispondi con umiltà: "cerco di dare una mano a chi è più giovane, come hanno fatto con me quando ero all''inizio". Questo ti posiziona come leader silenzioso e persona di spogliatoio, qualità che allenatori e società apprezzano pubblicamente.',
 'Ottima per giocatori over 25 o con esperienza. Crea narrativa di leadership positiva.'),

(NULL, 'Hai un rituale o una preparazione mentale prima di ogni partita?',
 'giocatore', 'pre_partita',
 'Condividi un dettaglio autentico e personale (musica, visualizzazione, routine riscaldamento). Rende il giocatore umano e avvicinabile. Evita risposte troppo spirituali o filosofiche — tieniti su qualcosa di concreto e raccontabile.',
 'Domanda di carattere e contenuto social. La risposta è quasi sempre utilizzabile per i canali del club.'),

(NULL, 'Cosa dici ai tifosi che sono rimasti delusi dal risultato di oggi?',
 'giocatore', 'post_partita',
 'Parla direttamente ai tifosi: "capisco la delusione, la sentiamo anche noi nello spogliatoio. Vi promettiamo che daremo tutto nella prossima partita". Mostra senso di responsabilità collettiva. Non fare promesse specifiche (vittorie, gol) — prometti impegno.',
 'Solo dopo sconfitte o pareggi deludenti. Crea empatia tra squadra e tifoseria.');
