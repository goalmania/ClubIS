// ── Tipi ─────────────────────────────────────────────────────────────────────

export type TipoAccredito =
  | 'media'
  | 'fotografo'
  | 'ospite_vip'
  | 'sponsor'
  | 'dirigente_esterno'
  | 'collaboratore'
  | 'istituzione'
  | 'altro'

export type StatoAccredito = 'in_attesa' | 'approvato' | 'rifiutato'

export interface Accredito {
  id: string
  club_id: string
  partita_id?: string | null
  nome: string
  cognome: string
  tipo: TipoAccredito
  organizzazione?: string | null
  email?: string | null
  telefono?: string | null
  note?: string | null
  stato: StatoAccredito
  motivo_rifiuto?: string | null
  numero_badge?: string | null
  settore?: string | null
  creato_da?: string | null
  approvato_da?: string | null
  created_at: string
  updated_at: string
  // join opzionale
  partite?: { avversario: string; data_ora: string; casa_trasferta: string } | null
}

// ── Costanti ──────────────────────────────────────────────────────────────────

export const TIPO_ACCREDITO_LABEL: Record<TipoAccredito, string> = {
  media:              'Media / Stampa',
  fotografo:          'Fotografo',
  ospite_vip:         'Ospite VIP',
  sponsor:            'Sponsor',
  dirigente_esterno:  'Dirigente esterno',
  collaboratore:      'Collaboratore',
  istituzione:        'Istituzione',
  altro:              'Altro',
}

export const STATO_ACCREDITO_INFO: Record<StatoAccredito, { label: string; colore: string; bg: string }> = {
  in_attesa: { label: 'In attesa',  colore: 'var(--ambra)',  bg: 'var(--ambra-lt)'  },
  approvato: { label: 'Approvato',  colore: 'var(--verde)',  bg: 'var(--verde-lt)'  },
  rifiutato: { label: 'Rifiutato',  colore: 'var(--rosso)',  bg: 'var(--rosso-lt)'  },
}

export const SETTORI_STADIO = [
  'Tribuna stampa',
  'Campo / bordo campo',
  'Hospitality',
  'Tribuna d\'onore',
  'Spogliatoi',
  'Zona mista',
  'Generico',
]

// ── Generatore stampa HTML ────────────────────────────────────────────────────

export function generaStampaAccrediti(
  accrediti: Accredito[],
  titolo = 'Lista Accrediti',
): string {
  const rows = accrediti.map((a, i) => {
    const stato = STATO_ACCREDITO_INFO[a.stato]
    const tipo  = TIPO_ACCREDITO_LABEL[a.tipo] ?? a.tipo
    return `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}">
        <td style="padding:8px 10px;border-bottom:1px solid #e5e5e5;font-weight:600">${a.cognome} ${a.nome}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e5e5">${tipo}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e5e5;color:#555">${a.organizzazione ?? '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e5e5;color:#555">${a.settore ?? '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e5e5">
          <span style="
            display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;
            color:${stato.colore === 'var(--verde)' ? '#166534' : stato.colore === 'var(--rosso)' ? '#991b1b' : '#92400e'};
            background:${stato.colore === 'var(--verde)' ? '#dcfce7' : stato.colore === 'var(--rosso)' ? '#fee2e2' : '#fef9c3'};
          ">
            ${stato.label}
          </span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e5e5;font-family:monospace;font-size:12px">${a.numero_badge ?? '—'}</td>
      </tr>`
  }).join('')

  const totale    = accrediti.length
  const approvati = accrediti.filter(a => a.stato === 'approvato').length
  const attesa    = accrediti.filter(a => a.stato === 'in_attesa').length

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>${titolo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 28px; }
    h1 { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.01em; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
    .kpi { display: flex; gap: 20px; margin-bottom: 20px; }
    .kpi-item { border: 1px solid #e5e5e5; border-radius: 4px; padding: 10px 16px; min-width: 100px; }
    .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 4px; }
    .kpi-value { font-size: 22px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #111; color: #fff; }
    thead th { padding: 9px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
    @media print { @page { margin: 18mm; } }
  </style>
</head>
<body>
  <h1>${titolo}</h1>
  <div class="meta">Stampato il ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
  <div class="kpi">
    <div class="kpi-item">
      <div class="kpi-label">Totale</div>
      <div class="kpi-value">${totale}</div>
    </div>
    <div class="kpi-item">
      <div class="kpi-label">Approvati</div>
      <div class="kpi-value" style="color:#166534">${approvati}</div>
    </div>
    <div class="kpi-item">
      <div class="kpi-label">In attesa</div>
      <div class="kpi-value" style="color:#92400e">${attesa}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Nominativo</th>
        <th>Tipo</th>
        <th>Organizzazione</th>
        <th>Settore</th>
        <th>Stato</th>
        <th>Badge</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`
}
