'use client'
import { useState } from 'react'

const ZONE_LABELS: Record<string, string> = {
  testa: 'Testa',
  collo: 'Collo',
  spalla_sx: 'Spalla sin.',
  spalla_dx: 'Spalla des.',
  petto: 'Petto',
  addome: 'Addome',
  anca_sx: 'Anca sin.',
  anca_dx: 'Anca des.',
  coscia_sx: 'Coscia sin.',
  coscia_dx: 'Coscia des.',
  ginocchio_sx: 'Ginocchio sin.',
  ginocchio_dx: 'Ginocchio des.',
  polpaccio_sx: 'Polpaccio sin.',
  polpaccio_dx: 'Polpaccio des.',
  caviglia_sx: 'Caviglia sin.',
  caviglia_dx: 'Caviglia des.',
}

type ZonaProps = {
  id: string
  selected: boolean
  hovered: boolean
  readonly: boolean
  onHover: (id: string | null) => void
  onClick: (id: string) => void
  children: React.ReactNode
}

function Zona({ id, selected, hovered, readonly, onHover, onClick, children }: ZonaProps) {
  const fill = selected
    ? 'var(--accent-red)'
    : hovered && !readonly
      ? 'var(--bg-card-hover, #e8eaed)'
      : 'var(--bg-input)'
  const stroke = selected ? 'var(--accent-red)' : 'var(--border)'
  const opacity = selected ? 0.85 : 1

  return (
    <g
      style={{ cursor: readonly ? 'default' : 'pointer' }}
      onMouseEnter={() => !readonly && onHover(id)}
      onMouseLeave={() => !readonly && onHover(null)}
      onClick={() => !readonly && onClick(id)}
    >
      {children}
      {/* invisible hit-area element handled by children */}
      <style>{`
        g [data-zone="${id}"] { fill: ${fill}; stroke: ${stroke}; stroke-width: 1.5; opacity: ${opacity}; transition: fill 0.15s, opacity 0.15s; }
      `}</style>
    </g>
  )
}

type Props = {
  selected?: string | null
  onChange?: (zona: string) => void
  readonly?: boolean
}

export default function CorpoUmano({ selected, onChange, readonly = false }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)

  const getStyle = (id: string): React.SVGProps<SVGElement> => {
    const isSelected = selected === id
    const isHovered = hovered === id && !readonly
    return {
      fill: isSelected ? 'var(--accent-red)' : isHovered ? '#d0d5dd' : 'var(--bg-input)',
      stroke: isSelected ? 'var(--accent-red)' : 'var(--border)',
      strokeWidth: 1.5,
      opacity: isSelected ? 0.85 : 1,
      cursor: readonly ? 'default' : 'pointer',
      transition: 'fill 0.15s, opacity 0.15s',
    } as any
  }

  const handleClick = (id: string) => {
    if (!readonly) onChange?.(id)
  }

  const bind = (id: string): any => ({
    ...getStyle(id),
    onMouseEnter: () => !readonly && setHovered(id),
    onMouseLeave: () => !readonly && setHovered(null),
    onClick: () => handleClick(id),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg
        viewBox="0 0 220 340"
        width={160}
        height={272}
        style={{ overflow: 'visible' }}
      >
        {/* Testa */}
        <ellipse cx={110} cy={30} rx={25} ry={28} {...bind('testa')} />
        {/* Collo */}
        <rect x={100} y={55} width={20} height={18} rx={5} {...bind('collo')} />
        {/* Spalle */}
        <ellipse cx={75} cy={85} rx={18} ry={12} {...bind('spalla_sx')} />
        <ellipse cx={145} cy={85} rx={18} ry={12} {...bind('spalla_dx')} />
        {/* Petto */}
        <rect x={85} y={78} width={50} height={45} rx={6} {...bind('petto')} />
        {/* Addome */}
        <rect x={88} y={120} width={44} height={35} rx={5} {...bind('addome')} />
        {/* Anche */}
        <ellipse cx={95} cy={165} rx={16} ry={14} {...bind('anca_sx')} />
        <ellipse cx={125} cy={165} rx={16} ry={14} {...bind('anca_dx')} />
        {/* Cosce */}
        <rect x={82} y={178} width={26} height={55} rx={8} {...bind('coscia_sx')} />
        <rect x={112} y={178} width={26} height={55} rx={8} {...bind('coscia_dx')} />
        {/* Ginocchia */}
        <ellipse cx={95} cy={240} rx={15} ry={13} {...bind('ginocchio_sx')} />
        <ellipse cx={125} cy={240} rx={15} ry={13} {...bind('ginocchio_dx')} />
        {/* Polpacci */}
        <rect x={83} y={252} width={24} height={50} rx={7} {...bind('polpaccio_sx')} />
        <rect x={113} y={252} width={24} height={50} rx={7} {...bind('polpaccio_dx')} />
        {/* Caviglie */}
        <ellipse cx={95} cy={308} rx={12} ry={9} {...bind('caviglia_sx')} />
        <ellipse cx={125} cy={308} rx={12} ry={9} {...bind('caviglia_dx')} />
      </svg>

      <div style={{
        fontSize: 13,
        textAlign: 'center',
        minHeight: 20,
        color: selected ? 'var(--accent-red)' : 'var(--text-muted)',
        fontWeight: selected ? 600 : 400,
      }}>
        {selected ? ZONE_LABELS[selected] ?? selected : 'Clicca sulla zona colpita'}
      </div>
    </div>
  )
}

export { ZONE_LABELS }
