import http, { IncomingMessage, ServerResponse } from 'http'
import { RunAgentInput } from '@ag-ui/core'
import { normalizeIncident } from './core/normalize'
import {
  augmentHeuristicWithCodeFix,
  augmentHeuristicWithSourceInspection,
  runHeuristics,
} from './core/heuristics'
import {
  buildFallbackChatReply,
  buildReasonedAnalysis,
} from './core/reasoner'
import { mergeDiagnosis } from './core/merge'
import { streamAnalysis } from './server/sse'
import { AgentRequestPayload, ModelDiagnosis } from './types'
import { readLlmConfig } from './llm/config'
import { AnthropicMessagesClient } from './llm/client'
import { inspectLocalSource } from './tools/source-inspector'
import { attemptLocalCodeFix } from './tools/local-code-fix'

function setCors(response: ServerResponse): void {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  )
  response.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,OPTIONS'
  )
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

function makeRunId(threadId: string): string {
  return `${threadId}_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2, 8)}`
}

function isRunAgentInputPayload(
  value: unknown
): value is RunAgentInput {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as { threadId?: unknown }).threadId === 'string' &&
      Array.isArray((value as { messages?: unknown }).messages)
  )
}

function toTextContent(
  content: unknown
): string {
  if (typeof content === 'string') {
    return content
  }
  if (!Array.isArray(content)) {
    return ''
  }
  return content
    .map((item) => {
      if (
        item &&
        typeof item === 'object' &&
        (item as { type?: unknown }).type === 'text'
      ) {
        return String((item as { text?: unknown }).text || '')
      }
      return ''
    })
    .join('\n')
    .trim()
}

function isConversationRole(
  role: unknown
): role is 'system' | 'user' | 'assistant' {
  return (
    role === 'system' ||
    role === 'user' ||
    role === 'assistant'
  )
}

function normalizeRequestPayload(
  rawBody: string
): AgentRequestPayload {
  const parsed = JSON.parse(rawBody) as unknown
  if (!isRunAgentInputPayload(parsed)) {
    return parsed as AgentRequestPayload
  }

  const state =
    parsed.state && typeof parsed.state === 'object'
      ? (parsed.state as Record<string, unknown>)
      : {}

  return {
    trigger:
      state.trigger === 'manual' ? 'manual' : 'auto',
    threadId: parsed.threadId,
    app: state.app as AgentRequestPayload['app'],
    event: state.event as AgentRequestPayload['event'],
    context: state.context as AgentRequestPayload['context'],
    conversation: parsed.messages.reduce<
      AgentRequestPayload['conversation']
    >((conversation, message) => {
      if (!isConversationRole(message.role)) {
        return conversation
      }
      conversation.push({
        role: message.role,
        content: toTextContent(message.content),
        timestamp: Date.now(),
      })
      return conversation
    }, []),
  }
}

export function createDiagnosticAgentServer() {
  const llmConfig = readLlmConfig()
  const llmClient = llmConfig
    ? new AnthropicMessagesClient(llmConfig)
    : null

  return http.createServer(async (request, response) => {
    setCors(response)

    if (request.method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }

    if (request.url === '/healthz' && request.method === 'GET') {
      response.writeHead(200, {
        'Content-Type': 'application/json',
      })
      response.end(JSON.stringify({ ok: true }))
      return
    }

    if (
      request.url === '/v1/diagnose/stream' &&
      request.method === 'POST'
    ) {
      try {
        const rawBody = await readBody(request)
        const payload = normalizeRequestPayload(rawBody)
        const normalized = normalizeIncident(payload)
        const sourceInspection = inspectLocalSource(normalized)
        const codeFixResult = sourceInspection
          ? attemptLocalCodeFix(normalized, sourceInspection)
          : null
        const heuristic = augmentHeuristicWithCodeFix(
          augmentHeuristicWithSourceInspection(
            runHeuristics(normalized),
            sourceInspection
          ),
          codeFixResult
        )
        const reasoned = buildReasonedAnalysis(
          normalized,
          heuristic
        )
        let result: ModelDiagnosis = {
          chatReply: buildFallbackChatReply(
            normalized,
            reasoned
          ),
          ...reasoned,
          confidence: 'medium',
          missingContext: [],
        }
        let source = 'heuristic'

        if (llmClient) {
          try {
            const modelDiagnosis = await llmClient.diagnose({
              normalizedIncident: normalized,
              heuristic: reasoned,
            })
            result = mergeDiagnosis(reasoned, modelDiagnosis)
            source = 'llm'
          } catch (error) {
            source = 'heuristic-fallback'
            console.error(
              '[diagnostic-agent] llm fallback:',
              (error as Error).message
            )
          }
        }
        response.writeHead(200, {
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache, no-transform',
        })
        await streamAnalysis(response, result, {
          source,
          threadId: payload.threadId,
          runId: makeRunId(payload.threadId),
          incident: {
            id: payload.event.id,
            kind: payload.event.kind,
            severity: payload.event.severity,
            title: payload.event.title,
            message: payload.event.message,
            route: payload.event.route,
            count: 1,
          },
          messages: payload.conversation.map((message, index) => ({
            id: `${payload.threadId}_history_${index}`,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp,
          })),
          tools: sourceInspection
            ? [
                {
                  toolCallName: 'local_source_lookup',
                  argsText: JSON.stringify(
                    {
                      appId: payload.app.appId,
                      route: payload.event.route,
                      stackTop: payload.event.stackTop || '',
                    },
                    null,
                    2
                  ),
                  resultText: JSON.stringify(
                    {
                      file: sourceInspection.relativePath,
                      line: sourceInspection.line,
                      column: sourceInspection.column,
                      lineText: sourceInspection.lineText,
                      snippet: sourceInspection.snippet,
                    },
                    null,
                    2
                  ),
                },
                ...(codeFixResult
                  ? [
                      {
                        toolCallName: 'local_code_fix',
                        argsText: JSON.stringify(
                          {
                            file: codeFixResult.relativePath,
                            line: codeFixResult.line,
                            before: codeFixResult.beforeLineText,
                          },
                          null,
                          2
                        ),
                        resultText: JSON.stringify(
                          codeFixResult.applied
                            ? {
                                applied: true,
                                file: codeFixResult.relativePath,
                                line: codeFixResult.line,
                                before:
                                  codeFixResult.beforeLineText,
                                replacement:
                                  codeFixResult.replacement,
                                after:
                                  codeFixResult.afterLineText,
                              }
                            : {
                                applied: false,
                                file: codeFixResult.relativePath,
                                line: codeFixResult.line,
                                before:
                                  codeFixResult.beforeLineText,
                                reason: codeFixResult.reason,
                              },
                          null,
                          2
                        ),
                      },
                    ]
                  : []),
              ]
            : codeFixResult
              ? [
                  {
                    toolCallName: 'local_code_fix',
                    argsText: JSON.stringify(
                      {
                        file: codeFixResult.relativePath,
                        line: codeFixResult.line,
                        before: codeFixResult.beforeLineText,
                      },
                      null,
                      2
                    ),
                    resultText: JSON.stringify(
                      codeFixResult.applied
                        ? {
                            applied: true,
                            file: codeFixResult.relativePath,
                            line: codeFixResult.line,
                            before:
                              codeFixResult.beforeLineText,
                            replacement:
                              codeFixResult.replacement,
                            after:
                              codeFixResult.afterLineText,
                          }
                        : {
                            applied: false,
                            file: codeFixResult.relativePath,
                            line: codeFixResult.line,
                            before:
                              codeFixResult.beforeLineText,
                            reason: codeFixResult.reason,
                          },
                      null,
                      2
                    ),
                  },
                ]
              : [],
        })
      } catch (error) {
        response.writeHead(500, {
          'Content-Type': 'text/event-stream',
        })
        response.write(
          `data: ${JSON.stringify({
            type: 'RUN_ERROR',
            message: (error as Error).message,
            code: 'INTERNAL_ERROR',
            timestamp: Date.now(),
          })}\n\n`
        )
        response.end()
      }
      return
    }

    response.writeHead(404, {
      'Content-Type': 'application/json',
    })
    response.end(JSON.stringify({ error: 'Not Found' }))
  })
}

if (require.main === module) {
  const port = Number(process.env.PORT || 7788)
  createDiagnosticAgentServer().listen(port, () => {
    console.log(`Diagnostic agent listening on http://localhost:${port}`)
  })
}
