> **BOZZA DI LAVORO — NON È CONSULENZA LEGALE.**
> Questo documento è un punto di partenza tecnico-commerciale, scritto sulla base di come funziona CIS oggi (piani, prezzi, dati trattati). Prima di farlo firmare a un cliente reale, fallo rivedere da un avvocato — in particolare la Sezione 6 (trattamento dati), perché CIS gestisce dati di minori e dati sanitari (certificati medici, infortuni), categorie che il GDPR tratta con regole più severe. Non spedire/far firmare questo documento così com'è.

---

# Condizioni di Abbonamento — CIS (Club Information System)

**Fornitore:** Paolo Di Muro
**Servizio:** CIS, piattaforma gestionale per società sportive, erogata in modalità SaaS (Software as a Service) via web all'indirizzo [dominio CIS]

## 1. Oggetto

Il presente contratto regola l'accesso e l'uso della piattaforma CIS da parte del Cliente (la società sportiva/club), fornita in abbonamento mensile. Il Fornitore concede al Cliente il diritto d'uso della piattaforma per la durata dell'abbonamento; non viene ceduto alcun diritto sul software, sul codice sorgente o sulla proprietà intellettuale (vedi `LICENSE.md`).

## 2. Piani e prezzi

| Piano | Prezzo | Cosa include (in sintesi) |
|---|---|---|
| Scuola Calcio | €30/mese | [confermare limiti: n. giocatori/gruppi] |
| Base | €50/mese | [confermare limiti] |
| Multi-club | €100/mese | Gestione multi-club |
| Multi-club Max | €179/mese | Gestione multi-club, limiti superiori |

Prova gratuita: 7 giorni, nessuna carta richiesta. Il piano scelto si attiva automaticamente al termine della prova, salvo disdetta.

*(I limiti esatti per piano — numero giocatori, numero utenti, spazio archivio — vanno confermati e inseriti qui prima dell'uso: il testo attuale del sito non li specifica in dettaglio.)*

## 3. Durata, rinnovo, recesso

- L'abbonamento si rinnova automaticamente su base mensile.
- Il Cliente può disdire in qualsiasi momento dalla propria area amministrativa; la disdetta ha effetto alla fine del periodo di fatturazione in corso — nessun rimborso per il periodo già pagato.
- Il Fornitore può sospendere l'accesso in caso di mancato pagamento, dandone preavviso di [X] giorni.

## 4. Pagamento

I pagamenti sono gestiti tramite Stripe. Il Cliente autorizza l'addebito ricorrente sul metodo di pagamento registrato. In caso di mancato addebito, l'accesso può essere sospeso fino a regolarizzazione.

## 5. Proprietà intellettuale

Il software CIS, il suo codice sorgente e la sua documentazione sono di proprietà esclusiva del Fornitore (vedi `LICENSE.md`). L'abbonamento concede solo il diritto d'uso del servizio ospitato, non alcuna licenza sul codice.

I dati inseriti dal Cliente (anagrafiche, documenti, comunicazioni) restano di proprietà del Cliente. Il Fornitore li tratta solo per erogare il servizio, secondo la Sezione 6.

## 6. Trattamento dei dati personali — ⚠️ SEZIONE DA FAR VALIDARE DA UN LEGALE/DPO

CIS tratta, per conto del Cliente, dati personali di tesserati (inclusi minori nella scuola calcio) e categorie particolari di dati (art. 9 GDPR) quali certificati medici e infortuni.

Punti che il contratto reale deve coprire (bozza concettuale, non testo finale):

- **Ruoli GDPR:** il Cliente (club) è Titolare del trattamento; il Fornitore (CIS) agisce come Responsabile del trattamento ex art. 28 GDPR. Serve un **Data Processing Agreement (DPA)** formale allegato a queste condizioni, con: finalità e durata del trattamento, tipologia di dati e interessati, obblighi del Responsabile, misure di sicurezza, gestione dei sub-responsabili (es. Supabase come hosting/database, Resend per le email), notifica di data breach, diritti del Titolare di audit.
- **Minori:** i dati dei tesserati minorenni sono raccolti tramite i genitori/tutori (famiglie). Serve una base giuridica chiara per il consenso e un flusso di raccolta conforme (in Italia l'età minima per il consenso digitale autonomo è 14 anni — sotto quella soglia serve consenso del genitore/tutore).
- **Dati sanitari (certificati medici, infortuni):** categoria particolare, richiede misure di sicurezza rafforzate e una base giuridica specifica (tipicamente necessità organizzativa/obbligo di legge sportivo, da verificare con un legale).
- **Sub-responsabili attuali da dichiarare:** Supabase (database/hosting), Stripe (pagamenti), Resend (email transazionali) — vanno elencati con paese di trattamento dati (rilevante se extra-UE).
- **Informativa privacy per le famiglie:** serve un'informativa che il club possa mostrare ai genitori al momento dell'iscrizione, coerente con quanto CIS realmente fa con i dati.

## 7. Responsabilità

Il Fornitore fornisce il servizio "così com'è" (as-is), con impegno a mantenerne la disponibilità con ragionevole diligenza, ma senza garanzia di uptime formale (nessun SLA contrattuale ad oggi). Il Fornitore non risponde per perdite indirette, mancato guadagno, o danni derivanti da uso improprio della piattaforma da parte del Cliente. *(La limitazione di responsabilità va calibrata da un legale in base a cosa è davvero opponibile in Italia per un contratto B2B di questo tipo.)*

## 8. Modifiche

Il Fornitore può aggiornare queste condizioni con preavviso di [X] giorni; l'uso continuato del servizio dopo tale termine costituisce accettazione.

## 9. Legge applicabile

Il presente contratto è regolato dalla legge italiana. Per ogni controversia è competente il Foro di [città].

---

**Checklist prima di usare questo documento con un cliente vero:**
- [ ] Far rivedere la Sezione 6 da un avvocato/DPO (dati minori + dati sanitari = priorità alta)
- [ ] Allegare un vero DPA (Data Processing Agreement) firmabile separatamente
- [ ] Confermare e scrivere i limiti esatti di ogni piano (tabella Sezione 2)
- [ ] Scrivere l'informativa privacy per le famiglie
- [ ] Decidere i giorni di preavviso (Sezioni 3, 8) e il Foro competente (Sezione 9)
- [ ] Far leggere tutto a un commercialista/legale prima della prima firma
