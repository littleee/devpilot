import fs from 'fs'
import path from 'path'
import {
  CodeFixResult,
  NormalizedIncident,
  SourceInspectionResult,
} from '../types'

const FIX_INTENT_RE =
  /(修复|自动修复|帮我改|帮我修|帮我修改|修改问题|修一下|改一下|处理一下|直接改|直接修|apply|fix|修改代码|改代码)/i

function splitLines(content: string): {
  lines: string[]
  newline: string
} {
  const newline = content.includes('\r\n') ? '\r\n' : '\n'
  return {
    lines: content.split(/\r?\n/),
    newline,
  }
}

export function hasFixIntent(
  incident: NormalizedIncident
): boolean {
  const lastQuestion = incident.conversation
    .filter((turn) => turn.role === 'user')
    .slice(-1)[0]?.content

  return Boolean(lastQuestion && FIX_INTENT_RE.test(lastQuestion))
}

export function attemptLocalCodeFix(
  incident: NormalizedIncident,
  inspection: SourceInspectionResult
): CodeFixResult | null {
  if (!hasFixIntent(incident)) {
    return null
  }

  const fileContent = fs.readFileSync(inspection.localPath, 'utf8')
  const { lines, newline } = splitLines(fileContent)
  const lineIndex = inspection.line - 1
  const originalLine = lines[lineIndex]

  if (typeof originalLine !== 'string') {
    return {
      applied: false,
      localPath: inspection.localPath,
      relativePath: inspection.relativePath,
      line: inspection.line,
      column: inspection.column,
      beforeLineText: inspection.lineText,
      reason: '目标源码行不存在，当前无法自动修复。',
    }
  }

  const brokenAccess = originalLine.match(
    /\bundefined\.([A-Z_$][A-Z0-9_$]*)\b/
  )
  if (!brokenAccess) {
    return {
      applied: false,
      localPath: inspection.localPath,
      relativePath: inspection.relativePath,
      line: inspection.line,
      column: inspection.column,
      beforeLineText: originalLine.trim(),
      reason:
        '当前自动修复只支持识别 undefined.<CONST> 这类高置信度错误模式。',
    }
  }

  const propertyName = brokenAccess[1]
  const namespacePattern = new RegExp(
    `\\b([A-Za-z_$][\\w$]*)\\.${propertyName}\\b`,
    'g'
  )
  const candidates = new Map<string, number>()

  lines.forEach((line, index) => {
    if (index === lineIndex) {
      return
    }
    let match: RegExpExecArray | null = null
    while ((match = namespacePattern.exec(line))) {
      const namespace = match[1]
      if (
        namespace === 'undefined' ||
        namespace === 'null' ||
        namespace === 'window'
      ) {
        continue
      }
      const distance = Math.abs(index - lineIndex)
      const existing = candidates.get(namespace)
      if (
        typeof existing !== 'number' ||
        distance < existing
      ) {
        candidates.set(namespace, distance)
      }
    }
  })

  const orderedCandidates = Array.from(candidates.entries()).sort(
    (left, right) => left[1] - right[1]
  )

  if (!orderedCandidates.length) {
    return {
      applied: false,
      localPath: inspection.localPath,
      relativePath: inspection.relativePath,
      line: inspection.line,
      column: inspection.column,
      beforeLineText: originalLine.trim(),
      reason: `没有在同文件中找到可用于替换 undefined.${propertyName} 的稳定命名空间，当前不安全自动改写。`,
    }
  }

  const [bestNamespace] = orderedCandidates[0]
  const replacement = `${bestNamespace}.${propertyName}`
  const nextLine = originalLine.replace(
    `undefined.${propertyName}`,
    replacement
  )

  if (nextLine === originalLine) {
    return {
      applied: false,
      localPath: inspection.localPath,
      relativePath: inspection.relativePath,
      line: inspection.line,
      column: inspection.column,
      beforeLineText: originalLine.trim(),
      reason: '当前行没有发生变化，自动修复未生效。',
    }
  }

  lines[lineIndex] = nextLine
  fs.writeFileSync(
    inspection.localPath,
    lines.join(newline),
    'utf8'
  )

  return {
    applied: true,
    localPath: inspection.localPath,
    relativePath: path.relative(
      process.cwd(),
      inspection.localPath
    ),
    line: inspection.line,
    column: inspection.column,
    beforeLineText: originalLine.trim(),
    afterLineText: nextLine.trim(),
    replacement,
  }
}
