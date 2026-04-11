# DevPilot

`@littleee/devpilot` is the published package for the DevPilot browser workflow.

Today, the package primarily exposes `DevPilot`: a page-native annotation toolbar for collecting UI feedback and exporting it as structured context for AI-assisted code changes.

Over time, DevPilot is intended to grow beyond annotation into MCP-powered code navigation, stability observation, and AI-assisted repair loops.

## Install

```bash
npm install @littleee/devpilot
```

`react` and `react-dom` are required peer dependencies.

## What You Get Today

- floating in-page toolbar
- element, text, and area annotations
- local session panel with annotation status tracking
- structured export for AI coding workflows

## Zero-config Mount

```ts
import { mountDevPilot } from "@littleee/devpilot";

mountDevPilot();
```

## Optional Mount Options

```ts
mountDevPilot({
  defaultOpen: false,
});
```

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

`@littleee/devpilot` currently focuses on page annotation and structured feedback capture. MCP integration, runtime stability workflows, and automated remediation are planned next steps rather than shipped behavior in `0.1.0`.
