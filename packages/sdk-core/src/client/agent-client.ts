import {
  CopilotAnalysisRequest,
  ConversationTurn,
  StreamHandlers,
} from '../types'
import { HttpAgent, Message } from '@ag-ui/client'
import { AgUiEvent, isAgUiEvent } from '../protocol/agui'

function trimTrailingSlash(input: string): string {
  return input.replace(/\/+$/, '')
}

export async function streamDiagnostic(
  agentBaseUrl: string,
  payload: CopilotAnalysisRequest,
  handlers: StreamHandlers
): Promise<void> {
  const abortController = new AbortController()
  const onAbort = () => {
    abortController.abort()
  }
  handlers.signal?.addEventListener('abort', onAbort)

  try {
    const agent = new HttpAgent({
      url: `${trimTrailingSlash(agentBaseUrl)}/v1/diagnose/stream`,
      threadId: payload.threadId,
      initialMessages: toAgUiMessages(
        payload.conversation,
        payload.threadId
      ),
      initialState: {
        trigger: payload.trigger,
        event: payload.event,
        context: payload.context,
        app: payload.app,
      },
    })

    await agent.runAgent(
      {
        runId: `${payload.threadId}_run`,
        abortController,
      },
      {
        onEvent: ({ event }) => {
          if (!isAgUiEvent(event)) {
            throw new Error(
              'Agent returned a non-AG-UI event.'
            )
          }
          handlers.onEvent(event)
        },
      }
    )
  } finally {
    handlers.signal?.removeEventListener('abort', onAbort)
  }
}

function toAgUiMessages(
  conversation: ConversationTurn[],
  threadId: string
): Message[] {
  return conversation.reduce<Message[]>((messages, turn, index) => {
    if (turn.role === 'user') {
      messages.push({
        id: `${threadId}_user_${index}`,
        role: 'user',
        content: turn.content,
      })
      return messages
    }

    if (turn.role === 'assistant') {
      messages.push({
        id: `${threadId}_assistant_${index}`,
        role: 'assistant',
        content: turn.content,
      })
      return messages
    }

    messages.push({
      id: `${threadId}_system_${index}`,
      role: 'system',
      content: turn.content,
    })
    return messages
  }, [])
}

export function parseAgUiEventForTest(
  value: unknown
): AgUiEvent {
  if (!isAgUiEvent(value)) {
    throw new Error('invalid ag-ui event')
  }
  return value
}
