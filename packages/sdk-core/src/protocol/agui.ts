import { AGUIEvent, EventType } from '@ag-ui/core'

export type AgUiEvent = AGUIEvent
export { EventType as AgUiEventType }

export function isAgUiEvent(value: unknown): value is AgUiEvent {
  if (!value || typeof value !== 'object') {
    return false
  }
  const type = (value as { type?: unknown }).type
  return Object.values(EventType).includes(type as EventType)
}
