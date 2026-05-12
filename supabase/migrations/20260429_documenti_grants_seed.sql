-- ══════════════════════════════════════════════════════════════════════
-- FIX: GRANT + seed completo tabelle documenti
-- Le migrazioni raw non ricevono i GRANT automatici del dashboard.
-- Questo file li aggiunge e ri-esegue il seed (ON CONFLICT DO NOTHING).
-- ══════════════════════════════════════════════════════════════════════

-- ── GRANT a PostgREST (anon + authenticated + service_role) ───────────
GRANT SELECT                    ON documenti_definizioni     TO anon, authenticated;
GRANT SELECT                    ON documenti_varianti        TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE    ON documenti_stato_utente    TO authenticated;
GRANT INSERT                    ON documenti_generazioni_log TO authenticated;

GRANT ALL ON documenti_definizioni     TO service_role;
GRANT ALL ON documenti_varianti        TO service_role;
GRANT ALL ON documenti_stato_utente    TO service_role;
GRANT ALL ON documenti_generazioni_log TO service_role;

-- ══════════════════════════════════════════════════════════════════════
-- SEED documenti_definizioni
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO documenti_definizioni
  (id, label, descrizione, categoria, ha_varianti, is_verificato, attivo, ordine)
VALUES

-- ── VISITE MEDICHE ────────────────────────────────────────────────────
('vm-agonistica',
 'Richiesta VM Agonistica',
 'Decreto Balduzzi. Disponibile per: Standard, Lombardia, Piemonte, Toscana, Sicilia, Liguria, Emilia-Romagna, Bologna, Ravenna, Reggio Emilia, Ferrara, Veneto.',
 'visite_mediche', true, true, true, 10),

('vm-agonistica-sardegna',
 'VM Agonistica — Regione Sardegna (DM 1982)',
 'Modulo specifico Regione Sardegna (D.M. Sanità 18/02/1982 e Circolare 31/01/1983).',
 'visite_mediche', false, true, true, 11),

('vm-non-agonistica',
 'Richiesta VM Non Agonistica',
 'Richiesta visita medica per idoneità sportiva non agonistica (D.M. Sanità 18/02/1982).',
 'visite_mediche', false, true, true, 12),

('modulo-urine',
 'Modulo Urine Reggio Emilia',
 'Modulo per test urine specifico ASL Reggio Emilia.',
 'visite_mediche', false, false, true, 13),

-- ── RIFORMA SPORT ─────────────────────────────────────────────────────
('cococo-figc-atleti',
 'CoCoCo Atleta FIGC',
 'Contratto di collaborazione coordinata e continuativa per atleti dilettantistici FIGC (D.Lgs. 36/2021).',
 'riforma_sport', false, true, true, 20),

('cococo-figc-tecnico',
 'CoCoCo Tecnico FIGC',
 'Contratto CoCoCo per tecnici sportivi affiliati FIGC (D.Lgs. 36/2021).',
 'riforma_sport', false, true, true, 21),

('cococo-sport',
 'CoCoCo con Scelta Sport',
 'Contratto CoCoCo con disciplina sportiva personalizzabile.',
 'riforma_sport', false, false, true, 22),

('richiesta-pa',
 'Richiesta Autorizzazione PA',
 'Richiesta di autorizzazione all''Amministrazione Pubblica di appartenenza (D.Lgs. n. 36/2021).',
 'riforma_sport', false, true, true, 23),

('dichiarazione-volontario-dirigente',
 'Dichiarazione Volontario Sportivo — Dirigente',
 'Dichiarazione mensile rimborso spese per volontario sportivo con ruolo dirigenziale.',
 'riforma_sport', false, false, true, 24),

('dichiarazione-volontario-tecnico',
 'Dichiarazione Volontario Sportivo — Tecnico',
 'Dichiarazione mensile rimborso spese per volontario sportivo con ruolo tecnico.',
 'riforma_sport', false, false, true, 25),

-- ── DICHIARAZIONI FISCALI ─────────────────────────────────────────────
('dichiarazione-730',
 'Dichiarazione 730',
 'Dichiarazione ai fini della detrazione fiscale (Art. 15 TUIR). 4 varianti disponibili.',
 'dichiarazioni_fiscali', true, true, true, 30),

('attestazione-pagamento',
 'Attestazione Pagamento e Frequenza',
 'Attestazione di pagamento quota e frequenza attività sportiva per uso fiscale.',
 'dichiarazioni_fiscali', false, true, true, 31),

('bando-dote-sport-2025',
 'Bando Dote Sport 2025 (D.D.S. 3228/2025)',
 'Attestazione pagamento e frequenza per Bando Dote Sport 2025 — Regione Lombardia.',
 'dichiarazioni_fiscali', false, true, true, 32),

('bando-dote-sport-2026',
 'Bando Dote Sport 2026 (D.d.s. n. 716/2026)',
 'Attestazione pagamento e frequenza per Bando Dote Sport 2026 — Regione Lombardia.',
 'dichiarazioni_fiscali', false, true, true, 33),

('dichiarazione-compensi-anno',
 'Dichiarazione Compensi Anno Solare',
 'Dichiarazione di pagamento compensi a collaboratori per anno solare.',
 'dichiarazioni_fiscali', false, false, true, 34),

('dichiarazione-compensi-stagione',
 'Dichiarazione Compensi Stagione',
 'Dichiarazione di pagamento compensi a collaboratori per stagione sportiva.',
 'dichiarazioni_fiscali', false, false, true, 35),

('bando-lazio',
 'Bando Lazio',
 'Attestazione pagamento e frequenza per bandi regionali del Lazio.',
 'dichiarazioni_fiscali', false, false, true, 36),

('fondo-dote-famiglia-2025',
 'Fondo Dote Famiglia 2025',
 'Documentazione per il Fondo Dote Famiglia 2025.',
 'dichiarazioni_fiscali', false, false, true, 37),

-- ── ISCRIZIONI E TESSERAMENTI ─────────────────────────────────────────
('modulo-iscrizione',
 'Modulo Iscrizione Tesserati',
 'Modulo di iscrizione e tesseramento per la stagione sportiva.',
 'iscrizioni_tesseramenti', false, true, true, 40),

('nulla-osta',
 'Nulla Osta Sportivo',
 'Nulla osta per trasferimento atleta ad altra società sportiva.',
 'iscrizioni_tesseramenti', false, true, true, 41),

('scheda-atleta',
 'Scheda Atleta Anagrafica',
 'Scheda completa con dati anagrafici, sportivi e contatti del tesserato.',
 'iscrizioni_tesseramenti', false, true, true, 42),

('domanda-socio',
 'Domanda Ammissione a Socio',
 'Modulo di domanda per l''ammissione come socio del club.',
 'iscrizioni_tesseramenti', false, false, true, 43),

('convocazione-soci',
 'Convocazione Assemblea Soci',
 'Lettera di convocazione per assemblea ordinaria o straordinaria dei soci.',
 'iscrizioni_tesseramenti', false, false, true, 44),

-- ── CERTIFICAZIONI SCOLASTICHE ────────────────────────────────────────
('richiesta-iscrizione-scolastica',
 'Richiesta Iscrizione e Frequenza Scolastica',
 'Richiesta certificati iscrizione e frequenza scolastica per uso sportivo.',
 'certificazioni_scolastiche', false, true, true, 50),

('modulo-giustificazione-assenza',
 'Modulo Giustificazione Assenza',
 'Modulo per giustificare l''assenza scolastica dell''atleta per attività sportiva.',
 'certificazioni_scolastiche', false, false, true, 51),

('richiesta-certificato-contestuale',
 'Richiesta Certificato Contestuale',
 'Richiesta certificato anagrafico contestuale e plurimo di residenza per uso sportivo.',
 'certificazioni_scolastiche', false, true, true, 52),

('richiesta-storico-residenza',
 'Richiesta Storico Residenza',
 'Richiesta di storico di residenza per uso sportivo.',
 'certificazioni_scolastiche', false, false, true, 53),

('certificazione-crediti',
 'Certificazione Crediti Scolastici',
 'Certificazione dei crediti scolastici per l''atleta.',
 'certificazioni_scolastiche', false, false, true, 54),

-- ── AUTORIZZAZIONI E CONSENSI ─────────────────────────────────────────
('autorizzazione-trasporto',
 'Autorizzazione al Trasporto',
 'Autorizzazione dei genitori per il trasporto del minore durante le attività sportive.',
 'autorizzazioni_consensi', false, true, true, 60),

('autorizzazione-uscita-autonoma',
 'Autorizzazione Uscita Autonoma',
 'Autorizzazione dei genitori per l''uscita autonoma del minore dalla sede del club.',
 'autorizzazioni_consensi', false, true, true, 61),

('dichiarazione-resp-manleva',
 'Dichiarazione Responsabilità e Manleva',
 'Dichiarazione di responsabilità e manleva da parte dei genitori.',
 'autorizzazioni_consensi', false, false, true, 62),

('prestazione-volontaria-maggiorenni',
 'Prestazione Volontaria Maggiorenni',
 'Dichiarazione di prestazione volontaria per atleti maggiorenni (D.Lgs. 36/2021).',
 'autorizzazioni_consensi', false, true, true, 63),

('prestazione-volontaria-minorenni',
 'Prestazione Volontaria Minorenni',
 'Dichiarazione di prestazione volontaria per atleti minorenni (firmata dai genitori).',
 'autorizzazioni_consensi', false, true, true, 64),

('dichiarazione-casellario',
 'Dichiarazione Sostitutiva Casellario',
 'Dichiarazione sostitutiva del casellario giudiziale ai sensi del D.P.R. 445/2000.',
 'autorizzazioni_consensi', false, true, true, 65),

-- ── PRIVACY E GDPR ────────────────────────────────────────────────────
('informativa-gdpr',
 'Informativa GDPR',
 'Informativa completa sul trattamento dei dati personali (Reg. UE 2016/679).',
 'privacy_gdpr', false, true, true, 70),

('liberatoria-foto-video',
 'Liberatoria Privacy Foto e Video',
 'Liberatoria per l''utilizzo di immagini e video del tesserato su tutti i canali del club.',
 'privacy_gdpr', false, true, true, 71)

ON CONFLICT (id) DO UPDATE SET
  label        = EXCLUDED.label,
  descrizione  = EXCLUDED.descrizione,
  categoria    = EXCLUDED.categoria,
  ha_varianti  = EXCLUDED.ha_varianti,
  is_verificato = EXCLUDED.is_verificato,
  attivo       = EXCLUDED.attivo,
  ordine       = EXCLUDED.ordine;

-- ══════════════════════════════════════════════════════════════════════
-- SEED documenti_varianti
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO documenti_varianti (id, documento_id, label, descrizione, config) VALUES

-- VM Agonistica — varianti per regione
('vm-agonistica-standard',  'vm-agonistica', 'Standard (Decreto Balduzzi)', 'Modulo nazionale standard', '{"regione": null}'::jsonb),
('vm-agonistica-lombardia', 'vm-agonistica', 'Regione Lombardia',           '', '{"regione": "Lombardia"}'::jsonb),
('vm-agonistica-piemonte',  'vm-agonistica', 'Regione Piemonte',            '', '{"regione": "Piemonte"}'::jsonb),
('vm-agonistica-toscana',   'vm-agonistica', 'Regione Toscana',             '', '{"regione": "Toscana"}'::jsonb),
('vm-agonistica-sicilia',   'vm-agonistica', 'Regione Sicilia',             '', '{"regione": "Sicilia"}'::jsonb),
('vm-agonistica-liguria',   'vm-agonistica', 'Regione Liguria',             '', '{"regione": "Liguria"}'::jsonb),
('vm-agonistica-romagna',   'vm-agonistica', 'Emilia-Romagna',              '', '{"regione": "Emilia-Romagna"}'::jsonb),
('vm-agonistica-bologna',   'vm-agonistica', 'ASL Bologna',                 '', '{"regione": "Bologna"}'::jsonb),
('vm-agonistica-ravenna',   'vm-agonistica', 'ASL Ravenna',                 '', '{"regione": "Ravenna"}'::jsonb),
('vm-agonistica-re',        'vm-agonistica', 'ASL Reggio Emilia',           '', '{"regione": "Reggio Emilia"}'::jsonb),
('vm-agonistica-ferrara',   'vm-agonistica', 'ASL Ferrara',                 '', '{"regione": "Ferrara"}'::jsonb),
('vm-agonistica-veneto',    'vm-agonistica', 'Regione Veneto',              '', '{"regione": "Veneto"}'::jsonb),

-- Dichiarazione 730 — 4 varianti
('730-importo-auto',
 'dichiarazione-730',
 'Importo automatico',
 'Importo calcolato automaticamente dalle quote pagate',
 '{"modalita":"auto","genitoreVuoto":false,"splitGenitori":false}'::jsonb),

('730-importo-manuale',
 'dichiarazione-730',
 'Importo manuale',
 'Inserisci manualmente l''importo da attestare',
 '{"modalita":"manuale","genitoreVuoto":false,"splitGenitori":false}'::jsonb),

('730-intestatario-vuoto',
 'dichiarazione-730',
 'Importo auto — intestatario vuoto',
 'Importo automatico, nome/CF intestatario da compilare a mano',
 '{"modalita":"auto","genitoreVuoto":true,"splitGenitori":false}'::jsonb),

('730-split-genitori',
 'dichiarazione-730',
 'Split tra genitori',
 'Importo suddiviso tra i due genitori',
 '{"modalita":"manuale","genitoreVuoto":false,"splitGenitori":true}'::jsonb)

ON CONFLICT (id) DO UPDATE SET
  label        = EXCLUDED.label,
  descrizione  = EXCLUDED.descrizione,
  config       = EXCLUDED.config;
