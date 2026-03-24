import { HeuristicResult, NormalizedIncident } from '../types'

export function buildSystemPrompt(): string {
  return [
    '你是一个前端稳定性诊断助手，专门分析 JS 异常、Promise 异常、接口报错和业务错误上报。',
    '如果用户询问你是谁、你是什么模型、你由谁提供，请只根据输入里明确提供的运行时信息回答，不能猜测。',
    '如果输入里没有明确给出底层模型或供应商信息，请如实回答：你是“稳定性副驾”，当前对话上下文没有暴露更具体的底层模型信息。',
    '你必须只根据输入信息进行判断，不能虚构代码、日志、链路或接口字段。',
    '输出必须是简体中文，并严格输出 JSON，不要输出任何 JSON 之外的文字。',
    '请优先参考已有规则诊断结果，再做归纳、补充和重写。',
    '如果证据不足，请明确表达不确定，并指出还缺少什么上下文。',
    'JSON 结构必须为：{"chatReply":"", "summary":"", "possibleCauses":[""], "evidence":[""], "nextSteps":[""], "confidence":"low|medium|high", "missingContext":[""]}',
  ].join('\n')
}

export function buildUserPrompt(input: {
  normalizedIncident: NormalizedIncident
  heuristic: HeuristicResult
  runtime?: {
    model?: string
    provider?: string
    protocol?: string
  }
}): string {
  const { normalizedIncident, heuristic, runtime } = input
  const followUp = normalizedIncident.conversation
    .filter((item) => item.role === 'user')
    .slice(-1)[0]?.content
  const conversationHistory = normalizedIncident.conversation
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: item.content,
      timestamp: item.timestamp,
    }))

  return JSON.stringify(
    {
      app: normalizedIncident.app,
      classification: normalizedIncident.classification,
      trigger: normalizedIncident.trigger,
      event: normalizedIncident.event,
      context: normalizedIncident.context,
      heuristicResult: heuristic,
      runtimeInfo: runtime || null,
      conversationHistory,
      followUpQuestion: followUp || null,
      instruction: [
        '请基于以上内容给出一版更适合人阅读的中文稳定性诊断结论。',
        'chatReply 是给聊天窗口展示的自然回复，请像一个真人助手那样说话，2-5 句即可，不要重复输出完整模版，不要逐段罗列“结论摘要/可能原因/诊断依据/建议排查步骤”这些标题。',
        'summary 要是一句话，possibleCauses / evidence / nextSteps 各给 2-4 条以内，尽量避免重复；这些结构化字段会单独展示在常驻卡片里。',
        '如果当前事件是业务错误上报(custom)，不要误判成浏览器底层异常，要结合 message、errorName、errorCode 和 route 来判断。',
        '如果 followUpQuestion 不为空，chatReply 必须优先直接回答这次追问，不要只是重复上一轮结论。',
        '如果 conversationHistory 里已经有 assistant 结论，请在新回答里体现新增判断、补充依据或更具体的排查建议。',
        '如果这次追问是在问你的身份或模型来源，请只使用 runtimeInfo 中明确给出的信息；没有就明确说当前上下文未暴露，不要臆测。',
        '如果 heuristicResult.evidence 里出现“已自动修复”，chatReply 必须明确告诉用户代码已经被修改，并指出修改了哪个文件哪一行以及建议如何验证。',
      ],
    },
    null,
    2
  )
}
