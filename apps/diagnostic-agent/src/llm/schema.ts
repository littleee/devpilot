import { ModelDiagnosis } from '../types'

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 6)
}

function extractJson(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }
  return text
}

export function parseModelDiagnosis(text: string): ModelDiagnosis {
  const parsed = JSON.parse(extractJson(text)) as Record<
    string,
    unknown
  >
  const confidence = String(parsed.confidence || 'medium')
  if (!parsed.summary || typeof parsed.summary !== 'string') {
    throw new Error('Model response missing summary')
  }
  return {
    summary: parsed.summary.trim(),
    chatReply:
      typeof parsed.chatReply === 'string' &&
      parsed.chatReply.trim()
        ? parsed.chatReply.trim()
        : parsed.summary.trim(),
    possibleCauses: asStringArray(parsed.possibleCauses),
    evidence: asStringArray(parsed.evidence),
    nextSteps: asStringArray(parsed.nextSteps),
    confidence:
      confidence === 'low' ||
      confidence === 'medium' ||
      confidence === 'high'
        ? confidence
        : 'medium',
    missingContext: asStringArray(parsed.missingContext),
  }
}
