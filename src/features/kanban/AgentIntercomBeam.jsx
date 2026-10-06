function curveBetween(start, end) {
  const direction = end.x >= start.x ? 1 : -1
  const distance = Math.max(48, Math.abs(end.x - start.x) * 0.34)
  const lift = Math.min(104, Math.max(28, Math.abs(end.y - start.y) * 0.2))
  const controlY = Math.min(start.y, end.y) - lift
  return `M ${start.x} ${start.y} C ${start.x + distance * direction} ${controlY}, ${end.x - distance * direction} ${controlY}, ${end.x} ${end.y}`
}

function midpoint(start, end) {
  return { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - Math.max(20, Math.abs(start.y - end.y) * 0.12) }
}

export default function AgentIntercomBeam({ width, height, positions, connections }) {
  const visibleConnections = connections
    .map((connection) => ({ ...connection, source: positions[connection.from], target: positions[connection.to] }))
    .filter((connection) => connection.source && connection.target)

  if (!width || !height || !visibleConnections.length) return null

  return (
    <svg className="kanban-beam-layer" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {visibleConnections.map((connection, index) => {
        const curve = curveBetween(connection.source, connection.target)
        const labelPosition = midpoint(connection.source, connection.target)
        return (
          <g className={`kanban-beam kanban-beam--${connection.kind}`} key={connection.id}>
            <title>{`${connection.label}: ${connection.payload}`}</title>
            <path className="kanban-beam__glow" d={curve} />
            <path className="kanban-beam__trace" d={curve} />
            <circle
              className="kanban-beam__photon"
              cx={connection.source.x}
              cy={connection.source.y}
              style={{ offsetPath: `path('${curve}')`, '--beam-delay': `${index * -0.55}s` }}
              r="3.5"
            />
            <g className="kanban-beam__packet" transform={`translate(${labelPosition.x} ${labelPosition.y})`}>
              <rect x="-42" y="-11" width="84" height="22" rx="11" />
              <text x="0" y="4" textAnchor="middle">{connection.label}</text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}
