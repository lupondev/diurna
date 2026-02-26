import type { EvidenceMode } from './types'
import type { TaskInput } from './types'

export function detectMode(task: TaskInput): EvidenceMode {
  if (task.facts_payload !== undefined) {
    const payload = task.facts_payload
    if (Array.isArray(payload) && payload.length > 0) return 'FACT_MODE'
    if (typeof payload === 'string' && payload.trim().length > 0) return 'FACT_MODE'
  }
  if (task.sources && task.sources.length > 0) return 'SOURCE_MODE'
  if (task.citations && task.citations.length > 0) return 'SOURCE_MODE'
  if (task.sourceContext && task.sourceContext.trim().length > 50) return 'SOURCE_MODE'
  return 'GENERAL_MODE'
}
