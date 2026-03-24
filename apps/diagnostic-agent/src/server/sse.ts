import { ServerResponse } from 'http'
import { EventType } from '@ag-ui/core'
import { ModelDiagnosis } from '../types'
import { AgUiEvent } from '../../../../packages/sdk-core/src/protocol/agui'

function writeEvent(
  response: ServerResponse,
  event: AgUiEvent
): void {
  response.write(`data: ${JSON.stringify(event)}\n\n`)
}

export async function streamAnalysis(
  response: ServerResponse,
  result: ModelDiagnosis,
  metadata?: {
    source?: string
    threadId?: string
    runId?: string
    incident?: {
      id?: string
      kind?: string
      severity?: string
      title?: string
      message?: string
      route?: string
      count?: number
    }
    messages?: Array<{
      id?: string
      role?: 'system' | 'user' | 'assistant'
      content?: string
      timestamp?: number
    }>
    tools?: Array<{
      toolCallName: string
      argsText: string
      resultText: string
    }>
  }
): Promise<void> {
  const threadId = metadata?.threadId || 'thread_unknown'
  const runId = metadata?.runId || `run_${Date.now()}`
  const messageId = `assistant_${runId}`
  const tools = metadata?.tools || []

  writeEvent(response, {
    type: EventType.RUN_STARTED,
    threadId,
    runId,
    timestamp: Date.now(),
  })
  await wait()
  writeEvent(response, {
    type: EventType.STEP_STARTED,
    stepName: 'diagnosis',
    timestamp: Date.now(),
  })
  await wait()
  writeEvent(response, {
    type: EventType.MESSAGES_SNAPSHOT,
    timestamp: Date.now(),
    messages: (metadata?.messages || []).map((message, index) => ({
      id: message.id || `history_${runId}_${index}`,
      role: message.role || 'user',
      content: message.content || '',
      timestamp: message.timestamp || Date.now(),
    })),
  })
  await wait()
  writeEvent(response, {
    type: EventType.STATE_SNAPSHOT,
    timestamp: Date.now(),
    snapshot: buildLoadingSnapshot(metadata?.incident),
  })
  await wait()
  for (const [index, tool] of tools.entries()) {
    const toolCallId = `tool_${runId}_${index}`
    const toolResultMessageId = `tool_result_${runId}_${index}`
    writeEvent(response, {
      type: EventType.TOOL_CALL_START,
      timestamp: Date.now(),
      toolCallId,
      toolCallName: tool.toolCallName,
    })
    await wait()
    writeEvent(response, {
      type: EventType.TOOL_CALL_ARGS,
      timestamp: Date.now(),
      toolCallId,
      delta: tool.argsText,
    })
    await wait()
    writeEvent(response, {
      type: EventType.TOOL_CALL_END,
      timestamp: Date.now(),
      toolCallId,
    })
    await wait()
    writeEvent(response, {
      type: EventType.TOOL_CALL_RESULT,
      timestamp: Date.now(),
      messageId: toolResultMessageId,
      toolCallId,
      role: 'tool',
      content: tool.resultText,
    })
    await wait()
  }
  writeEvent(response, {
    type: EventType.STATE_DELTA,
    timestamp: Date.now(),
    delta: buildDiagnosisDelta(result, metadata?.source),
  })
  await wait()
  writeEvent(response, {
    type: EventType.TEXT_MESSAGE_START,
    timestamp: Date.now(),
    messageId,
    role: 'assistant',
  })
  await wait()
  writeEvent(response, {
    type: EventType.TEXT_MESSAGE_CONTENT,
    timestamp: Date.now(),
    messageId,
    delta: result.chatReply,
  })
  await wait()
  writeEvent(response, {
    type: EventType.TEXT_MESSAGE_END,
    timestamp: Date.now(),
    messageId,
  })
  await wait()
  writeEvent(response, {
    type: EventType.STEP_FINISHED,
    stepName: 'diagnosis',
    timestamp: Date.now(),
  })
  await wait()
  writeEvent(response, {
    type: EventType.RUN_FINISHED,
    timestamp: Date.now(),
    threadId,
    runId,
    result: {
      status: 'ok',
    },
  })
  response.end()
}

function buildLoadingSnapshot(
  incident?: {
    id?: string
    kind?: string
    severity?: string
    title?: string
    message?: string
    route?: string
    count?: number
  }
): Record<string, unknown> {
  return {
    incident: incident || {},
    diagnosis: {
      status: 'loading',
      source: 'processing',
      summary: '',
      possibleCauses: [],
      evidence: [],
      nextSteps: [],
      confidence: 'medium',
      missingContext: [],
    },
  }
}

function buildDiagnosisDelta(
  result: ModelDiagnosis,
  source?: string
): Array<Record<string, unknown>> {
  return [
    {
      op: 'replace',
      path: '/diagnosis/status',
      value: 'done',
    },
    {
      op: 'replace',
      path: '/diagnosis/source',
      value: source || 'unknown',
    },
    {
      op: 'replace',
      path: '/diagnosis/summary',
      value: result.summary,
    },
    {
      op: 'replace',
      path: '/diagnosis/possibleCauses',
      value: result.possibleCauses,
    },
    {
      op: 'replace',
      path: '/diagnosis/evidence',
      value: result.evidence,
    },
    {
      op: 'replace',
      path: '/diagnosis/nextSteps',
      value: result.nextSteps,
    },
    {
      op: 'replace',
      path: '/diagnosis/confidence',
      value: result.confidence,
    },
    {
      op: 'replace',
      path: '/diagnosis/missingContext',
      value: result.missingContext || [],
    },
  ]
}

function wait(duration = 30): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}
