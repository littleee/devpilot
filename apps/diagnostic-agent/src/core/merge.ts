import { HeuristicResult, ModelDiagnosis } from '../types'

function dedupe(items: string[]): string[] {
  return Array.from(
    new Set(items.map((item) => item.trim()).filter(Boolean))
  )
}

export function mergeDiagnosis(
  heuristic: HeuristicResult,
  model: ModelDiagnosis
): ModelDiagnosis {
  return {
    chatReply: model.chatReply || model.summary || heuristic.summary,
    summary: model.summary || heuristic.summary,
    possibleCauses: dedupe([
      ...model.possibleCauses,
      ...heuristic.possibleCauses,
    ]).slice(0, 5),
    evidence: dedupe([
      ...heuristic.evidence,
      ...model.evidence,
    ]).slice(0, 6),
    nextSteps: dedupe([
      ...model.nextSteps,
      ...heuristic.nextSteps,
    ]).slice(0, 6),
    confidence: model.confidence,
    missingContext: dedupe(model.missingContext || []).slice(0, 5),
  }
}
