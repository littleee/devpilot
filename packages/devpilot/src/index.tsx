import React, { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";

import { createDevPilotStyleElement, DevPilotShell } from "./view";
import type { DevPilotController, DevPilotMountOptions } from "./types";

const HOST_ATTR = "data-devpilot-host";

function createMountHost(): { host: HTMLDivElement; rootContainer: HTMLDivElement } {
  const host = document.createElement("div");
  host.setAttribute(HOST_ATTR, "true");

  const shadowRoot = host.attachShadow({ mode: "open" });
  shadowRoot.appendChild(createDevPilotStyleElement());

  const rootContainer = document.createElement("div");
  shadowRoot.appendChild(rootContainer);

  document.body.appendChild(host);
  return { host, rootContainer };
}

export function mountDevPilot(options: DevPilotMountOptions = {}): DevPilotController {
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
  root.render(<DevPilotShell {...options} />);

  return {
    destroy() {
      root.unmount();
      host.remove();
    },
  };
}

export function DevPilot(props: DevPilotMountOptions): null {
  useEffect(() => {
    const controller = mountDevPilot(props);
    return () => controller.destroy();
  }, [
    props.defaultOpen,
    props.endpoint,
    props.features?.stability,
    props.features?.mcp,
    props.locale,
    props.onAnnotationAdd,
    props.onAnnotationUpdate,
    props.onAnnotationDelete,
    props.onStabilityObserved,
    props.onStabilityStatusChange,
    props.onSessionCreated,
    props.onConnectionStateChange,
    props.onRepairRequest,
  ]);

  return null;
}

export {
  createDevPilotExportPayload,
  formatDevPilotExportJson,
  formatDevPilotExportMarkdown,
  getAnnotationKind,
} from "./output";
export {
  createDevPilotStabilityExportPayload,
  formatDevPilotStabilityExportJson,
  formatDevPilotStabilityExportMarkdown,
  createDevPilotStabilityRepairPayload,
  formatDevPilotStabilityRepairMarkdown,
} from "./stability-output";
export {
  createDevPilotTaskPacket,
  formatDevPilotTaskPacketJson,
  formatDevPilotTaskPacketMarkdown,
} from "./task-packet";
export type {
  DevPilotAgentChangeScope,
  DevPilotAgentExecutionMode,
  DevPilotAgentIntent,
  DevPilotAgentPriority,
  DevPilotTaskPacket,
  DevPilotTaskPacketAgentBrief,
  DevPilotTaskPacketEvidence,
  DevPilotTaskPacketPageContext,
  DevPilotTaskPacketSummary,
  DevPilotTaskPacketTask,
} from "./task-packet";
export type {
  DevPilotAnnotation,
  DevPilotController,
  DevPilotFeatureFlags,
  DevPilotMode,
  DevPilotMountOptions,
  DevPilotRepairRequest,
  ResolvedDevPilotFeatureFlags,
} from "./types";
export type {
  DevPilotExportAnnotation,
  DevPilotExportPageContext,
  DevPilotExportPayload,
  DevPilotExportSummary,
} from "./output";
export type {
  DevPilotStabilityContextSnapshot,
  DevPilotRepairRequestRecord,
  DevPilotRepairRequestStatus,
  DevPilotStabilityItem,
  DevPilotStabilitySeverity,
  DevPilotStabilityStatus,
} from "./types";
export type {
  DevPilotStabilityExportItem,
  DevPilotStabilityExportPageContext,
  DevPilotStabilityExportPayload,
  DevPilotStabilityExportSummary,
  DevPilotStabilityRepairPayload,
} from "./stability-output";
