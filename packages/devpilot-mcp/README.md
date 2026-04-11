# @littleee/devpilot-mcp

`@littleee/devpilot-mcp` 是 `DevPilot` 的本地 bridge 与 MCP 服务包。

它会同时提供两层能力：

- 本地 HTTP bridge，供浏览器侧 `DevPilot` 同步 session / annotation / thread
- MCP stdio server，供 Claude / Cursor 等 AI agent 读取和回写标注状态

## 安装

```bash
npm install @littleee/devpilot-mcp
```

## 启动

```bash
npx @littleee/devpilot-mcp server --port 5213
```

也可以只启动 MCP stdio，并指向一个已存在的 HTTP bridge：

```bash
npx @littleee/devpilot-mcp server --mcp-only --http-url http://localhost:5213
```

## 浏览器接入

在业务页面里把 `DevPilot` 挂到同一个本地 bridge：

```ts
import { mountDevPilot } from "@littleee/devpilot";

mountDevPilot({
  endpoint: "http://localhost:5213",
});
```

## 当前 HTTP API

- `GET /health`
- `POST /sessions/ensure`
- `GET /sessions`
- `GET /sessions/:id`
- `GET /sessions/:id/pending`
- `POST /sessions/:id/annotations`
- `GET /pending`
- `GET /events`
- `GET /sessions/:id/events`
- `GET /annotations/:id`
- `PATCH /annotations/:id`
- `DELETE /annotations/:id`
- `POST /annotations/:id/thread`

## 当前 MCP Tools

- `devpilot_list_sessions`
- `devpilot_get_session`
- `devpilot_get_pending`
- `devpilot_get_all_pending`
- `devpilot_acknowledge`
- `devpilot_resolve`
- `devpilot_dismiss`
- `devpilot_reply`
- `devpilot_watch_annotations`
