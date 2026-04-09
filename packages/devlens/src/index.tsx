import React, { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";

import { createDevLensStyleElement, DevLensShell } from "./view";
import type { DevLensController, DevLensMountOptions } from "./types";

const HOST_ATTR = "data-devlens-host";

function createMountHost(): { host: HTMLDivElement; rootContainer: HTMLDivElement } {
  const host = document.createElement("div");
  host.setAttribute(HOST_ATTR, "true");

  const shadowRoot = host.attachShadow({ mode: "open" });
  shadowRoot.appendChild(createDevLensStyleElement());

  const rootContainer = document.createElement("div");
  shadowRoot.appendChild(rootContainer);

  document.body.appendChild(host);
  return { host, rootContainer };
}

export function mountDevLens(options: DevLensMountOptions = {}): DevLensController {
  if (typeof document === "undefined") {
    return {
      destroy() {
        // no-op
      },
    };
  }

  const existing = document.querySelector(`[${HOST_ATTR}]`);
  if (existing instanceof HTMLElement) {
    existing.remove();
  }

  const { host, rootContainer } = createMountHost();
  const root: Root = createRoot(rootContainer);
  root.render(<DevLensShell {...options} />);

  return {
    destroy() {
      root.unmount();
      host.remove();
    },
  };
}

export function DevLens(props: DevLensMountOptions): null {
  useEffect(() => {
    const controller = mountDevLens(props);
    return () => controller.destroy();
  }, [props.defaultOpen, props.endpoint]);

  return null;
}

export {
  createDevLensExportPayload,
  formatDevLensExportJson,
  formatDevLensExportMarkdown,
  getAnnotationKind,
} from "./output";
export type { DevLensAnnotation, DevLensController, DevLensMode, DevLensMountOptions } from "./types";
export type {
  DevLensExportAnnotation,
  DevLensExportPageContext,
  DevLensExportPayload,
  DevLensExportSummary,
} from "./output";
