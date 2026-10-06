import { useCallback, useEffect, useRef, useState } from 'react'
import AgentIntercomBeam from './AgentIntercomBeam'
import KanbanColumn from './KanbanColumn'
import { KANBAN_COLUMNS } from './useKanbanAgents'

export default function KanbanBoard({ agents, messages, onMoveAgent, viewMode = 'board' }) {
  const boardRef = useRef(null)
  const cardNodes = useRef(new Map())
  const [canvas, setCanvas] = useState({ width: 0, height: 0, positions: {} })

  const measure = useCallback(() => {
    const board = boardRef.current
    if (!board) return
    const boardRect = board.getBoundingClientRect()
    const positions = {}
    cardNodes.current.forEach((node, id) => {
      const cardRect = node.getBoundingClientRect()
      positions[id] = {
        x: cardRect.left - boardRect.left + cardRect.width / 2,
        y: cardRect.top - boardRect.top + cardRect.height / 2,
      }
    })
    setCanvas({ width: boardRect.width, height: boardRect.height, positions })
  }, [])

  const registerCard = useCallback((id, node) => {
    if (node) cardNodes.current.set(id, node)
    else cardNodes.current.delete(id)
    requestAnimationFrame(measure)
  }, [measure])

  useEffect(() => {
    measure()
    const board = boardRef.current
    if (!board || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(board)
    return () => observer.disconnect()
  }, [measure])

  useEffect(() => {
    measure()
  }, [agents, measure])

  const handleDragStart = useCallback((event, agentId) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', agentId)
  }, [])

  return (
    <section ref={boardRef} className={`kanban-board ${viewMode === 'list' ? 'kanban-board--list' : ''}`} aria-label="Agent collaboration kanban board">
      <div className="kanban-board__grid">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            agents={agents.filter((agent) => agent.columnId === column.id)}
            onRegisterCard={registerCard}
            onDragStart={handleDragStart}
            onMoveAgent={onMoveAgent}
          />
        ))}
      </div>
      <AgentIntercomBeam width={canvas.width} height={canvas.height} positions={canvas.positions} connections={messages} />
    </section>
  )
}
