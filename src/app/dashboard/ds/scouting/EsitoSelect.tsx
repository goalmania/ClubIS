'use client'

interface Props {
  reportId: string
  esito: string
}

export default function EsitoSelect({ reportId, esito }: Props) {
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await fetch('/api/scouting/aggiorna-esito', {
      method: 'POST',
      body: JSON.stringify({ id: reportId, esito: e.target.value }),
    })
  }

  return (
    <select
      defaultValue={esito}
      style={{ fontSize: 12, border: '1px solid var(--grigio-5)', borderRadius: 6, padding: '3px 6px', background: 'white', cursor: 'pointer' }}
      onChange={handleChange}
    >
      {['in_valutazione', 'ingaggiato', 'rifiutato', 'lista_attesa', 'archiviato'].map(v => (
        <option key={v} value={v}>{v.replace('_', ' ')}</option>
      ))}
    </select>
  )
}
