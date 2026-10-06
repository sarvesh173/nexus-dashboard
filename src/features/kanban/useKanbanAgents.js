import { useCallback, useEffect, useRef, useState } from 'react'

export const KANBAN_COLUMNS = [
  { id: 'backlog', label: 'Backlog / Ingest', shortLabel: 'Ingest', icon: 'inbox', empty: 'New intake lands here' },
  { id: 'reasoning', label: 'Active Reasoning', shortLabel: 'Reasoning', icon: 'brain', empty: 'No open reasoning loops' },
  { id: 'sync', label: 'Inter-Agent Chat', shortLabel: 'Peer sync', icon: 'chat', empty: 'Peer channel is quiet' },
  { id: 'verification', label: 'Verification', shortLabel: 'Verify', icon: 'shield', empty: 'Nothing waiting for review' },
  { id: 'completed', label: 'Completed', shortLabel: 'Done', icon: 'check', empty: 'Completed work appears here' },
]

const STAGE_STATE = {
  backlog: ['queued', 'Queued'],
  reasoning: ['reasoning', 'Reasoning'],
  sync: ['syncing', 'Syncing'],
  verification: ['verifying', 'Verifying'],
  completed: ['complete', 'Complete'],
}

const INITIAL_AGENTS = [
  { id: 'hermes', name: 'Hermes', initials: 'HE', role: 'Ingest coordinator', model: 'Claude Sonnet 4', task: 'Normalize the incoming event stream', columnId: 'backlog', status: 'queued', statusLabel: 'Queued', progress: 24, updated: '2m ago', messageCount: 2, needsReview: false },
  { id: 'opencode', name: 'OpenCode', initials: 'OC', role: 'Planning subagent', model: 'GPT-4.1', task: 'Map the retry path across providers', columnId: 'reasoning', status: 'reasoning', statusLabel: 'Reasoning', progress: 68, updated: '38s ago', messageCount: 5, needsReview: false },
  { id: 'omnirush', name: 'OmniRush', initials: 'OR', role: 'Flow router', model: 'Nexus Router', task: 'Route tool calls to the fastest capable worker', columnId: 'sync', status: 'syncing', statusLabel: 'Syncing', progress: 81, updated: '12s ago', messageCount: 8, needsReview: false },
  { id: 'claude-code', name: 'Claude Code', initials: 'CC', role: 'Verification agent', model: 'Claude Opus 4', task: 'Check the adapter contract and edge cases', columnId: 'verification', status: 'verifying', statusLabel: 'Verifying', progress: 57, updated: '1m ago', messageCount: 4, needsReview: true },
  { id: 'nexus-sentinel', name: 'Nexus Sentinel', initials: 'NS', role: 'Release guard', model: 'OmniRush Core', task: 'Archive the signed collaboration trace', columnId: 'completed', status: 'complete', statusLabel: 'Complete', progress: 100, updated: '4m ago', messageCount: 3, needsReview: false },
]

const INITIAL_MESSAGES = [
  { id: 'evt-1', from: 'hermes', to: 'opencode', kind: 'handoff', label: 'Schema handoff', payload: '12 normalized events', timestamp: 'now' },
  { id: 'evt-2', from: 'opencode', to: 'omnirush', kind: 'tool', label: 'Route request', payload: 'retry map + tool budget', timestamp: '18s ago' },
  { id: 'evt-3', from: 'omnirush', to: 'claude-code', kind: 'context', label: 'Peer context', payload: 'adapter trace attached', timestamp: '34s ago' },
  { id: 'evt-4', from: 'claude-code', to: 'nexus-sentinel', kind: 'verify', label: 'Verification packet', payload: 'contract checks: 9/12', timestamp: '1m ago' },
]

const MESSAGE_CYCLE = [
  { from: 'hermes', to: 'opencode', kind: 'handoff', label: 'Schema handoff', payload: 'new ingest batch ready' },
  { from: 'opencode', to: 'omnirush', kind: 'tool', label: 'Route request', payload: 'retry branch resolved' },
  { from: 'omnirush', to: 'claude-code', kind: 'context', label: 'Peer context', payload: 'trace delta attached' },
  { from: 'claude-code', to: 'nexus-sentinel', kind: 'verify', label: 'Verification packet', payload: 'edge checks updated' },
]

export default function useKanbanAgents() {
  const [agents, setAgents] = useState(INITIAL_AGENTS)
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [isLive, setIsLive] = useState(true)
  const eventIndex = useRef(0)

  useEffect(() => {
    if (!isLive) return undefined
    const timer = setInterval(() => {
      const event = MESSAGE_CYCLE[eventIndex.current % MESSAGE_CYCLE.length]
      eventIndex.current += 1
      const eventId = `evt-${Date.now()}`
      setMessages((current) => [{ ...event, id: eventId, timestamp: 'just now' }, ...current].slice(0, 5))
      setAgents((current) => current.map((agent) => {
        if (agent.id === event.from) return { ...agent, updated: 'just now', messageCount: agent.messageCount + 1 }
        if (agent.id === event.to) return { ...agent, updated: 'just now', messageCount: agent.messageCount + 1, progress: Math.min(98, agent.progress + 2) }
        return agent
      }))
    }, 4200)
    return () => clearInterval(timer)
  }, [isLive])

  const moveAgent = useCallback((agentId, columnId) => {
    setAgents((current) => current.map((agent) => {
      if (agent.id !== agentId) return agent
      const [status, statusLabel] = STAGE_STATE[columnId] || STAGE_STATE.backlog
      return { ...agent, columnId, status, statusLabel, needsReview: columnId === 'verification' }
    }))
  }, [])

  const toggleLive = useCallback(() => setIsLive((current) => !current), [])
  const activeCount = agents.filter((agent) => agent.status !== 'queued' && agent.status !== 'complete').length

  return { agents, messages, isLive, toggleLive, moveAgent, activeCount, onlineCount: agents.length, lastMessage: messages[0] }
}
