// src/lib/valutazioni-mensili.ts
// Rubrica dettagliata delle valutazioni mensili scuola calcio: ogni asse
// macro (tecnico, impegno, rispetto_regole, socializzazione) si scompone
// in 8 sottocategorie valutate singolarmente in stelle (1-5). Il voto
// finale dell'asse — quello salvato nelle colonne SMALLINT esistenti di
// valutazioni_mensili_scuola_calcio — è la media arrotondata delle sue
// sottocategorie.

export const ASSI_VALUTAZIONE = {
  tecnico: {
    label: 'Tecnico',
    hint: 'Controllo palla, gesto tecnico per l\'età',
    sottocategorie: [
      { key: 'controllo_palla',   label: 'Controllo palla' },
      { key: 'passaggio_corto',   label: 'Passaggio corto' },
      { key: 'passaggio_lungo',   label: 'Passaggio lungo / lancio' },
      { key: 'tiro',              label: 'Tiro in porta' },
      { key: 'dribbling',         label: 'Dribbling / conduzione palla' },
      { key: 'due_piedi',         label: 'Uso dei due piedi' },
      { key: 'gioco_aereo',       label: 'Gioco aereo / colpo di testa' },
      { key: 'tecnica_difensiva', label: 'Tecnica difensiva (contrasto, marcatura)' },
    ],
  },
  impegno: {
    label: 'Impegno e costanza',
    hint: 'Presenza, attenzione in allenamento',
    sottocategorie: [
      { key: 'presenza_puntualita', label: 'Presenza e puntualità' },
      { key: 'attenzione',          label: 'Attenzione e concentrazione' },
      { key: 'costanza',            label: 'Costanza nell\'impegno' },
      { key: 'voglia_migliorare',   label: 'Voglia di migliorare' },
      { key: 'reazione_errore',     label: 'Reazione all\'errore' },
      { key: 'intensita',           label: 'Intensità in allenamento' },
      { key: 'cura_preparazione',   label: 'Cura della preparazione' },
      { key: 'autonomia',           label: 'Autonomia (esegue senza continui richiami)' },
    ],
  },
  rispetto_regole: {
    label: 'Rispetto delle regole',
    hint: 'Comportamento, disciplina',
    sottocategorie: [
      { key: 'rispetto_compagni',   label: 'Rispetto dei compagni' },
      { key: 'rispetto_allenatore', label: 'Rispetto dell\'allenatore e delle indicazioni' },
      { key: 'rispetto_avversari',  label: 'Rispetto degli avversari' },
      { key: 'rispetto_arbitro',    label: 'Rispetto dell\'arbitro / direttore di gara' },
      { key: 'fair_play',           label: 'Fair play' },
      { key: 'cura_materiale',      label: 'Cura del materiale e degli spazi' },
      { key: 'rispetto_orari',      label: 'Rispetto degli orari e degli impegni' },
      { key: 'comportamento_extra', label: 'Comportamento fuori dal campo (spogliatoio, trasferte)' },
    ],
  },
  socializzazione: {
    label: 'Socializzazione',
    hint: 'Lavoro di squadra, relazione con i compagni',
    sottocategorie: [
      { key: 'lavoro_squadra',     label: 'Lavoro di squadra' },
      { key: 'relazione_compagni', label: 'Relazione con i compagni' },
      { key: 'comunicazione',      label: 'Comunicazione in campo' },
      { key: 'inclusione',         label: 'Inclusione dei compagni più timidi' },
      { key: 'gestione_emozioni',  label: 'Gestione delle emozioni in gruppo' },
      { key: 'leadership',         label: 'Leadership / incoraggiamento verso gli altri' },
      { key: 'accettazione_ruoli', label: 'Accettazione dei ruoli assegnati' },
      { key: 'adattabilita',       label: 'Adattabilità a compagni e gruppi diversi' },
    ],
  },
} as const

export type AsseValutazione = keyof typeof ASSI_VALUTAZIONE
export type DettaglioAssi = Record<AsseValutazione, Record<string, number>>

/** Voto finale di un asse: media delle sottocategorie valutate, arrotondata a intero (1-5) */
export function mediaAsse(voti: Record<string, number>): number {
  const valori = Object.values(voti).filter(v => v > 0)
  if (valori.length === 0) return 0
  return Math.round(valori.reduce((s, v) => s + v, 0) / valori.length)
}

/** true se tutte le sottocategorie di tutti gli assi sono state valutate (>0) */
export function tutteValutate(dettaglio: DettaglioAssi): boolean {
  return (Object.keys(ASSI_VALUTAZIONE) as AsseValutazione[]).every(asse =>
    ASSI_VALUTAZIONE[asse].sottocategorie.every(sc => (dettaglio[asse]?.[sc.key] ?? 0) > 0)
  )
}

/** Inizializza la struttura dettaglio con tutte le sottocategorie a 0 */
export function dettaglioVuoto(): DettaglioAssi {
  const out = {} as DettaglioAssi
  for (const asse of Object.keys(ASSI_VALUTAZIONE) as AsseValutazione[]) {
    out[asse] = {}
    for (const sc of ASSI_VALUTAZIONE[asse].sottocategorie) out[asse][sc.key] = 0
  }
  return out
}
