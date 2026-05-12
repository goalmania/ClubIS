-- ============================================================
-- CIS — Seed dati demo completi
-- Esegui DOPO schema.sql e setup_admin.sql
-- Club: CIS Demo Club (a0000000-0000-0000-0000-000000000001)
-- ============================================================

-- IDs fissi per riferimenti incrociati
-- Club
\set club_id  '''a0000000-0000-0000-0000-000000000001'''

-- Squadre
\set sq_prima '''b0000000-0000-0000-0000-000000000001'''
\set sq_u19   '''b0000000-0000-0000-0000-000000000002'''
\set sq_u17   '''b0000000-0000-0000-0000-000000000003'''

-- Giocatori (25)
\set g01 '''c0000000-0000-0000-0000-000000000001'''
\set g02 '''c0000000-0000-0000-0000-000000000002'''
\set g03 '''c0000000-0000-0000-0000-000000000003'''
\set g04 '''c0000000-0000-0000-0000-000000000004'''
\set g05 '''c0000000-0000-0000-0000-000000000005'''
\set g06 '''c0000000-0000-0000-0000-000000000006'''
\set g07 '''c0000000-0000-0000-0000-000000000007'''
\set g08 '''c0000000-0000-0000-0000-000000000008'''
\set g09 '''c0000000-0000-0000-0000-000000000009'''
\set g10 '''c0000000-0000-0000-0000-000000000010'''
\set g11 '''c0000000-0000-0000-0000-000000000011'''
\set g12 '''c0000000-0000-0000-0000-000000000012'''
\set g13 '''c0000000-0000-0000-0000-000000000013'''
\set g14 '''c0000000-0000-0000-0000-000000000014'''
\set g15 '''c0000000-0000-0000-0000-000000000015'''
\set g16 '''c0000000-0000-0000-0000-000000000016'''
\set g17 '''c0000000-0000-0000-0000-000000000017'''
\set g18 '''c0000000-0000-0000-0000-000000000018'''
\set g19 '''c0000000-0000-0000-0000-000000000019'''
\set g20 '''c0000000-0000-0000-0000-000000000020'''
\set g21 '''c0000000-0000-0000-0000-000000000021'''
\set g22 '''c0000000-0000-0000-0000-000000000022'''
\set g23 '''c0000000-0000-0000-0000-000000000023'''
\set g24 '''c0000000-0000-0000-0000-000000000024'''
\set g25 '''c0000000-0000-0000-0000-000000000025'''

-- Sessioni allenamento
\set sa01 '''d0000000-0000-0000-0000-000000000001'''
\set sa02 '''d0000000-0000-0000-0000-000000000002'''
\set sa03 '''d0000000-0000-0000-0000-000000000003'''
\set sa04 '''d0000000-0000-0000-0000-000000000004'''
\set sa05 '''d0000000-0000-0000-0000-000000000005'''

-- Partite
\set p01 '''e0000000-0000-0000-0000-000000000001'''
\set p02 '''e0000000-0000-0000-0000-000000000002'''
\set p03 '''e0000000-0000-0000-0000-000000000003'''
\set p04 '''e0000000-0000-0000-0000-000000000004'''
\set p05 '''e0000000-0000-0000-0000-000000000005'''

-- Quote
\set q01 '''f0000000-0000-0000-0000-000000000001'''
\set q02 '''f0000000-0000-0000-0000-000000000002'''
\set q03 '''f0000000-0000-0000-0000-000000000003'''
\set q04 '''f0000000-0000-0000-0000-000000000004'''
\set q05 '''f0000000-0000-0000-0000-000000000005'''

-- ============================================================
-- SQUADRE
-- ============================================================
INSERT INTO squadre (id, club_id, nome, categoria_eta, stagione, campo_default, attiva) VALUES
  (:sq_prima, :club_id, 'Prima Squadra', 'prima_squadra', '2024-25', 'Stadio Comunale', true),
  (:sq_u19,   :club_id, 'Under 19',      'u19',           '2024-25', 'Campo B',          true),
  (:sq_u17,   :club_id, 'Under 17',      'u17',           '2024-25', 'Campo B',          true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- GIOCATORI (25 giocatori demo)
-- ============================================================
INSERT INTO giocatori (id, nome, cognome, data_nascita, luogo_nascita, nazionalita_tipo, nazionalita_paese, codice_fiscale, ruolo_principale, ruolo_secondario, piede, altezza_cm, peso_kg, email_contatto, telefono_contatto, consenso_gdpr) VALUES
  (:g01, 'Marco',    'Rossi',      '1998-03-15', 'Roma',    'italiano', 'Italia',    'RSSMRC98C15H501X', 'portiere',               NULL,                     'destro',    188, 82, 'marco.rossi@email.it',     '3331234501', true),
  (:g02, 'Luca',     'Bianchi',    '2000-07-22', 'Milano',  'italiano', 'Italia',    'BNCLCU00L22F205Y', 'difensore_centrale',      NULL,                     'destro',    185, 78, 'luca.bianchi@email.it',    '3331234502', true),
  (:g03, 'Andrea',   'Ferrari',    '1999-11-08', 'Napoli',  'italiano', 'Italia',    'FRRNDR99S08F839Z', 'difensore_centrale',      'terzino',                'sinistro',  183, 76, 'andrea.ferrari@email.it',  '3331234503', true),
  (:g04, 'Paolo',    'Romano',     '2001-01-30', 'Torino',  'italiano', 'Italia',    'RMNPLA01A30L219A', 'terzino',                 NULL,                     'destro',    178, 72, 'paolo.romano@email.it',    '3331234504', true),
  (:g05, 'Matteo',   'Colombo',    '2000-05-14', 'Genova',  'italiano', 'Italia',    'CLMMTT00E14D969B', 'terzino',                 'centrocampista',         'sinistro',  176, 70, 'matteo.colombo@email.it',  '3331234505', true),
  (:g06, 'Davide',   'Ricci',      '1998-09-03', 'Bologna', 'italiano', 'Italia',    'RCCDVD98P03A944C', 'centrocampista_difensivo', NULL,                    'destro',    181, 75, 'davide.ricci@email.it',    '3331234506', true),
  (:g07, 'Giovanni', 'Moretti',    '2001-04-18', 'Firenze', 'italiano', 'Italia',    'MRTGVN01D18D612D', 'centrocampista',          NULL,                     'destro',    179, 73, 'giovanni.moretti@email.it','3331234507', true),
  (:g08, 'Alessandro','Conti',     '1999-08-25', 'Verona',  'italiano', 'Italia',    'CNTLSS99M25L781E', 'centrocampista',          'trequartista',           'ambidestro',177, 71, 'alessandro.conti@email.it','3331234508', true),
  (:g09, 'Francesco','Esposito',   '2000-12-10', 'Palermo', 'italiano', 'Italia',    'SPSFNC00T10G273F', 'trequartista',            'ala',                    'destro',    175, 69, 'francesco.esposito@email.it','3331234509', true),
  (:g10, 'Simone',   'Russo',      '2001-06-05', 'Bari',   'italiano', 'Italia',    'RSSSMN01H05A662G', 'ala',                     'seconda_punta',          'sinistro',  174, 68, 'simone.russo@email.it',    '3331234510', true),
  (:g11, 'Lorenzo',  'Gallo',      '1999-02-20', 'Roma',    'italiano', 'Italia',    'GLLLRN99B20H501H', 'ala',                     NULL,                     'destro',    180, 74, 'lorenzo.gallo@email.it',   '3331234511', true),
  (:g12, 'Roberto',  'Costa',      '2000-10-16', 'Cagliari','italiano', 'Italia',    'CSTRRT00R16B354I', 'centravanti',             'seconda_punta',          'destro',    184, 79, 'roberto.costa@email.it',   '3331234512', true),
  (:g13, 'Fabio',    'Giordano',   '1998-04-28', 'Lecce',   'italiano', 'Italia',    'GRDFBA98D28E506L', 'seconda_punta',           'centravanti',            'ambidestro',178, 72, 'fabio.giordano@email.it',  '3331234513', true),
  (:g14, 'Stefano',  'Mancini',    '2001-07-12', 'Perugia', 'italiano', 'Italia',    'MNCSFN01L12G478M', 'portiere',                NULL,                     'destro',    190, 84, 'stefano.mancini@email.it', '3331234514', true),
  (:g15, 'Emanuele', 'Barbieri',   '2002-03-09', 'Pescara', 'italiano', 'Italia',    'BRBRML02C09G482N', 'difensore_centrale',      'centrocampista_difensivo','destro',    186, 80, 'emanuele.barbieri@email.it','3331234515', true),
  -- U19
  (:g16, 'Tommaso',  'Marchetti',  '2005-08-14', 'Roma',    'italiano', 'Italia',    'MRCTMS05M14H501O', 'centrocampista',          NULL,                     'destro',    175, 66, 'tommaso.marchetti@email.it','3331234516', true),
  (:g17, 'Nicola',   'Santoro',    '2005-11-22', 'Napoli',  'italiano', 'Italia',    'SNTNCL05S22F839P', 'ala',                     'trequartista',           'sinistro',  172, 64, 'nicola.santoro@email.it',  '3331234517', true),
  (:g18, 'Riccardo', 'De Luca',    '2006-01-07', 'Milano',  'italiano', 'Italia',    'DLCRCC06A07F205Q', 'centravanti',             NULL,                     'destro',    180, 72, 'riccardo.deluca@email.it', '3331234518', true),
  (:g19, 'Christian','Pellegrini', '2005-06-30', 'Torino',  'italiano', 'Italia',    'PLLCRS05H30L219R', 'difensore_centrale',      NULL,                     'destro',    182, 74, 'christian.pellegrini@email.it','3331234519', true),
  (:g20, 'Antonio',  'Ferrara',    '2005-09-18', 'Bologna', 'italiano', 'Italia',    'FRRNTN05P18A944S', 'portiere',                NULL,                     'destro',    185, 76, 'antonio.ferrara@email.it', '3331234520', true),
  -- U17
  (:g21, 'Edoardo',  'Marini',     '2007-04-11', 'Roma',    'italiano', 'Italia',    'MRNDRD07D11H501T', 'centrocampista',          NULL,                     'destro',    170, 58, 'edoardo.marini@email.it',  '3331234521', true),
  (:g22, 'Gabriele', 'Fabbri',     '2007-07-25', 'Firenze', 'italiano', 'Italia',    'FBBGRL07L25D612U', 'ala',                     NULL,                     'sinistro',  168, 56, 'gabriele.fabbri@email.it', '3331234522', true),
  (:g23, 'Samuel',   'Okafor',     '2007-02-14', 'Lagos',   'extracomunitario','Nigeria', 'KFRSML07B14Z335V', 'centravanti',        NULL,                     'destro',    178, 65, 'samuel.okafor@email.it',   '3331234523', true),
  (:g24, 'Youssef',  'El Amrani',  '2007-10-03', 'Casablanca','extracomunitario','Marocco','LMRYSS07R03Z330W','terzino',             NULL,                     'sinistro',  173, 60, 'youssef.elamrani@email.it','3331234524', true),
  (:g25, 'Jakub',    'Nowak',      '2007-05-19', 'Varsavia','ue','Polonia', 'NWKJKB07E19Z127X', 'difensore_centrale', NULL,          'destro',    176, 63, 'jakub.nowak@email.it',     '3331234525', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TESSERAMENTI
-- ============================================================
INSERT INTO tesseramenti (giocatore_id, club_id, squadra_id, stagione, tipo, data_inizio, data_fine, numero_maglia, stato) VALUES
  -- Prima Squadra (15 giocatori)
  (:g01, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  1, 'attivo'),
  (:g02, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  4, 'attivo'),
  (:g03, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  5, 'attivo'),
  (:g04, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  2, 'attivo'),
  (:g05, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  3, 'attivo'),
  (:g06, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  6, 'attivo'),
  (:g07, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  8, 'attivo'),
  (:g08, :club_id, :sq_prima, '2024-25', 'prestito',   '2024-09-01', '2025-06-30', 10, 'attivo'),
  (:g09, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  7, 'attivo'),
  (:g10, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30', 11, 'attivo'),
  (:g11, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30', 17, 'attivo'),
  (:g12, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  9, 'attivo'),
  (:g13, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30', 19, 'attivo'),
  (:g14, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30', 12, 'attivo'),
  (:g15, :club_id, :sq_prima, '2024-25', 'definitivo', '2024-08-01', '2025-06-30', 15, 'attivo'),
  -- U19 (5 giocatori)
  (:g16, :club_id, :sq_u19, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  8, 'attivo'),
  (:g17, :club_id, :sq_u19, '2024-25', 'definitivo', '2024-08-01', '2025-06-30', 11, 'attivo'),
  (:g18, :club_id, :sq_u19, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  9, 'attivo'),
  (:g19, :club_id, :sq_u19, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  5, 'attivo'),
  (:g20, :club_id, :sq_u19, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  1, 'attivo'),
  -- U17 (5 giocatori)
  (:g21, :club_id, :sq_u17, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  8, 'attivo'),
  (:g22, :club_id, :sq_u17, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  7, 'attivo'),
  (:g23, :club_id, :sq_u17, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  9, 'attivo'),
  (:g24, :club_id, :sq_u17, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  3, 'attivo'),
  (:g25, :club_id, :sq_u17, '2024-25', 'definitivo', '2024-08-01', '2025-06-30',  4, 'attivo')
ON CONFLICT DO NOTHING;

-- ============================================================
-- CERTIFICATI MEDICI
-- ============================================================
INSERT INTO certificati_medici (giocatore_id, club_id, tipo, data_rilascio, data_scadenza, medico, struttura) VALUES
  (:g01, :club_id, 'agonistico', '2024-07-15', '2025-07-15', 'Dr. Verdi',    'ASL Roma 1'),
  (:g02, :club_id, 'agonistico', '2024-07-20', '2025-07-20', 'Dr. Verdi',    'ASL Roma 1'),
  (:g03, :club_id, 'agonistico', '2024-08-01', '2025-08-01', 'Dr. Neri',     'Ospedale San Carlo'),
  (:g04, :club_id, 'agonistico', '2024-07-10', '2025-07-10', 'Dr. Verdi',    'ASL Roma 1'),
  (:g05, :club_id, 'agonistico', '2024-06-28', '2025-06-28', 'Dr. Verdi',    'ASL Roma 1'),
  (:g06, :club_id, 'agonistico', '2024-07-05', '2025-07-05', 'Dr. Neri',     'Ospedale San Carlo'),
  (:g07, :club_id, 'agonistico', '2024-08-10', '2025-08-10', 'Dr. Verdi',    'ASL Roma 1'),
  (:g08, :club_id, 'agonistico', '2024-09-01', '2025-09-01', 'Dr. Bianchi',  'Villa Stuart'),
  (:g09, :club_id, 'agonistico', '2024-07-25', '2025-07-25', 'Dr. Verdi',    'ASL Roma 1'),
  (:g10, :club_id, 'agonistico', '2024-08-05', '2025-08-05', 'Dr. Neri',     'Ospedale San Carlo'),
  (:g11, :club_id, 'agonistico', '2024-07-18', '2025-07-18', 'Dr. Verdi',    'ASL Roma 1'),
  (:g12, :club_id, 'agonistico', '2024-07-22', '2025-07-22', 'Dr. Verdi',    'ASL Roma 1'),
  -- Scaduto (per test alert)
  (:g13, :club_id, 'agonistico', '2024-01-15', '2025-01-15', 'Dr. Neri',     'Ospedale San Carlo'),
  -- In scadenza (prossimi 30 giorni)
  (:g14, :club_id, 'agonistico', '2024-04-20', '2025-04-20', 'Dr. Verdi',    'ASL Roma 1'),
  (:g15, :club_id, 'agonistico', '2024-04-28', '2025-04-28', 'Dr. Verdi',    'ASL Roma 1'),
  -- U19/U17
  (:g16, :club_id, 'agonistico', '2024-08-01', '2025-08-01', 'Dr. Verdi',    'ASL Roma 1'),
  (:g17, :club_id, 'agonistico', '2024-08-01', '2025-08-01', 'Dr. Verdi',    'ASL Roma 1'),
  (:g18, :club_id, 'agonistico', '2024-08-01', '2025-08-01', 'Dr. Neri',     'Ospedale San Carlo'),
  (:g21, :club_id, 'agonistico', '2024-08-01', '2025-08-01', 'Dr. Verdi',    'ASL Roma 1'),
  (:g22, :club_id, 'agonistico', '2024-08-01', '2025-08-01', 'Dr. Verdi',    'ASL Roma 1'),
  (:g23, :club_id, 'non_agonistico','2024-09-15','2025-09-15','Dr. Bianchi', 'Villa Stuart')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SESSIONI ALLENAMENTO (5 sessioni recenti)
-- ============================================================
INSERT INTO sessioni_allenamento (id, squadra_id, data_ora, durata_minuti, campo, tipologia, obiettivo, stato) VALUES
  (:sa01, :sq_prima, '2025-04-07 17:00', 90, 'Campo A', 'tecnico',     'Possesso palla',          'effettuato'),
  (:sa02, :sq_prima, '2025-04-09 17:00', 90, 'Campo A', 'tattico',     'Fase difensiva',          'effettuato'),
  (:sa03, :sq_prima, '2025-04-11 17:00', 80, 'Campo A', 'fisico',      'Resistenza aerobica',     'effettuato'),
  (:sa04, :sq_prima, '2025-04-14 17:00', 90, 'Campo A', 'partitella',  'Preparazione partita',    'programmato'),
  (:sa05, :sq_u19,   '2025-04-14 15:00', 90, 'Campo B', 'tecnico',     'Tecnica individuale',     'programmato')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PRESENZE (per le 3 sessioni effettuate)
-- ============================================================
INSERT INTO presenze (sessione_id, giocatore_id, presente, motivo_assenza) VALUES
  -- SA01
  (:sa01, :g01, true,  NULL), (:sa01, :g02, true,  NULL), (:sa01, :g03, true,  NULL),
  (:sa01, :g04, true,  NULL), (:sa01, :g05, false, 'infortunio'), (:sa01, :g06, true,  NULL),
  (:sa01, :g07, true,  NULL), (:sa01, :g08, true,  NULL), (:sa01, :g09, true,  NULL),
  (:sa01, :g10, true,  NULL), (:sa01, :g11, false, 'malattia'), (:sa01, :g12, true,  NULL),
  -- SA02
  (:sa02, :g01, true,  NULL), (:sa02, :g02, true,  NULL), (:sa02, :g03, true,  NULL),
  (:sa02, :g04, true,  NULL), (:sa02, :g05, false, 'infortunio'), (:sa02, :g06, true,  NULL),
  (:sa02, :g07, true,  NULL), (:sa02, :g08, true,  NULL), (:sa02, :g09, false, 'personale'),
  (:sa02, :g10, true,  NULL), (:sa02, :g11, true,  NULL), (:sa02, :g12, true,  NULL),
  -- SA03
  (:sa03, :g01, true,  NULL), (:sa03, :g02, true,  NULL), (:sa03, :g03, false, 'squalifica'),
  (:sa03, :g04, true,  NULL), (:sa03, :g05, false, 'infortunio'), (:sa03, :g06, true,  NULL),
  (:sa03, :g07, true,  NULL), (:sa03, :g08, true,  NULL), (:sa03, :g09, true,  NULL),
  (:sa03, :g10, true,  NULL), (:sa03, :g11, true,  NULL), (:sa03, :g12, true,  NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PARTITE (5 partite: 3 giocate, 2 programmate)
-- ============================================================
INSERT INTO partite (id, squadra_id, avversario, data_ora, campo, tipo, competizione, giornata, casa_trasferta, gol_fatti, gol_subiti, stato) VALUES
  (:p01, :sq_prima, 'AC Virtus',      '2025-03-23 15:00', 'Stadio Comunale',     'campionato', 'Eccellenza Lazio', 25, 'casa',      3, 1, 'giocata'),
  (:p02, :sq_prima, 'SS Lazio B',     '2025-03-30 15:00', 'Centro Sportivo Lazio','campionato', 'Eccellenza Lazio', 26, 'trasferta', 1, 1, 'giocata'),
  (:p03, :sq_prima, 'FC Tivoli',      '2025-04-06 15:00', 'Stadio Comunale',     'campionato', 'Eccellenza Lazio', 27, 'casa',      2, 0, 'giocata'),
  (:p04, :sq_prima, 'ASD Monterotondo','2025-04-20 15:00','Campo Monterotondo',  'campionato', 'Eccellenza Lazio', 28, 'trasferta', NULL, NULL, 'programmata'),
  (:p05, :sq_prima, 'Urbetevere',     '2025-04-27 15:00', 'Stadio Comunale',     'campionato', 'Eccellenza Lazio', 29, 'casa',      NULL, NULL, 'programmata')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STATISTICHE PARTITA
-- ============================================================
INSERT INTO statistiche_partita (partita_id, giocatore_id, minuti_giocati, gol, assist, ammonizioni, voto_allenatore) VALUES
  -- P01 (3-1 vittoria)
  (:p01, :g01, 90, 0, 0, 0, 7.0), (:p01, :g02, 90, 0, 0, 1, 6.5),
  (:p01, :g03, 90, 0, 1, 0, 7.0), (:p01, :g04, 90, 0, 0, 0, 6.0),
  (:p01, :g06, 90, 0, 0, 0, 6.5), (:p01, :g07, 85, 1, 0, 0, 7.5),
  (:p01, :g08, 90, 0, 1, 0, 7.0), (:p01, :g09, 75, 1, 0, 0, 7.5),
  (:p01, :g10, 80, 0, 1, 0, 6.5), (:p01, :g12, 90, 1, 0, 0, 8.0),
  (:p01, :g13, 15, 0, 0, 0, 6.0),
  -- P02 (1-1 pareggio)
  (:p02, :g01, 90, 0, 0, 0, 6.5), (:p02, :g02, 90, 0, 0, 0, 6.0),
  (:p02, :g03, 90, 0, 0, 1, 6.0), (:p02, :g04, 90, 0, 0, 0, 5.5),
  (:p02, :g06, 90, 0, 0, 0, 6.0), (:p02, :g07, 90, 0, 0, 0, 6.0),
  (:p02, :g08, 90, 0, 1, 0, 6.5), (:p02, :g09, 70, 0, 0, 0, 5.5),
  (:p02, :g10, 90, 1, 0, 0, 7.0), (:p02, :g12, 90, 0, 0, 0, 5.5),
  -- P03 (2-0 vittoria)
  (:p03, :g01, 90, 0, 0, 0, 7.5), (:p03, :g02, 90, 0, 0, 0, 7.0),
  (:p03, :g03, 90, 1, 0, 0, 7.5), (:p03, :g04, 90, 0, 0, 0, 6.5),
  (:p03, :g06, 90, 0, 0, 0, 7.0), (:p03, :g07, 90, 0, 1, 0, 7.0),
  (:p03, :g08, 80, 0, 0, 0, 6.5), (:p03, :g09, 90, 1, 0, 0, 8.0),
  (:p03, :g10, 70, 0, 1, 0, 6.5), (:p03, :g12, 90, 0, 0, 0, 6.5)
ON CONFLICT DO NOTHING;

-- ============================================================
-- CONVOCAZIONI (per partita programmata P04)
-- ============================================================
INSERT INTO convocazioni (partita_id, giocatore_id, stato_risposta, titolare) VALUES
  (:p04, :g01, 'confermato', true),  (:p04, :g02, 'confermato', true),
  (:p04, :g03, 'confermato', true),  (:p04, :g04, 'confermato', true),
  (:p04, :g06, 'confermato', true),  (:p04, :g07, 'confermato', true),
  (:p04, :g08, 'confermato', true),  (:p04, :g09, 'confermato', true),
  (:p04, :g10, 'confermato', true),  (:p04, :g12, 'confermato', true),
  (:p04, :g13, 'confermato', false), (:p04, :g14, 'confermato', false),
  (:p04, :g15, 'in_attesa',  NULL),
  (:p04, :g05, 'indisponibile', false),
  (:p04, :g11, 'confermato', false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- VALUTAZIONI TECNICHE
-- ============================================================
-- Nota: allenatore_id verrà inserito solo dopo che l'utente allenatore esiste
-- Per ora usiamo un placeholder che verrà aggiornato

-- ============================================================
-- QUOTE ISCRIZIONE
-- ============================================================
INSERT INTO quote_iscrizione (id, giocatore_id, club_id, stagione, importo_totale, importo_pagato, stato, scadenza) VALUES
  (:q01, :g01, :club_id, '2024-25', 1200, 1200, 'pagato',     '2025-03-31'),
  (:q02, :g02, :club_id, '2024-25', 1200, 800,  'parziale',   '2025-03-31'),
  (:q03, :g03, :club_id, '2024-25', 1200, 0,    'non_pagato', '2025-03-31'),
  (:q04, :g16, :club_id, '2024-25', 900,  900,  'pagato',     '2025-03-31'),
  (:q05, :g21, :club_id, '2024-25', 800,  400,  'parziale',   '2025-03-31')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PAGAMENTI
-- ============================================================
INSERT INTO pagamenti (quota_id, importo, metodo, data_pagamento) VALUES
  (:q01, 600, 'bonifico',  '2024-09-01'),
  (:q01, 600, 'bonifico',  '2025-01-15'),
  (:q02, 400, 'contanti',  '2024-09-10'),
  (:q02, 400, 'bonifico',  '2024-12-20'),
  (:q04, 900, 'stripe',    '2024-08-20'),
  (:q05, 400, 'contanti',  '2024-10-01')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PRIMA NOTA
-- ============================================================
INSERT INTO prima_nota (club_id, tipo, categoria, importo, data, descrizione, controparte) VALUES
  (:club_id, 'entrata', 'quote_iscrizione',    4800,  '2025-01-15', 'Quote iscrizione gennaio',  NULL),
  (:club_id, 'entrata', 'sponsorizzazioni',    5000,  '2025-01-20', 'Sponsor maglia - Bar Roma', 'Bar Roma SRL'),
  (:club_id, 'entrata', 'proventi_gare',       1200,  '2025-02-10', 'Incasso partita vs Virtus', NULL),
  (:club_id, 'uscita',  'affitto_strutture',   2500,  '2025-01-05', 'Affitto campo gennaio',     'Comune di Roma'),
  (:club_id, 'uscita',  'materiale_sportivo',  1800,  '2025-01-10', 'Kit divise Prima Squadra',  'Nike Italia'),
  (:club_id, 'uscita',  'compensi_staff',      3200,  '2025-02-01', 'Compensi staff febbraio',   NULL),
  (:club_id, 'uscita',  'trasferte',           450,   '2025-02-15', 'Pullman trasferta Lazio B', 'Autolinee Roma'),
  (:club_id, 'entrata', 'sponsorizzazioni',    3000,  '2025-03-01', 'Sponsor tecnico trimestrale','Decathlon'),
  (:club_id, 'uscita',  'federazione',         800,   '2025-03-05', 'Tassa iscrizione FIGC',     'FIGC Lazio'),
  (:club_id, 'uscita',  'utenze',              350,   '2025-03-10', 'Bolletta luce spogliatoi',  'Enel'),
  (:club_id, 'entrata', 'quote_iscrizione',    2400,  '2025-03-15', 'Quote iscrizione marzo',    NULL),
  (:club_id, 'uscita',  'affitto_strutture',   2500,  '2025-03-05', 'Affitto campo marzo',       'Comune di Roma')
ON CONFLICT DO NOTHING;

-- ============================================================
-- REPORT SCOUTING (demo)
-- ============================================================
-- Verranno inseriti quando l'utente osservatore sarà creato

-- ============================================================
-- MESSAGGI
-- ============================================================
INSERT INTO messaggi (club_id, mittente_id, titolo, corpo, tipo, destinatari, inviato_at)
SELECT
  :club_id,
  u.id,
  'Benvenuti nella stagione 2024-25',
  'Cari tutti, la nuova stagione è iniziata. Vi auguro un grande campionato. Forza CIS Demo Club!',
  'comunicazione',
  '["tutti"]'::jsonb,
  '2024-08-15 10:00'
FROM utenti u WHERE u.club_id = :club_id AND u.ruolo = 'presidente' LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================
-- NOTIFICHE SISTEMA
-- ============================================================
INSERT INTO notifiche_sistema (club_id, destinatario_id, tipo, titolo, messaggio, letta, azione_url)
SELECT
  :club_id,
  u.id,
  'scadenza_certificato',
  'Certificato in scadenza',
  'Il certificato medico di Fabio Giordano scade il 15/01/2025',
  false,
  '/dashboard/segretario/certificati'
FROM utenti u WHERE u.club_id = :club_id AND u.ruolo = 'presidente' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO notifiche_sistema (club_id, destinatario_id, tipo, titolo, messaggio, letta, azione_url)
SELECT
  :club_id,
  u.id,
  'quota_arretrata',
  'Quota non pagata',
  'Andrea Ferrari non ha ancora pagato la quota iscrizione 2024-25 (1.200 EUR)',
  false,
  '/dashboard/segretario/quote'
FROM utenti u WHERE u.club_id = :club_id AND u.ruolo = 'presidente' LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================
-- NOTA: Utenti aggiuntivi demo
-- Per creare gli 8 account demo con diversi ruoli, eseguire
-- le seguenti INSERT nella tabella auth.users di Supabase
-- (richiede service_role o SQL Editor) e poi collegare in utenti.
--
-- Account demo previsti:
-- 1. presidente@demo.cis  / demo1234  → presidente (già setup_admin)
-- 2. ds@demo.cis          / demo1234  → ds
-- 3. segretario@demo.cis  / demo1234  → segretario
-- 4. allenatore@demo.cis  / demo1234  → allenatore
-- 5. osservatore@demo.cis / demo1234  → osservatore
-- 6. medico@demo.cis      / demo1234  → medico
-- 7. famiglia@demo.cis    / demo1234  → famiglia
-- 8. manager@demo.cis     / demo1234  → team_manager
--
-- Questi vanno creati tramite supabase.auth.admin.createUser()
-- o dall'interfaccia Supabase → Authentication → Users
-- Poi inseriti in utenti con:
--
-- INSERT INTO utenti (id, club_id, nome, cognome, email, ruolo, attivo) VALUES
--   (<auth_user_id>, :club_id, 'Mario',   'Verdi',     'ds@demo.cis',         'ds',           true),
--   (<auth_user_id>, :club_id, 'Anna',    'Bianchi',   'segretario@demo.cis', 'segretario',   true),
--   (<auth_user_id>, :club_id, 'Roberto', 'Neri',      'allenatore@demo.cis', 'allenatore',   true),
--   (<auth_user_id>, :club_id, 'Franco',  'Galli',     'osservatore@demo.cis','osservatore',  true),
--   (<auth_user_id>, :club_id, 'Elena',   'Martini',   'medico@demo.cis',     'medico',       true),
--   (<auth_user_id>, :club_id, 'Giuseppe','Rossi',     'famiglia@demo.cis',   'famiglia',     true),
--   (<auth_user_id>, :club_id, 'Sergio',  'Mazzini',   'manager@demo.cis',    'team_manager', true);
-- ============================================================

-- ============================================================
-- SPONSOR TABLES (nuove)
-- ============================================================
CREATE TABLE IF NOT EXISTS sponsors (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nome              VARCHAR(200) NOT NULL,
  tipo              VARCHAR(50) NOT NULL DEFAULT 'silver',
  settore           VARCHAR(100),
  referente_nome    VARCHAR(150),
  referente_email   VARCHAR(255),
  referente_telefono VARCHAR(20),
  logo_url          TEXT,
  importo_annuo     NUMERIC(10,2),
  data_inizio       DATE NOT NULL,
  data_fine         DATE,
  note              TEXT,
  attivo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsors_club ON sponsors(club_id);

CREATE TABLE IF NOT EXISTS sponsor_pagamenti (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id      UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  importo         NUMERIC(10,2) NOT NULL,
  data_pagamento  DATE NOT NULL DEFAULT CURRENT_DATE,
  metodo          metodo_pagamento NOT NULL DEFAULT 'bonifico',
  fattura_numero  VARCHAR(50),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disabilita RLS sulle nuove tabelle (dev)
ALTER TABLE sponsors DISABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_pagamenti DISABLE ROW LEVEL SECURITY;

-- Sponsor demo
INSERT INTO sponsors (club_id, nome, tipo, settore, referente_nome, referente_email, importo_annuo, data_inizio, data_fine, attivo) VALUES
  (:club_id, 'Bar Roma SRL',       'gold',     'Ristorazione',     'Marco Totti',   'info@barroma.it',        10000, '2024-07-01', '2025-06-30', true),
  (:club_id, 'Decathlon Italia',    'silver',   'Sport & Retail',   'Laura Pirlo',   'sponsor@decathlon.it',    6000, '2024-07-01', '2025-06-30', true),
  (:club_id, 'Farmacia Centrale',   'bronze',   'Farmacia',         'Dr. Gattuso',   'info@farmaciacentrale.it',3000, '2024-09-01', '2025-06-30', true),
  (:club_id, 'Autofficina Rossi',   'bronze',   'Automotive',       'Piero Rossi',   'info@autorossi.it',       2500, '2024-07-01', '2025-06-30', true),
  (:club_id, 'Studio Legale Conti', 'silver',   'Servizi Legali',   'Avv. Conti',    'info@studioconti.it',     5000, '2024-07-01', '2025-06-30', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- FINE SEED
-- ============================================================
