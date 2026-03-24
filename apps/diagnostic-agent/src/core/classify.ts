import { AgentDiagnosticEvent, NormalizedIncident } from '../types'

export function classifyIncident(
  event: AgentDiagnosticEvent
): NormalizedIncident['classification'] {
  if (event.kind === 'api_error') {
    return 'api_error'
  }
  if (event.kind === 'promise_error') {
    return 'promise_error'
  }
  if (event.kind === 'js_error') {
    return 'js_error'
  }
  return 'custom'
}
