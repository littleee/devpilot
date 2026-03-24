import fs from 'fs'
import path from 'path'
import {
  NormalizedIncident,
  SourceInspectionResult,
} from '../types'

function workspaceRoot(): string {
  return path.resolve(process.cwd(), '..')
}

function appRoot(appId: string): string {
  return path.join(workspaceRoot(), 'apps', appId)
}

function parseRuntimeFrame(
  stackTop?: string
): { relativePath: string; line: number; column: number } | null {
  if (!stackTop) {
    return null
  }
  const match = stackTop.match(
    /\/src\/([^:\n?]+\.[jt]sx?)(?:\?[^:\n]*)?:(\d+):(\d+)/
  )
  if (!match) {
    return null
  }
  return {
    relativePath: match[1],
    line: Number(match[2]),
    column: Number(match[3]),
  }
}

function buildSnippet(
  lines: string[],
  line: number,
  radius = 3
): string {
  const start = Math.max(1, line - radius)
  const end = Math.min(lines.length, line + radius)
  const width = String(end).length
  const chunk: string[] = []

  for (let current = start; current <= end; current += 1) {
    const marker = current === line ? '>' : ' '
    const gutter = String(current).padStart(width, ' ')
    chunk.push(`${marker} ${gutter} | ${lines[current - 1] || ''}`)
  }

  return chunk.join('\n')
}

export function inspectLocalSource(
  incident: NormalizedIncident
): SourceInspectionResult | null {
  const frame = parseRuntimeFrame(incident.event.stackTop)
  if (!frame) {
    return null
  }

  const localPath = path.join(
    appRoot(incident.app.appId),
    'src',
    frame.relativePath
  )

  if (!fs.existsSync(localPath)) {
    return null
  }

  const content = fs.readFileSync(localPath, 'utf8')
  const lines = content.split(/\r?\n/)
  const lineText = lines[frame.line - 1] || ''

  return {
    localPath,
    relativePath: path.join('src', frame.relativePath),
    line: frame.line,
    column: frame.column,
    lineText: lineText.trim(),
    snippet: buildSnippet(lines, frame.line),
  }
}
