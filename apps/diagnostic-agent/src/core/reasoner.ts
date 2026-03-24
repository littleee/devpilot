import { HeuristicResult, NormalizedIncident } from '../types'

export function buildReasonedAnalysis(
  incident: NormalizedIncident,
  heuristic: HeuristicResult
): HeuristicResult {
  const lastQuestion = incident.conversation
    .filter((turn) => turn.role === 'user')
    .slice(-1)[0]?.content

  if (!lastQuestion) {
    return heuristic
  }

  return {
    summary: `${heuristic.summary} 本轮追问重点：${lastQuestion}`,
    possibleCauses: heuristic.possibleCauses,
    evidence: heuristic.evidence,
    nextSteps: [
      ...heuristic.nextSteps,
      `围绕这次追问，继续验证当前路由 ${incident.context.route} 在最近一次操作后是否还会稳定复现相同问题。`,
    ],
  }
}

export function buildFallbackChatReply(
  incident: NormalizedIncident,
  heuristic: HeuristicResult
): string {
  const lastQuestion = incident.conversation
    .filter((turn) => turn.role === 'user')
    .slice(-1)[0]?.content

  if (lastQuestion) {
    return [
      `这次我先直接回答你的追问：${heuristic.summary}`,
      heuristic.nextSteps[0]
        ? `我建议你先做这一项验证：${heuristic.nextSteps[0]}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  return [
    `${heuristic.summary}`,
    heuristic.nextSteps[0]
      ? `建议先从这一步开始排查：${heuristic.nextSteps[0]}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}
