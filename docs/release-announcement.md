# DevPilot Public Beta Announcement

## 中文

DevPilot Beta 现已发布。

DevPilot 是一个把浏览器问题转成 AI 可执行前端任务的产品。当前版本已经把核心体验收敛到一条更清晰的主路径：

- 在真实页面里标注问题
- 一键复制 AI 可读任务包
- 按需开启稳定性副驾
- 通过 MCP bridge 连接 Claude、Codex 等 agent

这一版的重要变化包括：

- 更强的 AI handoff task packet，带 selector、上下文、分组元素和源码线索
- 可选的 Stability Copilot，用于运行时错误与请求失败问题
- 首个公开的 `@littleee/devpilot-mcp` 包，作为本地 bridge 与 MCP server
- 更清晰的设置结构与更稳定的连接体验

适合谁现在开始用：

- 前端开发者
- 想把页面问题直接交给 AI 修的个人和团队
- 想要把浏览器反馈接入 Claude / Codex 工作流的团队

相关链接：

- npm: `@littleee/devpilot`
- npm: `@littleee/devpilot-mcp`
- GitHub: `littleee/devpilot`

## English

DevPilot Beta is now available.

DevPilot turns browser issues into AI-ready frontend tasks. This beta sharpens the product around a clearer main path:

- annotate issues on real pages
- copy clean task packets into AI coding tools
- optionally enable Stability Copilot
- connect Claude, Codex, and other agents through the MCP bridge

Highlights in this release:

- richer AI handoff task packets with selectors, grouped context, and source hints
- optional Stability Copilot for runtime errors and failed requests
- first public release of `@littleee/devpilot-mcp` as the local bridge and MCP server
- cleaner settings structure and more reliable connected-mode behavior

This beta is a good fit for:

- frontend engineers
- teams that want to hand browser issues directly to AI coding agents
- workflows that connect browser context to Claude, Codex, or other MCP-compatible tools

Related links:

- npm: `@littleee/devpilot`
- npm: `@littleee/devpilot-mcp`
- GitHub: `littleee/devpilot`
