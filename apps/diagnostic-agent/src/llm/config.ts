export interface LlmConfig {
  enabled: boolean
  provider: 'anthropic-messages'
  baseUrl: string
  apiKey: string
  model: string
  timeoutMs: number
  maxTokens: number
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export function readLlmConfig(): LlmConfig | null {
  const apiKey = process.env.LLM_API_KEY
  const baseUrl = process.env.LLM_BASE_URL
  const model = process.env.LLM_MODEL || 'k2p5'

  if (!apiKey || !baseUrl) {
    return null
  }

  return {
    enabled: true,
    provider: 'anthropic-messages',
    baseUrl: trimTrailingSlash(baseUrl),
    apiKey,
    model,
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 20000),
    maxTokens: Number(process.env.LLM_MAX_TOKENS || 2048),
  }
}
