import {
  AgentRequestPayload,
  NormalizedIncident,
} from '../types'
import { classifyIncident } from './classify'

export function normalizeIncident(
  payload: AgentRequestPayload
): NormalizedIncident {
  return {
    trigger: payload.trigger,
    event: payload.event,
    context: payload.context,
    conversation: payload.conversation || [],
    app: payload.app,
    classification: classifyIncident(payload.event),
  }
}
