import { LastActionSummary } from '../types'

function isCopilotEventTarget(event: MouseEvent): boolean {
  const path =
    typeof event.composedPath === 'function'
      ? event.composedPath()
      : []
  return path.some((node) => {
    return (
      node instanceof HTMLElement &&
      node.dataset.stabilityCopilot === 'true'
    )
  })
}

export function attachInteractionCollector(
  onAction: (action: LastActionSummary) => void
): () => void {
  const handler = (event: MouseEvent) => {
    if (isCopilotEventTarget(event)) {
      return
    }
    const target = event.target as HTMLElement | null
    if (!target) {
      return
    }
    const text = (target.textContent || target.getAttribute('aria-label') || '').trim()
    onAction({
      text: text.slice(0, 80) || '[no text]',
      tag: target.tagName.toLowerCase(),
      role: target.getAttribute('role') || undefined,
      timestamp: Date.now(),
    })
  }

  document.addEventListener('click', handler, true)
  return () => {
    document.removeEventListener('click', handler, true)
  }
}

export { isCopilotEventTarget }
