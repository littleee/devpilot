# DevPilot

**[English](README.md) | 中文**

`@didi/devpilot` 是一个页面原生的前端副驾工具，能把浏览器里发生的事情变成可执行的前端工程任务。

长期目标是打造一条完整工作流，能够：

- 在真实页面上直接标注 UI
- 捕获 JavaScript 和稳定性问题，并附带页面上下文
- 通过 MCP 将浏览器观察结果连接到本地代码
- 把结构化任务交给 AI 工具进行辅助或自动化修复

今天，这个仓库已经交付了这条工作流第一个实用的基础：一个叫 `DevPilot` 的浏览器原生工具条。

## 目前已有的能力

当前 `v0.2.0 beta` 功能：

- 通过 Shadow DOM host 挂载的浮动页面内工具条
- 直接在真实页面上创建元素、文本和区域标注
- 本地标注状态与轻量级状态追踪
- **一键"复制给 AI"**：将标注和稳定性问题导出为统一的任务包
- **稳定性副驾**（默认关闭；通过设置面板开关开启）
- 提供 endpoint 时可选的 MCP 同步
- 连接断开指示器（设置图标上的红点）

当前产品形态刻意保持简单：

```text
标注 -> 复制给 AI -> 粘贴到 Claude / Codex / Cursor
```

### 如何使用

1. **悬停并点击**页面上的任意元素来添加标注
2. **选中文本**然后点击工具条来捕获文本相关问题
3. **按住 Shift + 拖拽**来创建区域标注（用于分组元素）
4. 点击工具条中的 **复制给 AI** 按钮（或创建标注后按下）
5. 将结构化 Markdown 粘贴到你的 AI 工具中

> **提示：** 在设置面板中启用"稳定性副驾"，即可自动捕获 JS 错误、未处理的 Promise 拒绝和失败的网络请求。

### 复制的内容

点击 **复制给 AI** 会生成一份 `devpilot.task-packet/v2` Markdown 文档，包含：

- 页面上下文（标题、URL、视口）
- 结构化摘要（问题数量、source hit 数量）
- Agent brief（intent、priority、constraints、acceptance criteria、output contract）
- 按推断页面区域分组的标注（Header、Main Content、Sidebar 等）
- 每条标注包含：元素路径、DOM 深度、CSS 类、组件提示、源码线索
- 稳定性问题（如果稳定性副驾已启用且存在问题）

<details>
<summary>示例输出预览</summary>

```markdown
# DevPilot Task Packet
**Schema:** devpilot.task-packet/v2

## Page Context
**Page:** My App
**URL:** http://localhost:3000/dashboard
**Viewport:** 1440x900

## Agent Brief
**Intent:** ui-fix
**Priority:** medium

## Task
**Type:** annotation
**Title:** Fix 3 annotations on /dashboard

## Evidence: Annotations (3)

### Main Content (2)
#### 1. button.btn-primary
- **Path:** `main > div.card > button.btn-primary`
- **DOM Depth:** 3
- **Comment:** Button color does not match design spec

### Header (1)
#### 3. nav.navbar
- **Path:** `body > header > nav.navbar`
- **DOM Depth:** 2
- **Comment:** Logo is misaligned on mobile
```

</details>

这让 DevPilot 即使在更广泛的连接式修复工作流完成之前，也能作为一个轻量级的页面反馈和 AI 交接层发挥作用。

## 未来方向

DevPilot 正在朝着更广泛的前端事件与修复工作流演进：

- 基于 MCP 的工作空间链接，从浏览器上下文关联到本地源文件
- 运行时错误、请求失败和事件分组的稳定性观察
- 更丰富的连接式工作流历史，包含 AI 回复和代码操作
- AI 辅助的、最终自动化的特定类别问题修复循环

## 安装包

已发布的 npm 包：

```bash
npm install @didi/devpilot
```

目前该包导出了 `DevPilot` 挂载 API 和 UI 组件。

## 产品模式

DevPilot 是一个产品，两种使用模式：

- `本地模式`
  - 直接在页面上标注
  - 捕获结构化的浏览器上下文
  - 复制任务包到 Claude、Codex、Cursor 或类似工具
- `连接模式`
  - 通过 MCP 将浏览器会话连接到本地工程工作流
  - 可选同步运行时问题和修复请求
  - 支持协作式或 AI 辅助的修复循环

大多数用户应该能够在没有任何后端设置的情况下，从本地模式开始。

## 快速开始

零配置挂载（仅本地模式 —— 不需要后端）：

```ts
import { mountDevPilot } from "@didi/devpilot";

mountDevPilot();
```

React：

```tsx
import { DevPilot } from "@didi/devpilot";

export function App() {
  return (
    <>
      <YourApp />
      <DevPilot />
    </>
  );
}
```

**启用连接模式**（MCP 同步 + 稳定性副驾）：

```ts
mountDevPilot({
  endpoint: "http://127.0.0.1:5213",
  features: {
    mcp: true,
    stability: true,
  },
});
```

> 连接模式还需要在本地运行 [`@didi/devpilot-mcp`](./packages/devpilot-mcp) bridge。

## 连接模式下的 Agent 工作流

当 `@didi/devpilot-mcp` 正在运行时，Claude、Codex 或其他兼容 MCP 的 agent 可以直接拿到和本地复制流程一致的标准化 brief。

推荐顺序：

1. 用 `npx -y @didi/devpilot-mcp server` 启动本地 bridge
2. 把你的 coding agent 连接到 DevPilot MCP server
3. 优先调用 `devpilot_auto_discover_workspaces` 自动发现本地项目根目录；只有需要修正时再用 `devpilot_register_workspace`
4. 调用 `devpilot_list_sessions` 找到当前活跃浏览器会话
5. 调用 `devpilot_get_session_task_packet` 获取 agent-ready 的 `devpilot.task-packet/v2`
6. 读取返回结果里的 `workflow.recommendedMode`、`workflow.nextTools` 和 `workflow.sessionPrompt`
7. 如果你想拿到完整的官方工作模式说明，再调用 `devpilot_get_agent_playbook`
8. 用 `packet.resolvedSources`、`packet.agent.primaryTargets`、`packet.agent.acceptanceCriteria` 和 `packet.sourceHits` 来定位和修复问题
9. 用 `devpilot_reply`、`devpilot_resolve` 或 `devpilot_complete_repair_request` 把处理状态回写

如果你希望 agent 直接从结构化 brief 开始工作，而不是手动拼接原始 session 数据，`devpilot_get_session_task_packet` 仍然是最短路径，但它现在还会额外返回推荐 workflow mode 和下一步应该调用的 MCP tools。`devpilot_get_agent_playbook` 则会给出完整的官方 `critique`、`self-driving` 和 `watch` 模式，包括默认 prompt 模板和 tool 顺序。发现或注册 workspace 后，DevPilot 会返回已经验证过的本地文件、行号和列号；在 stack 比较弱的时候，还会结合页面 route 做额外的源码映射。

远端同步现在保持显式开启。只传 `endpoint` 不会自动启用 MCP sync；如果你希望浏览器侧真的连接本地 bridge，需要同时设置 `features.mcp: true`。

## 工作空间

当前工作空间内容：

- `packages/devpilot`：已发布的浏览器工具条包，即 `@didi/devpilot`

## 开发

- 需要 Node.js 20 或更高版本
- 使用 `npm install` 安装依赖
- 使用 `npm run build` 构建
- 使用 `npm run check` 进行类型检查

## License

MIT. See [LICENSE](/LICENSE).
