import {
  CodeFixResult,
  HeuristicResult,
  NormalizedIncident,
  SourceInspectionResult,
} from '../types'

function apiHeuristics(
  incident: NormalizedIncident
): HeuristicResult {
  const status = incident.event.response?.status
  const errNo = incident.event.response?.errNo
  const errMsg =
    incident.event.response?.errMsg || incident.event.message
  const traceId =
    incident.event.response?.traceId || incident.event.traceId
  const causes: string[] = []
  const evidence: string[] = []
  const nextSteps: string[] = []

  if (status === 401) {
    causes.push('登录态可能失效，或者 Cookie / 鉴权请求头不匹配。')
    nextSteps.push('先刷新登录态，再确认请求里仍然带着预期的会话信息或来源请求头。')
  } else if (status && status >= 500) {
    causes.push('后端服务自身异常，或者依赖的下游服务调用失败。')
    nextSteps.push('优先用 traceId 去查后端日志，确认是业务报错、依赖超时，还是内部异常。')
  } else if (status && status >= 400) {
    causes.push('请求参数不合法，或者当前用户没有对应权限。')
    nextSteps.push('对照接口入参定义和当前页面状态，确认关键字段是否缺失或取值异常。')
  }

  if (/timeout|ECONNABORTED/i.test(errMsg)) {
    causes.push('请求超时，或者上游处理耗时过长。')
    nextSteps.push('检查接口耗时、重试策略，以及页面是否触发了重复请求。')
  }

  if (/missing|required|empty|null/i.test(errMsg)) {
    causes.push('必填参数可能缺失、为空，或者没有被正确回填。')
    nextSteps.push('检查请求体和页面表单状态，确认提交前关键字段已经正确填充。')
  }

  evidence.push(`请求信息：${incident.event.request?.method || 'GET'} ${incident.event.request?.url || incident.context.url}`)
  if (typeof status === 'number') {
    evidence.push(`HTTP 状态码：${status}`)
  }
  if (errNo !== undefined) {
    evidence.push(`业务错误码：${String(errNo)}`)
  }
  if (traceId) {
    evidence.push(`TraceId：${traceId}`)
  }
  evidence.push(`错误信息：${errMsg}`)

  return {
    summary:
      status && status >= 500
        ? '当前页面遇到了后端异常，而且现有上下文已经带上了足够的排查信息，可以直接结合 traceId 去定位。'
        : '当前页面发生了接口报错，问题大概率出在请求参数、权限状态，或者上游响应处理逻辑。',
    possibleCauses: causes.length
      ? causes
      : ['这次请求失败没有命中明显模式，建议先看 traceId、响应体和当前页面参数。'],
    evidence,
    nextSteps: nextSteps.length
      ? nextSteps
      : ['先从请求参数、响应体和 traceId 入手，判断是前端组参问题还是后端处理异常。'],
  }
}

function runtimeHeuristics(
  incident: NormalizedIncident
): HeuristicResult {
  const message = incident.event.message
  const stackTop = incident.event.stackTop || 'No stack trace provided.'
  const causes: string[] = []
  const nextSteps: string[] = []

  if (/Cannot read (properties|property) of undefined|null/i.test(message)) {
    causes.push('代码在数据尚未准备好时，提前读取了空对象或未定义对象上的属性。')
    nextSteps.push('根据报错堆栈定位到对应渲染路径，补充空值保护或异步数据就绪判断。')
  }
  if (/Loading chunk .* failed/i.test(message)) {
    causes.push('浏览器加载分包失败，常见原因是缓存资源与当前版本不一致。')
    nextSteps.push('先刷新页面验证是否恢复，再确认部署资源和 HTML 入口版本是否一致。')
  }
  if (/is not a function/i.test(message)) {
    causes.push('代码把一个非函数值当成函数执行了，常见原因是导入错误或数据结构变化。')
    nextSteps.push('检查调用前的值类型，并确认导入符号与实际运行时产物一致。')
  }

  return {
    summary:
      incident.classification === 'promise_error'
        ? '这是一个未被接住的异步异常，说明现有 Promise 错误处理链路没有覆盖到这条分支。'
        : '这是一个运行时异常，问题更偏前端空值处理、依赖数据时序，或者静态资源一致性。',
    possibleCauses: causes.length
      ? causes
      : ['这次异常没有命中已知高频模式，建议优先查看首层堆栈、最近一次用户操作，以及出错前后的数据状态。'],
    evidence: [
      `当前路由：${incident.context.route}`,
      `错误信息：${message}`,
      `堆栈首层：${stackTop === 'No stack trace provided.' ? '当前没有拿到堆栈信息。' : stackTop}`,
      `最近业务上下文：${incident.context.customContext?.lastBusinessErrorName ? String(incident.context.customContext.lastBusinessErrorName) : incident.context.title}`,
    ],
    nextSteps: nextSteps.length
      ? nextSteps
      : ['从首层堆栈开始看，确认这个渲染或副作用链路依赖的数据是否完整。'],
  }
}

export function runHeuristics(
  incident: NormalizedIncident
): HeuristicResult {
  if (incident.classification === 'api_error') {
    return apiHeuristics(incident)
  }
  return runtimeHeuristics(incident)
}

export function augmentHeuristicWithSourceInspection(
  heuristic: HeuristicResult,
  inspection: SourceInspectionResult | null
): HeuristicResult {
  if (!inspection) {
    return heuristic
  }

  const nextSteps = [...heuristic.nextSteps]
  const evidence = [...heuristic.evidence]

  evidence.push(
    `源码定位：${inspection.relativePath}:${inspection.line}:${inspection.column}`
  )
  evidence.push(`命中代码：${inspection.lineText}`)

  nextSteps.unshift(
    `优先查看 ${inspection.relativePath} 第 ${inspection.line} 行附近，确认这里访问的对象在进入当前渲染路径前已经完成初始化。`
  )

  return {
    ...heuristic,
    evidence,
    nextSteps,
  }
}

export function augmentHeuristicWithCodeFix(
  heuristic: HeuristicResult,
  fixResult: CodeFixResult | null
): HeuristicResult {
  if (!fixResult) {
    return heuristic
  }

  const evidence = [...heuristic.evidence]
  const nextSteps = [...heuristic.nextSteps]

  if (fixResult.applied) {
    evidence.push(
      `已自动修复：${fixResult.relativePath}:${fixResult.line} 将 ${fixResult.beforeLineText} 改为 ${fixResult.afterLineText}`
    )
    nextSteps.unshift(
      `代码已自动修改，请刷新当前页面并重新走一遍复现路径，确认这个异常是否已经消失。`
    )
    return {
      ...heuristic,
      summary: `${heuristic.summary} 我已经根据本地源码定位结果自动修复了一处高置信度错误。`,
      evidence,
      nextSteps,
    }
  }

  evidence.push(
    `自动修复未执行：${fixResult.reason || '当前没有可安全应用的补丁。'}`
  )
  nextSteps.unshift(
    `当前没有安全自动修复，请先按建议检查源码，再决定是否人工改动。`
  )
  return {
    ...heuristic,
    evidence,
    nextSteps,
  }
}
