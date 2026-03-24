import {
  CopilotConfig,
  CopilotController,
  DiagnosticEvent,
} from '../../sdk-core/src'
import {
  renderCopilotMarkup,
  WidgetUiState,
  widgetStyles,
} from './render'

interface WidgetRuntime {
  controller: CopilotController
  host: HTMLElement
  shadow: ShadowRoot
  unsubscribe: () => void
}

let runtime: WidgetRuntime | undefined
let uiState: WidgetUiState = {
  activeTab: 'overview',
  contextCollapsed: false,
}

function resolveMount(mount?: HTMLElement | string): HTMLElement {
  if (mount instanceof HTMLElement) {
    return mount
  }
  if (typeof mount === 'string') {
    const node = document.querySelector<HTMLElement>(mount)
    if (node) {
      return node
    }
  }
  return document.body
}

function ensureRuntime(config: CopilotConfig): WidgetRuntime {
  if (runtime) {
    if (!runtime.host.isConnected) {
      resolveMount(config.mount).appendChild(runtime.host)
    }
    return runtime
  }
  const controller = new CopilotController(config)
  const host = document.createElement('div')
  host.setAttribute('data-stability-copilot', 'true')
  const shadow = host.attachShadow({ mode: 'open' })
  resolveMount(config.mount).appendChild(host)

  const render = () => {
    const state = controller.getState()
    shadow.innerHTML = `<style>${widgetStyles}</style>${renderCopilotMarkup(state, uiState)}`

    const openButton = shadow.querySelector<HTMLElement>(
      '[data-action="toggle-fab"]'
    )
    const closeButton = shadow.querySelector<HTMLElement>(
      '[data-action="toggle-close"]'
    )
    const incidentButtons = shadow.querySelectorAll<HTMLElement>(
      '[data-action="select-incident"]'
    )
    const askForm = shadow.querySelector<HTMLFormElement>(
      '[data-action="ask"]'
    )
    const tabButtons = shadow.querySelectorAll<HTMLElement>(
      '[data-action="switch-tab"]'
    )
    const contextToggle = shadow.querySelector<HTMLElement>(
      '[data-action="toggle-context"]'
    )

    openButton?.addEventListener('click', () => {
      if (controller.getState().isOpen) {
        controller.close()
      } else {
        controller.open()
      }
    })
    closeButton?.addEventListener('click', () => {
      controller.close()
    })
    incidentButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.incidentId
        if (id) {
          controller.selectIncident(id)
        }
      })
    })
    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab
        if (tab === 'overview' || tab === 'chat') {
          uiState = {
            ...uiState,
            activeTab: tab,
          }
          render()
        }
      })
    })
    contextToggle?.addEventListener('click', () => {
      uiState = {
        ...uiState,
        contextCollapsed: !uiState.contextCollapsed,
      }
      render()
    })
    askForm?.addEventListener('submit', (event) => {
      event.preventDefault()
      const formData = new FormData(askForm)
      const question = String(formData.get('question') || '')
      const selectedId = controller.getState().selectedIncidentId
      if (selectedId) {
        void controller.followUp(selectedId, question)
        askForm.reset()
      }
    })
    const askTextarea = askForm?.querySelector<HTMLTextAreaElement>(
      'textarea[name="question"]'
    )
    askTextarea?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        askForm?.requestSubmit()
      }
    })
  }

  const unsubscribe = controller.subscribe(() => {
    render()
  })
  controller.start()
  render()

  runtime = {
    controller,
    host,
    shadow,
    unsubscribe,
  }
  return runtime
}

export function initCopilot(config: CopilotConfig): CopilotController {
  return ensureRuntime(config).controller
}

export function destroyCopilot(): void {
  if (!runtime) {
    return
  }
  runtime.unsubscribe()
  runtime.controller.destroy()
  runtime.host.remove()
  runtime = undefined
  uiState = {
    activeTab: 'overview',
    contextCollapsed: false,
  }
}

export function openCopilot(): void {
  runtime?.controller.open()
}

export function closeCopilot(): void {
  runtime?.controller.close()
}

export function reportCustomEvent(
  event: Pick<DiagnosticEvent, 'title' | 'message'> &
    Partial<DiagnosticEvent>
): void {
  runtime?.controller.reportCustomEvent(event)
}

export { renderCopilotMarkup }
