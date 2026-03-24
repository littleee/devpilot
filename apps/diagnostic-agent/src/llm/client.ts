import http from 'http'
import https from 'https'
import { URL } from 'url'
import { LlmConfig } from './config'
import { buildSystemPrompt, buildUserPrompt } from './prompt'
import { parseModelDiagnosis } from './schema'
import { HeuristicResult, ModelDiagnosis, NormalizedIncident } from '../types'

function postJson(
  urlText: string,
  options: {
    headers: Record<string, string>
    body: string
    timeoutMs: number
  }
): Promise<{
  status: number
  body: string
}> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlText)
    const transport = url.protocol === 'https:' ? https : http
    const request = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          ...options.headers,
          'content-length': Buffer.byteLength(options.body),
        },
      },
      (response) => {
        let chunks = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          chunks += chunk
        })
        response.on('end', () => {
          resolve({
            status: response.statusCode || 0,
            body: chunks,
          })
        })
      }
    )

    request.setTimeout(options.timeoutMs, () => {
      request.destroy(new Error('LLM request timed out'))
    })
    request.on('error', reject)
    request.write(options.body)
    request.end()
  })
}

function inferProvider(baseUrl: string): string | undefined {
  const value = baseUrl.toLowerCase()
  if (value.includes('kimi')) {
    return 'Kimi Code 兼容服务'
  }
  if (value.includes('moonshot')) {
    return 'Moonshot API'
  }
  return undefined
}

export class AnthropicMessagesClient {
  constructor(private readonly config: LlmConfig) {}

  async diagnose(input: {
    normalizedIncident: NormalizedIncident
    heuristic: HeuristicResult
  }): Promise<ModelDiagnosis> {
    try {
      const requestBody = JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: 0.2,
        system: buildSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: buildUserPrompt({
              ...input,
              runtime: {
                model: this.config.model,
                protocol: 'anthropic-messages',
                provider: inferProvider(this.config.baseUrl),
              },
            }),
          },
        ],
      })

      const response = await postJson(
        `${this.config.baseUrl}/v1/messages`,
        {
          headers: {
            'content-type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: requestBody,
          timeoutMs: this.config.timeoutMs,
        }
      )

      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          `LLM request failed: ${response.status} ${response.body}`
        )
      }

      const data = JSON.parse(response.body) as {
        content?: Array<{
          type?: string
          text?: string
        }>
      }
      const text = (data.content || [])
        .filter((item) => item.type === 'text' && item.text)
        .map((item) => item.text)
        .join('\n')

      if (!text.trim()) {
        throw new Error('LLM response has no text content')
      }

      return parseModelDiagnosis(text)
    } finally {
      void 0
    }
  }
}
