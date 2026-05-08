# @littleee/devpilot-mcp

`@littleee/devpilot-mcp` 是 `DevPilot` 的本地 bridge 与 MCP 服务包。

**只在「连接模式」时才需要安装。** 如果你只用 DevPilot 的标注和「复制给AI」功能，不需要装这个包。

它会同时提供两层能力：

- 本地 HTTP bridge，供浏览器侧 `DevPilot` 同步 session / annotation / thread
- MCP stdio server，供 Claude / Cursor 等 AI agent 读取和回写标注状态

在当前版本里，`devpilot-mcp` 也负责：

- stability item 的持久化与查询
- repair request 的显式流转
- SSE 事件流，让 agent 可以 watch 新 annotation / stability / repair request

## 安装

```bash
npm install @littleee/devpilot-mcp
```

## 启动

```bash
npx -y @littleee/devpilot-mcp server
```

默认会优先使用 `5213` 端口；如果这个端口已被占用，会自动尝试下一个可用端口。  
如果你显式传了 `--port`，则会固定使用该端口，并在端口冲突时给出清晰报错。

也可以只启动 MCP stdio，并指向一个已存在的 HTTP bridge：

```bash
npx -y @littleee/devpilot-mcp server --mcp-only --http-url http://localhost:5213
```

如果你希望把本地 bridge 常驻运行，再让不同 agent 单独连接，也可以只启动 HTTP：

```bash
npx -y @littleee/devpilot-mcp server --http-only --port 5213
```

或者先全局安装再直接运行：

```bash
npm install -g @littleee/devpilot-mcp
devpilot-mcp server
```

> **前置要求：** `better-sqlite3` 依赖原生 C++ 模块。如果你在安装时遇到编译错误，请确保系统已安装 Python 和 C++ 编译工具（macOS 上运行 `xcode-select --install`，Windows 上安装 Visual Studio Build Tools）。

## 在 Claude CLI 里注册

推荐优先使用 Claude CLI 来注册，不要手动猜配置文件路径。最稳的全局注册方式是：

```bash
claude mcp add --scope user devpilot-mcp -- npx -y @littleee/devpilot-mcp server --mcp-only --http-url http://127.0.0.1:5213
```

这条命令的含义是：

- `--scope user`：把 `devpilot-mcp` 注册成 Claude 的全局 MCP
- `npx -y @littleee/devpilot-mcp ...`：不需要先全局安装 npm 包
- `--mcp-only --http-url ...`：Claude 只启动 MCP stdio，并连接你已经跑起来的本地 HTTP bridge

如果你想移除这条全局注册：

```bash
claude mcp remove --scope user devpilot-mcp
```

> Claude 会把这条配置写入自己的全局配置中；具体文件位置可能因 Claude 版本或平台而不同，所以更推荐用 `claude mcp add` / `claude mcp remove` 管理。

## 手动添加 Claude MCP 配置

如果你更喜欢手动维护 Claude 的 MCP 配置，也可以添加：

```json
{
  "mcpServers": {
    "devpilot": {
      "command": "npx",
      "args": ["-y", "@littleee/devpilot-mcp", "server"]
    }
  }
}
```

这条配置的含义是：

- Claude 会通过 `npx` 在需要时启动 `@littleee/devpilot-mcp`
- `server` 会同时启动本地 HTTP bridge 和 stdio MCP server
- 默认会优先使用 `5213` 端口；如果端口被占用且你没有显式传 `--port`，会自动回退到下一个可用端口

如果你想固定端口：

```json
{
  "mcpServers": {
    "devpilot": {
      "command": "npx",
      "args": ["-y", "@littleee/devpilot-mcp", "server", "--port", "5213"]
    }
  }
}
```

如果你已经单独启动了 HTTP bridge，改成只启动 MCP stdio：

```json
{
  "mcpServers": {
    "devpilot": {
      "command": "npx",
      "args": ["-y", "@littleee/devpilot-mcp", "server", "--mcp-only", "--http-url", "http://127.0.0.1:5213"]
    }
  }
}
```

配置完成后重启 Claude Code，输入 `/mcp` 或直接问“你有什么工具”来验证即可。

## 浏览器接入

在业务页面里把 `DevPilot` 挂到同一个本地 bridge：

```ts
import { mountDevPilot } from "@littleee/devpilot";

mountDevPilot({
  endpoint: "http://localhost:5213",
  features: {
    mcp: true,
    stability: true,
  },
});
```

## 当前 HTTP API

- `GET /health`
- `POST /sessions/ensure`
- `GET /sessions`
- `GET /sessions/:id`
- `GET /sessions/:id/pending`
- `POST /sessions/:id/annotations`
- `GET /sessions/:id/stability`
- `GET /sessions/:id/stability/open`
- `POST /sessions/:id/stability`
- `GET /sessions/:id/repair-requests`
- `GET /sessions/:id/repair-requests/open`
- `POST /sessions/:id/repair-requests`
- `GET /pending`
- `GET /stability/open`
- `GET /repair-requests/open`
- `GET /events`
- `GET /sessions/:id/events`
- `GET /annotations/:id`
- `PATCH /annotations/:id`
- `DELETE /annotations/:id`
- `POST /annotations/:id/thread`
- `GET /stability/:id`
- `PATCH /stability/:id`
- `DELETE /stability/:id`
- `GET /repair-requests/:id`
- `PATCH /repair-requests/:id`

## 当前 MCP Tools

- `devpilot_register_workspace`
- `devpilot_list_workspaces`
- `devpilot_auto_discover_workspaces`
- `devpilot_list_sessions`
- `devpilot_get_session`
- `devpilot_get_session_task_packet`
- `devpilot_get_agent_playbook`
- `devpilot_get_pending`
- `devpilot_get_all_pending`
- `devpilot_list_stability_items`
- `devpilot_get_session_stability_items`
- `devpilot_get_stability_item`
- `devpilot_acknowledge`
- `devpilot_resolve`
- `devpilot_dismiss`
- `devpilot_reply`
- `devpilot_diagnose_stability_item`
- `devpilot_resolve_stability_item`
- `devpilot_watch_annotations`
- `devpilot_watch_stability_items`
- `devpilot_list_repair_requests`
- `devpilot_get_repair_request`
- `devpilot_resolve_annotation_source`
- `devpilot_resolve_stability_source`
- `devpilot_get_source_snippet`
- `devpilot_accept_repair_request`
- `devpilot_complete_repair_request`
- `devpilot_dismiss_repair_request`
- `devpilot_watch_repair_requests`

## 官方 Agent Playbook

`devpilot-mcp` 现在内置了三种官方 workflow mode：

- `critique`
  - 先诊断、定位和回复，不直接改代码
  - 适合 source resolution 还弱、问题风险高、或你只想先拿诊断结论
- `self-driving`
  - 直接定位、改代码、验证、回复、再 resolve
  - 适合 repair request 明确、目标文件清晰、并且任务范围足够收敛
- `watch`
  - 持续 watch 新 annotation / stability / repair request，再把每一批分流到 `critique` 或 `self-driving`
  - 适合你想把 Claude / Codex 当成常驻 intake agent

推荐的最短路径现在是：

1. 优先用 `devpilot_auto_discover_workspaces` 自动发现本地项目根目录
2. 如有需要，再用 `devpilot_register_workspace` 手工补充或修正 workspace
3. `devpilot_get_session_task_packet`
4. 读取返回里的 `workflow.recommendedMode`、`workflow.nextTools` 和 `workflow.sessionPrompt`
5. 如需完整的官方模式说明，再调用 `devpilot_get_agent_playbook`
6. 按模式继续：
   - `critique`：`acknowledge/diagnose -> resolve source -> snippet -> reply`
   - `self-driving`：`accept/acknowledge -> resolve source -> snippet -> edit -> reply -> resolve/complete`
   - `watch`：`watch_* -> get_session_task_packet -> branch to critique/self-driving`

`devpilot_get_session_task_packet` 现在除了返回 `devpilot.task-packet/v2` 之外，还会额外返回 `workflow`：

- `recommendedMode`
- `reasons`
- `nextTools`
- `completionTools`
- `sessionPrompt`

而 `devpilot_get_agent_playbook` 会返回结构化的官方 playbook：

- mode summary
- useWhen / avoidWhen
- decisionRules / escalationRules
- ordered `toolSequence`
- default `system` / `task` prompt templates

所以 agent 不只拿到一份 task packet，也能拿到一套“官方建议应该怎么处理这类 packet”的执行手册。

如果没有显式注册 workspace，`devpilot_get_session_task_packet` 和 `devpilot_get_agent_playbook` 也都会尝试从当前工作目录向上自动发现 workspace，并结合页面 route 与 runtime stack 做更强的源码映射。
