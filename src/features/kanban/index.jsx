import { useMemo, useState } from 'react'
import { Activity, Layers3, List, Radio, Sparkles } from 'lucide-react'
import KanbanBoard from './KanbanBoard'
import useKanbanAgents from './useKanbanAgents'
import './kanban.css'

const FILTERS = [
  { id: 'all', label: 'All agents' },
  { id: 'active', label: 'Live now' },
  { id: 'sync', label: 'Peer sync' },
  { id: 'review', label: 'Needs review' },
]

function matchesFilter(agent, filterId) {
  if (filterId === 'active') return !['queued', 'complete'].includes(agent.status)
  if (filterId === 'sync') return agent.columnId === 'sync'
  if (filterId === 'review') return agent.needsReview
  return true
}

export default function Kanban() {
  const { agents, messages, isLive, toggleLive, moveAgent, activeCount, onlineCount, lastMessage } = useKanbanAgents()
  const [filterId, setFilterId] = useState('all')
  const [viewMode, setViewMode] = useState('board')
  const visibleAgents = useMemo(() => agents.filter((agent) => matchesFilter(agent, filterId)), [agents, filterId])

  return (
    <main className="kanban-shell">
      <div className="kanban-shell__frame">
        <header className="kanban-header">
          <div>
            <div className="kanban-kicker"><span className="kanban-kicker__mark" /> NEXUS / FLOW ENGINE</div>
            <h1>Agent command center</h1>
            <p className="kanban-header__subtitle">A live view of autonomous work, peer decisions, and the signals moving between them.</p>
          </div>
          <div className="kanban-header__actions">
            <button className={`kanban-live-button ${isLive ? 'is-live' : ''}`} type="button" onClick={toggleLive} aria-pressed={isLive}>
              <Radio size={16} aria-hidden="true" />
              <span>{isLive ? 'Live sync' : 'Sync paused'}</span>
            </button>
            <div className="kanban-telemetry"><Activity size={15} aria-hidden="true" /><span>{activeCount} active</span><i /> <span>{onlineCount} online</span></div>
          </div>
        </header>

        <section className="kanban-toolbar" aria-label="Board controls">
          <div className="kanban-filters" role="tablist" aria-label="Filter agents">
            {FILTERS.map((filter) => {
              const count = filter.id === 'all' ? agents.length : agents.filter((agent) => matchesFilter(agent, filter.id)).length
              return <button key={filter.id} className={`kanban-filter ${filterId === filter.id ? 'is-active' : ''}`} type="button" role="tab" aria-selected={filterId === filter.id} onClick={() => setFilterId(filter.id)}>{filter.label}<span>{String(count).padStart(2, '0')}</span></button>
            })}
          </div>
          <div className="kanban-toolbar__right">
            <span className="kanban-flow-status"><Sparkles size={14} aria-hidden="true" /> {lastMessage?.label || 'Awaiting first packet'}</span>
            <div className="kanban-view-toggle" role="group" aria-label="Board view">
              <button className={viewMode === 'board' ? 'is-active' : ''} type="button" aria-label="Board view" aria-pressed={viewMode === 'board'} onClick={() => setViewMode('board')}><Layers3 size={17} aria-hidden="true" /></button>
              <button className={viewMode === 'list' ? 'is-active' : ''} type="button" aria-label="List view" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}><List size={17} aria-hidden="true" /></button>
            </div>
          </div>
        </section>

        <div className="kanban-board-intro"><span>COLLABORATION PIPELINE</span><span>Drag a card to move its stage · beams show the latest peer packets</span></div>
        <KanbanBoard agents={visibleAgents} messages={messages} onMoveAgent={moveAgent} viewMode={viewMode} />
      </div>
    </main>
  )
}
