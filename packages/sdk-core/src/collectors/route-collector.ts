export function attachRouteCollector(
  onRouteChange: () => void
): () => void {
  const originalPushState = window.history.pushState
  const originalReplaceState = window.history.replaceState

  const notify = () => {
    onRouteChange()
  }

  window.history.pushState = function pushState(...args) {
    const result = originalPushState.apply(this, args)
    notify()
    return result
  }

  window.history.replaceState = function replaceState(...args) {
    const result = originalReplaceState.apply(this, args)
    notify()
    return result
  }

  window.addEventListener('popstate', notify)
  window.addEventListener('hashchange', notify)

  return () => {
    window.history.pushState = originalPushState
    window.history.replaceState = originalReplaceState
    window.removeEventListener('popstate', notify)
    window.removeEventListener('hashchange', notify)
  }
}
