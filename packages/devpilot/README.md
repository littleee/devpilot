# DevPilot

`@littleee/devpilot` is the published package for the DevPilot browser workflow.

Today, the package exposes `DevPilot`: a page-native toolbar for collecting UI feedback in the browser and exporting it as structured context for AI-assisted code changes.

Over time, DevPilot is intended to grow beyond annotation into MCP-powered code navigation, stability observation, and AI-assisted repair loops.

## Install

```bash
npm install @littleee/devpilot
```

`react` and `react-dom` are required peer dependencies.

## What You Get Today

- floating in-page toolbar
- element, text, and area annotations
- structured task-packet export for AI coding workflows
- optional Stability Copilot for runtime errors and failed requests
- explicit repair request flow instead of automatic code modification
- optional MCP sync when both an `endpoint` and `features.mcp: true` are provided

## Main Flow

The current local-first flow is intentionally simple:

```text
Annotate -> Copy to AI -> Diagnose / Fix
```

You do not need MCP to get value from the package. In local mode, DevPilot can already:

- record issues directly on the page
- package page context into an AI-friendly task packet
- support copy-and-paste handoff into Claude, Codex, Cursor, and similar tools

## Zero-config Mount

```ts
import { mountDevPilot } from "@littleee/devpilot";

mountDevPilot();
```

## Annotation Modes

DevPilot supports three ways to select and annotate UI elements:

| Mode | How | Best For |
|---|---|---|
| **Element** | Hover and click any element | Single-component issues |
| **Text** | Select text on the page, then click the toolbar | Copy / content issues |
| **Area** | Hold **Shift** and drag a rectangle | Grouped elements or layout regions |

After selecting, type your description and press **Cmd/Ctrl + Enter** (or click **Add**) to save. The annotation appears as a numbered marker on the page. Click any marker to edit or delete it.

## Optional Mount Options

```ts
mountDevPilot({
  defaultOpen: false,
});
```

## Feature Flags

`DevPilot` is designed as a composable product surface:

- **Core annotation**: enabled by default
- **Stability Copilot**: opt-in. Can be toggled at any time via the settings panel switch
- **MCP sync**: opt-in. Requires both `features.mcp: true` and an `endpoint`

```ts
mountDevPilot({
  features: {
    mcp: true,
  },
  endpoint: "http://127.0.0.1:5213",
});
```

> `features.stability: true` only sets the initial state. The user can still turn Stability Copilot on or off in the settings panel at runtime. All state is persisted in `localStorage`.
>
> Passing an `endpoint` alone no longer enables remote sync. This avoids local-only installs accidentally reporting bridge connection errors as page issues.

When `mcp` is enabled and an endpoint is provided, DevPilot syncs annotations and stability items to the local bridge. Repairs are created only when the user explicitly triggers them. DevPilot does not automatically modify code.

## Product Modes

`@littleee/devpilot` supports two practical modes:

- `Local mode`
  - annotation and AI handoff only
  - no remote sync required
- `Connected mode`
  - MCP-backed sync for collaborative or agent-driven workflows
  - optional runtime issue capture and repair-request flow

## React

```tsx
import { DevPilot } from "@littleee/devpilot";

export function App() {
  return (
    <>
      <YourApp />
      <DevPilot />
    </>
  );
}
```

## Vue

```ts
import { createApp } from "vue";
import { mountDevPilot } from "@littleee/devpilot";
import App from "./App.vue";

createApp(App).mount("#app");
mountDevPilot();
```

## Current Scope

`@littleee/devpilot` is meant to stay useful even before the full connected workflow is enabled:

- `Core`: page annotation and AI handoff
- `Core + Stability`: issue capture, observation, and explicit repair requests
- `Core + MCP`: remote session sync for connected workflows
- `Core + Stability + MCP`: collaborative repair loops with Claude / Cursor

DevPilot does not automatically modify code after annotation or observation. Repairs are created only when the user explicitly clicks `修复`.
