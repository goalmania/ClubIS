-- Scheda atleta completa

ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS piede_preferito         VARCHAR(15);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS modalita_rateizzazione  VARCHAR(30);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS codice_identificativo   VARCHAR(50);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS nome_maglia             VARCHAR(50);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS necessita_kit           BOOLEAN DEFAULT false;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS numero_scarpa           INT;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS taglia_maglia           VARCHAR(10);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS taglia_pantaloni        VARCHAR(10);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS agonista                BOOLEAN DEFAULT false;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS ruolo_preferito         VARCHAR(50);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS condizione              VARCHAR(30) DEFAULT 'disponibile';
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS ha_procuratore          BOOLEAN DEFAULT false;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS nome_procuratore        VARCHAR(150);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS specialita              TEXT;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS data_decorrenza         DATE;

-- Visita medica
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS visita_tipologia        VARCHAR(50);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS visita_carico           VARCHAR(50);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS prossima_visita_data    DATE;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS prossima_visita_luogo   VARCHAR(100);

-- Profilo sanitario
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS tessera_sanitaria       VARCHAR(50);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS intolleranze            TEXT;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS note_mediche            TEXT;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS ha_green_pass           BOOLEAN DEFAULT false;

-- Attestati
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS certificato_blsd             BOOLEAN DEFAULT false;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS certificato_primo_soccorso   BOOLEAN DEFAULT false;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS certificato_antincendio      BOOLEAN DEFAULT false;

-- Indirizzo
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS via       TEXT;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS citta     VARCHAR(100);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS cap       VARCHAR(10);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS provincia VARCHAR(5);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS regione   VARCHAR(50);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS nazione   VARCHAR(50) DEFAULT 'ITA';

-- Documento identità
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS doc_tipo                      VARCHAR(30);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS doc_numero                    VARCHAR(50);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS doc_scadenza                  DATE;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS doc_rilascio                  DATE;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS permesso_soggiorno_scadenza   DATE;

-- Altri dati
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS altra_previdenza         BOOLEAN DEFAULT false;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS societa_provenienza      VARCHAR(150);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS scuola_frequentata       VARCHAR(150);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS titolo_studio            VARCHAR(50);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS indirizzo_scolastico     VARCHAR(200);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS usa_pulmino              BOOLEAN DEFAULT false;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS ha_fratelli_tesserati    BOOLEAN DEFAULT false;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS preferenze_alimentari    TEXT;
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS assicurazione            VARCHAR(100);
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS data_prima_approvazione  DATE;

-- Materiale in comodato
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS materiale_comodato JSONB DEFAULT '[]';
