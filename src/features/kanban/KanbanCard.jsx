import { Activity, ArrowUpRight, GripVertical, MessageCircle, MoreHorizontal } from 'lucide-react'

const ACTIVE_STATES = new Set(['reasoning', 'syncing', 'verifying'])

export default function KanbanCard({ agent, onRegisterCard, onDragStart }) {
  const isActive = ACTIVE_STATES.has(agent.status)

  return (
    <article
      ref={(node) => onRegisterCard?.(agent.id, node)}
      className="kanban-card"
      data-agent-id={agent.id}
      data-status={agent.status}
      draggable
      onDragStart={(event) => onDragStart?.(event, agent.id)}
      style={{ '--card-progress': `${agent.progress}%` }}
      aria-label={`${agent.name}: ${agent.task}`}
    >
      <div className="kanban-card__topline">
        <span className={`kanban-status kanban-status--${agent.status}`}>
          <span className="kanban-status__dot" />
          {agent.statusLabel}
        </span>
        <div className="kanban-card__tools">
          <GripVertical className="kanban-card__grip" size={15} aria-hidden="true" />
          <button className="kanban-icon-button" type="button" aria-label={`Open ${agent.name} details`}>
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="kanban-card__identity">
        <span className="kanban-avatar" aria-hidden="true">{agent.initials}</span>
        <div className="kanban-card__name-block">
          <strong>{agent.name}</strong>
          <span>{agent.role}</span>
        </div>
        <ArrowUpRight className="kanban-card__arrow" size={16} aria-hidden="true" />
      </div>

      <span className="kanban-model-badge">{agent.model}</span>
      <p className="kanban-card__task">{agent.task}</p>

      <div className="kanban-card__progress" aria-label={`${agent.progress}% complete`}>
        <div className="kanban-card__progress-head">
          <span>{isActive ? 'Working set' : 'Trace state'}</span>
          <strong>{agent.progress}%</strong>
        </div>
        <div className="kanban-card__track"><span /></div>
      </div>

      <footer className="kanban-card__footer">
        <span><Activity size={14} aria-hidden="true" /> {agent.updated}</span>
        <span><MessageCircle size={14} aria-hidden="true" /> {agent.messageCount}</span>
      </footer>
    </article>
  )
}
