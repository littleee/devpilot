import type { DevPilotStabilitySeverity } from "../types";
import {
  normalizeObservationReason,
  trimObservationText,
} from "../shared/runtime";

export type DevPilotObservedStabilityInput = {
  fingerprint: string;
  title: string;
  severity: DevPilotStabilitySeverity;
  symptom: string;
  signals?: string;
  impact?: string;
  reproSteps?: string;
  fixGoal?: string;
};

export interface StartAutoObservationOptions {
  isWithinDevPilotTarget: (target: EventTarget | null) => boolean;
  recordObservedStabilityItem: (input: DevPilotObservedStabilityInput) => void;
  shouldIgnoreNetworkRequest?: (request: {
    source: "fetch" | "xhr";
    method: string;
    url: string;
    headers?: HeadersInit;
  }) => boolean;
}

function getHeaderValue(
  headers: HeadersInit | undefined,
  name: string,
): string | undefined {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    return headers.get(name) || undefined;
  }

  if (Array.isArray(headers)) {
    const match = headers.find(([key]) => key.toLowerCase() === name.toLowerCase());
    return match?.[1];
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name.toLowerCase()) {
      return value;
    }
  }

  return undefined;
}

export function startAutoObservation({
  isWithinDevPilotTarget,
  recordObservedStabilityItem,
  shouldIgnoreNetworkRequest,
}: StartAutoObservationOptions): () => void {
  const onWindowError = (event: ErrorEvent) => {
    const target = event.target;
    if (isWithinDevPilotTarget(target)) {
      return;
    }

    if (
      target instanceof HTMLScriptElement ||
      target instanceof HTMLLinkElement ||
      target instanceof HTMLImageElement
    ) {
      const resourceUrl =
        target instanceof HTMLLinkElement
          ? target.href
          : target instanceof HTMLImageElement
            ? target.currentSrc || target.src
            : target.src;
      const tagName = target.tagName.toLowerCase();
      recordObservedStabilityItem({
        fingerprint: `resource:${tagName}:${resourceUrl}`,
        title: "资源加载失败",
        severity: "medium",
        symptom: `${tagName} 资源加载失败${resourceUrl ? `: ${resourceUrl}` : ""}`,
        signals: [`source=resource-error`, resourceUrl ? `url=${resourceUrl}` : ""]
          .filter(Boolean)
          .join("\n"),
        impact: "页面可能出现空白、样式异常或功能缺失。",
        fixGoal: "检查资源地址、构建产物和静态资源发布链路。",
      });
      return;
    }

    const message = trimObservationText(
      event.message || normalizeObservationReason(event.error) || "Unknown runtime error",
      360,
    );
    recordObservedStabilityItem({
      fingerprint: `window-error:${event.filename || "inline"}:${event.lineno}:${event.colno}:${message}`,
      title: "JS 运行时异常",
      severity: "high",
      symptom: message,
      signals: [
        "source=window.onerror",
        event.filename ? `file=${event.filename}` : "",
        event.lineno ? `line=${event.lineno}` : "",
        event.colno ? `column=${event.colno}` : "",
        event.error instanceof Error && event.error.stack ? `stack=${event.error.stack}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      impact: "页面交互可能中断、组件渲染异常，或导致用户流程无法继续。",
      fixGoal: "定位报错根因，补充防御并恢复页面主流程。",
    });
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = trimObservationText(normalizeObservationReason(event.reason), 360);
    recordObservedStabilityItem({
      fingerprint: `unhandled-rejection:${reason}`,
      title: "Promise 未处理拒绝",
      severity: "high",
      symptom: reason,
      signals: [
        "source=unhandledrejection",
        event.reason instanceof Error && event.reason.stack ? `stack=${event.reason.stack}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      impact: "异步流程可能提前中断，造成数据未加载、按钮无响应或状态不一致。",
      fixGoal: "定位异步失败点，补充错误处理和用户可恢复路径。",
    });
  };

  const originalFetch =
    typeof window.fetch === "function" ? window.fetch.bind(window) : null;

  if (originalFetch) {
    window.fetch = (async (...args) => {
      const [input, init] = args;
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input instanceof Request
              ? input.url
              : String(input);
      const method =
        init?.method || (input instanceof Request ? input.method : "GET");
      const headers =
        init?.headers || (input instanceof Request ? input.headers : undefined);

      if (shouldIgnoreNetworkRequest?.({
        source: "fetch",
        method: String(method || "GET"),
        url,
        headers,
      })) {
        return originalFetch(...args);
      }

      try {
        const response = await originalFetch(...args);
        if (response.status >= 500) {
          recordObservedStabilityItem({
            fingerprint: `fetch:${method}:${url}:${response.status}`,
            title: "Fetch 接口异常",
            severity: "medium",
            symptom: `${method.toUpperCase()} ${url} 返回 ${response.status}`,
            signals: [
              "source=fetch",
              `status=${response.status}`,
              response.statusText ? `statusText=${response.statusText}` : "",
              `url=${url}`,
            ]
              .filter(Boolean)
              .join("\n"),
            impact: "页面数据可能无法加载，导致局部功能不可用或交互状态异常。",
            fixGoal: "排查接口失败原因，并补充前端降级与错误提示。",
          });
        }
        return response;
      } catch (error) {
        recordObservedStabilityItem({
          fingerprint: `fetch-network:${method}:${url}:${normalizeObservationReason(error)}`,
          title: "Fetch 网络失败",
          severity: "high",
          symptom: `${method.toUpperCase()} ${url} 请求失败：${trimObservationText(normalizeObservationReason(error), 220)}`,
          signals: [
            "source=fetch",
            `url=${url}`,
            `error=${normalizeObservationReason(error)}`,
          ].join("\n"),
          impact: "页面主流程可能直接失败，用户无法完成查询、提交或加载操作。",
          fixGoal: "定位网络失败原因，并确保前端在失败场景下能正确兜底。",
        });
        throw error;
      }
    }) as typeof window.fetch;
  }

  const xhrPrototype =
    typeof XMLHttpRequest !== "undefined" ? XMLHttpRequest.prototype : null;
  const originalXhrOpen = xhrPrototype?.open;
  const originalXhrSend = xhrPrototype?.send;
  const xhrMeta = new WeakMap<XMLHttpRequest, { method: string; url: string }>();

  if (xhrPrototype && originalXhrOpen && originalXhrSend) {
    xhrPrototype.open = function patchedOpen(
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      xhrMeta.set(this, {
        method: String(method || "GET"),
        url: typeof url === "string" ? url : url.toString(),
      });
      return (originalXhrOpen as (...args: unknown[]) => void).call(
        this,
        method,
        url,
        ...rest,
      );
    };

    xhrPrototype.send = function patchedSend(
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null,
    ) {
      const meta = xhrMeta.get(this);
      const method = meta?.method || "GET";
      const url = meta?.url || window.location.href;
      const shouldIgnore = shouldIgnoreNetworkRequest?.({
        source: "xhr",
        method,
        url,
      });

      if (shouldIgnore) {
        return originalXhrSend.call(this, body);
      }

      const cleanup = () => {
        this.removeEventListener("loadend", onLoadEnd);
        this.removeEventListener("error", onFailure);
        this.removeEventListener("timeout", onFailure);
        this.removeEventListener("abort", onFailure);
      };

      const onLoadEnd = () => {
        cleanup();
        if (this.status >= 500) {
          recordObservedStabilityItem({
            fingerprint: `xhr:${method}:${url}:${this.status}`,
            title: "XHR 接口异常",
            severity: "medium",
            symptom: `${method.toUpperCase()} ${url} 返回 ${this.status}`,
            signals: [
              "source=xhr",
              `status=${this.status}`,
              this.statusText ? `statusText=${this.statusText}` : "",
              `url=${url}`,
            ]
              .filter(Boolean)
              .join("\n"),
            impact: "页面数据或提交流程可能失败，导致局部功能不可用。",
            fixGoal: "排查接口失败原因，并补充前端错误态与重试策略。",
          });
        }
      };

      const onFailure = () => {
        cleanup();
        recordObservedStabilityItem({
          fingerprint: `xhr-network:${method}:${url}:${this.readyState}`,
          title: "XHR 网络失败",
          severity: "high",
          symptom: `${method.toUpperCase()} ${url} 请求失败或被中断`,
          signals: [
            "source=xhr",
            `readyState=${this.readyState}`,
            `status=${this.status}`,
            `url=${url}`,
          ].join("\n"),
          impact: "接口调用失败会直接影响查询、保存或页面初始化流程。",
          fixGoal: "定位失败链路，并保证异常场景下的前端可恢复性。",
        });
      };

      this.addEventListener("loadend", onLoadEnd);
      this.addEventListener("error", onFailure);
      this.addEventListener("timeout", onFailure);
      this.addEventListener("abort", onFailure);

      return originalXhrSend.call(this, body);
    };
  }

  window.addEventListener("error", onWindowError, true);
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  return () => {
    window.removeEventListener("error", onWindowError, true);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);

    if (originalFetch) {
      window.fetch = originalFetch;
    }

    if (xhrPrototype && originalXhrOpen && originalXhrSend) {
      xhrPrototype.open = originalXhrOpen;
      xhrPrototype.send = originalXhrSend;
    }
  };
}

export function isDevPilotClientRequest(
  headers: HeadersInit | undefined,
): boolean {
  return Boolean(getHeaderValue(headers, "X-DevPilot-Client-Id"));
}
