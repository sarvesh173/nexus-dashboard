import { BrainCircuit, CheckCircle2, Inbox, MessageSquareMore, ShieldCheck } from 'lucide-react'
import KanbanCard from './KanbanCard'

const COLUMN_ICONS = {
  inbox: Inbox,
  brain: BrainCircuit,
  chat: MessageSquareMore,
  shield: ShieldCheck,
  check: CheckCircle2,
}

export default function KanbanColumn({ column, agents, onRegisterCard, onDragStart, onMoveAgent }) {
  const Icon = COLUMN_ICONS[column.icon] || Inbox
  const handleDrop = (event) => {
    event.preventDefault()
    event.currentTarget.classList.remove('is-over')
    const agentId = event.dataTransfer.getData('text/plain')
    if (agentId) onMoveAgent(agentId, column.id)
  }

  return (
    <section className="kanban-column" data-column={column.id} aria-labelledby={`column-${column.id}`}>
      <header className="kanban-column__header">
        <div className="kanban-column__heading">
          <span className="kanban-column__icon"><Icon size={17} aria-hidden="true" /></span>
          <div>
            <span className="kanban-column__eyebrow">Stage {String(['backlog', 'reasoning', 'sync', 'verification', 'completed'].indexOf(column.id) + 1).padStart(2, '0')}</span>
            <h2 id={`column-${column.id}`}>{column.label}</h2>
          </div>
        </div>
        <span className="kanban-column__count" aria-label={`${agents.length} agents`}>{String(agents.length).padStart(2, '0')}</span>
      </header>

      <div
        className="kanban-column__dropzone"
        onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('is-over') }}
        onDragLeave={(event) => event.currentTarget.classList.remove('is-over')}
        onDrop={handleDrop}
      >
        {agents.map((agent) => (
          <KanbanCard key={agent.id} agent={agent} onRegisterCard={onRegisterCard} onDragStart={onDragStart} />
        ))}
        {!agents.length && <div className="kanban-column__empty"><span>+</span><p>{column.empty}</p></div>}
      </div>
    </section>
  )
}
