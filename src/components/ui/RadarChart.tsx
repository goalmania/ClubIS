'use client'

type Dataset = { label: string; color: string; values: number[] }

type Props = {
  labels: string[]
  datasets: Dataset[]
  size?: number
}

export default function RadarChart({ labels, datasets, size = 200 }: Props) {
  const n = labels.length
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38
  const levels = [2, 4, 6, 8, 10]

  function angleOf(i: number) {
    return (Math.PI * 2 * i) / n - Math.PI / 2
  }

  function point(value: number, i: number) {
    const ratio = value / 10
    const angle = angleOf(i)
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    }
  }

  function gridPoints(level: number) {
    return Array.from({ length: n }, (_, i) => {
      const ratio = level / 10
      const angle = angleOf(i)
      return `${cx + r * ratio * Math.cos(angle)},${cy + r * ratio * Math.sin(angle)}`
    }).join(' ')
  }

  function dataPoints(values: number[]) {
    return values.map((v, i) => {
      const p = point(v, i)
      return `${p.x},${p.y}`
    }).join(' ')
  }

  function labelPos(i: number) {
    const angle = angleOf(i)
    const dist = r + 18
    return {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    }
  }

  const legendY = size + 8

  return (
    <svg
      width={size}
      height={size + 28 * datasets.length + 8}
      viewBox={`0 0 ${size} ${size + 28 * datasets.length + 8}`}
    >
      {/* Grid circles */}
      {levels.map(level => (
        <polygon
          key={level}
          points={gridPoints(level)}
          fill="none"
          stroke="var(--border-light, #30363d)"
          strokeWidth={0.5}
        />
      ))}

      {/* Axis lines */}
      {Array.from({ length: n }, (_, i) => {
        const p = point(10, i)
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="var(--border-light, #30363d)"
            strokeWidth={0.5}
          />
        )
      })}

      {/* Axis labels */}
      {labels.map((label, i) => {
        const pos = labelPos(i)
        return (
          <text
            key={i}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill="var(--text-secondary, #8b949e)"
          >
            {label}
          </text>
        )
      })}

      {/* Datasets */}
      {datasets.map((ds, di) => (
        <polygon
          key={di}
          points={dataPoints(ds.values)}
          fill={ds.color}
          fillOpacity={0.25}
          stroke={ds.color}
          strokeWidth={1.5}
        />
      ))}

      {/* Legend */}
      {datasets.map((ds, di) => (
        <g key={di} transform={`translate(${cx - 40}, ${legendY + di * 20})`}>
          <circle cx={6} cy={6} r={5} fill={ds.color} />
          <text x={16} y={10} fontSize={10} fill="var(--text-secondary, #8b949e)">
            {ds.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
