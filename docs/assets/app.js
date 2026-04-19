const messages = {
  en: {
    "nav.home": "Home",
    "nav.start": "Getting Started",
    "nav.mcp": "MCP Setup",
    "nav.release": "Announcement",
    "hero.title": "Turn browser issues into AI-ready frontend tasks.",
    "hero.subtitle":
      "DevPilot helps teams annotate real pages, capture runtime issues, and hand clean task packets to Claude, Codex, and connected MCP workflows.",
    "hero.ctaPrimary": "Read docs",
    "hero.ctaSecondary": "Set up MCP",
    "hero.ctaTertiary": "Beta release",
    "hero.card1Label": "Local workflow",
    "hero.card1Title": "Annotate -> Copy to AI",
    "hero.card1Body":
      "Use DevPilot on any real page, create annotations, then copy a structured task packet into Claude, Codex, Cursor, or another coding tool.",
    "hero.card2Label": "Connected workflow",
    "hero.card2Title": "Stability + MCP + repair flow",
    "hero.card2Body":
      "Add the MCP bridge when you want synchronized sessions, SSE updates, runtime issue capture, and AI repair orchestration.",
    "overview.eyebrow": "Overview",
    "overview.title": "One product, two practical modes.",
    "overview.body":
      "DevPilot is designed as a progressive workflow. Local mode works immediately. Connected mode adds collaboration and MCP-powered repair flows.",
    "features.annotationsTitle": "Page-native annotations",
    "features.annotationsBody":
      "Create element, text, and area annotations directly on real pages without switching tools or re-explaining UI context.",
    "features.handoffTitle": "AI-ready task packets",
    "features.handoffBody":
      "Copy rich task packets with selectors, grouped elements, nearby context, and source hints to improve AI diagnosis and fixes.",
    "features.stabilityTitle": "Optional Stability Copilot",
    "features.stabilityBody":
      "Capture runtime issues such as JS errors, failed requests, and rejected promises when you want a broader browser issue signal.",
    "features.mcpTitle": "MCP-connected workflows",
    "features.mcpBody":
      "Sync sessions, stream updates over SSE, and hand structured repair requests to Claude, Codex, and other compatible agents.",
    "packages.eyebrow": "Packages",
    "packages.title": "What to install",
    "packages.devpilotBody":
      "The browser package. Use it when you want page-native annotations, task packet export, and the local AI handoff workflow.",
    "packages.mcpBody":
      "The local bridge and MCP server. Use it when you want connected mode, SSE sync, stability persistence, and agent-side workflows.",
    "compare.eyebrow": "Compare modes",
    "compare.title": "Start local. Add connected mode when the workflow grows.",
    "compare.body":
      "DevPilot is intentionally progressive. The browser package already works on its own. MCP comes in when you want synchronized sessions, stability workflows, and AI repair orchestration.",
    "compare.localTitle": "Local mode",
    "compare.local1": "Element, text, and area annotations",
    "compare.local2": "Copy AI-ready task packets",
    "compare.local3": "Works immediately in a single page",
    "compare.local4": "Best for solo debugging and quick handoff",
    "compare.connectedTitle": "Connected mode",
    "compare.connected1": "Session sync and SSE updates",
    "compare.connected2": "Stability persistence and repair requests",
    "compare.connected3": "Claude / Codex / MCP agent workflows",
    "compare.connected4": "Best for repeatable browser-to-code flows",
    "audience.eyebrow": "Who it's for",
    "audience.title": "Built for teams that already live in the browser and code editor.",
    "audience.devTitle": "Frontend engineers",
    "audience.devBody":
      "Annotate a bug where it appears, then hand a concrete task packet to your coding assistant instead of rewriting page context by hand.",
    "audience.qaTitle": "QA, product, and design",
    "audience.qaBody":
      "Capture exactly which page area is wrong, then pass a cleaner issue description to the implementation team or AI workflow.",
    "audience.aiTitle": "AI-first workflows",
    "audience.aiBody":
      "Use DevPilot as the browser-side entry point, then connect MCP when you want synchronized sessions and repair orchestration.",
    "workflow.eyebrow": "Workflow",
    "workflow.title": "Typical flow",
    "workflow.step1Title": "Annotate the page",
    "workflow.step1Body":
      "Mark an element, select text, or box a region directly on the live page.",
    "workflow.step2Title": "Copy to AI",
    "workflow.step2Body":
      "Send a clean task packet to Claude, Codex, Cursor, or another coding assistant.",
    "workflow.step3Title": "Add connected mode when needed",
    "workflow.step3Body":
      "Use the MCP bridge for synchronized sessions, stability flows, and repair request orchestration.",
    "docs.eyebrow": "Docs",
    "docs.title": "Start here",
    "docs.startTitle": "Getting Started",
    "docs.startBody":
      "Install the package, mount DevPilot, and learn the local workflow.",
    "docs.mcpTitle": "MCP Setup",
    "docs.mcpBody":
      "Run the local bridge, understand port fallback, and connect DevPilot to Claude or Codex.",
    "docs.releaseTitle": "Release Announcement",
    "docs.releaseBody":
      "Use the bilingual release note for social posts, GitHub releases, and launch updates.",
    "faq.eyebrow": "FAQ",
    "faq.title": "Questions people usually ask before trying it.",
    "faq.q1": "Do I need MCP to use DevPilot?",
    "faq.a1":
      "No. The browser package works on its own. You can annotate pages and copy task packets without running the MCP bridge.",
    "faq.q2": "When should I add the MCP bridge?",
    "faq.a2":
      "Add MCP when you want session sync, SSE updates, Stability Copilot persistence, or structured repair request workflows with AI agents.",
    "faq.q3": "Does DevPilot automatically change my code?",
    "faq.a3":
      "No. DevPilot prepares browser context and task packets. Actual code changes still happen in your coding agent or editor workflow.",
    "faq.q4": "What makes this different from a normal feedback tool?",
    "faq.a4":
      "DevPilot is designed for browser-to-code execution. It focuses on turning real page issues into structured inputs that AI coding tools can act on.",
    "cta.eyebrow": "Try it",
    "cta.title": "Ready to test DevPilot on a real page?",
    "cta.body":
      "Start with the browser package, then add the MCP bridge when you want the connected workflow.",
    "cta.primary": "Open getting started",
    "cta.secondary": "Open MCP setup",
    "announce.eyebrow": "Announcement",
    "announce.title": "A bilingual launch note you can reuse.",
    "announce.subtitle":
      "This page is written for outbound sharing. You can reuse it for GitHub releases, social posts, internal updates, or beta invites.",
    "announce.tocZh": "Chinese",
    "announce.tocEn": "English",
    "announce.zhTitle": "Chinese launch copy",
    "announce.zhBody1": "DevPilot Beta is now available.",
    "announce.zhBody2":
      "DevPilot turns browser issues into AI-ready frontend tasks. This beta sharpens the product around a clearer main path: annotate issues on real pages, copy clean task packets into AI coding tools, optionally enable Stability Copilot, and connect Claude, Codex, and other agents through the MCP bridge.",
    "announce.zhItem1":
      "Richer AI handoff task packets with selectors, grouped context, and source hints.",
    "announce.zhItem2":
      "Optional Stability Copilot for runtime errors and failed requests.",
    "announce.zhItem3":
      "First public release of `@littleee/devpilot-mcp` as the local bridge and MCP server.",
    "announce.enTitle": "English launch copy",
    "announce.enBody1": "DevPilot Beta is now available.",
    "announce.enBody2":
      "DevPilot turns browser issues into AI-ready frontend tasks. This beta sharpens the product around a clearer main path: annotate issues on real pages, copy clean task packets into AI coding tools, optionally enable Stability Copilot, and connect Claude, Codex, and other agents through the MCP bridge.",
    "announce.enItem1":
      "Richer AI handoff task packets with selectors, grouped context, and source hints.",
    "announce.enItem2":
      "Optional Stability Copilot for runtime errors and failed requests.",
    "announce.enItem3":
      "First public release of `@littleee/devpilot-mcp` as the local bridge and MCP server.",
    "start.eyebrow": "Getting Started",
    "start.title": "Install DevPilot and use the local workflow.",
    "start.subtitle":
      "This guide covers the fastest path: install the browser package, mount DevPilot, annotate a page, and copy the task packet into an AI coding tool.",
    "start.tocInstall": "Install",
    "start.tocMount": "Mount",
    "start.tocWorkflow": "Workflow",
    "start.tocTips": "Tips",
    "start.installTitle": "1. Install the package",
    "start.installBody":
      "DevPilot is a React browser package. It works well as a local-mode tool even before you connect an MCP bridge.",
    "start.mountTitle": "2. Mount DevPilot",
    "start.mountBody":
      "You can mount DevPilot on the page directly. In local mode, the core workflow is already available without any extra backend.",
    "start.workflowTitle": "3. Use the local workflow",
    "start.workflow1":
      "Click an element, select text, or draw an area annotation.",
    "start.workflow2": "Describe the issue in plain language.",
    "start.workflow3": "Use Copy to AI to generate the task packet.",
    "start.workflow4":
      "Paste it into Claude, Codex, Cursor, or your preferred coding agent.",
    "start.tipsTitle": "4. Practical tips",
    "start.tip1":
      "Use element annotations when you want the AI to target a specific control.",
    "start.tip2":
      "Use area annotations when the issue spans multiple related elements.",
    "start.tip3":
      "Keep the problem statement short and concrete; the task packet already carries structural context.",
    "start.tip4":
      "Enable Stability Copilot only when you want runtime issue capture in addition to manual annotations.",
    "mcpDoc.eyebrow": "MCP Setup",
    "mcpDoc.title": "Run the bridge and connect DevPilot to AI agents.",
    "mcpDoc.subtitle":
      "Use the MCP bridge when you want synchronized sessions, SSE updates, stability persistence, and structured repair flows.",
    "mcpDoc.tocRun": "Run server",
    "mcpDoc.tocPorts": "Port behavior",
    "mcpDoc.tocConnect": "Connect DevPilot",
    "mcpDoc.tocAgents": "Connect agents",
    "mcpDoc.runTitle": "1. Start the MCP bridge",
    "mcpDoc.runBody":
      "This command starts the local HTTP bridge and the MCP server in one process.",
    "mcpDoc.portsTitle": "2. Understand port behavior",
    "mcpDoc.port1": "Default startup begins with port 5213.",
    "mcpDoc.port2":
      "If 5213 is occupied and you did not pass --port, DevPilot MCP automatically falls back to the next available port.",
    "mcpDoc.port3":
      "If you explicitly pass --port and it is occupied, the server stops with a clear error instead of silently switching ports.",
    "mcpDoc.connectTitle": "3. Connect DevPilot in the browser",
    "mcpDoc.connectBody":
      "In connected mode, DevPilot can sync sessions, send SSE updates, and route stability or repair workflows through the bridge.",
    "mcpDoc.agentsTitle": "4. Connect Claude, Codex, or another agent",
    "mcpDoc.agentsBody":
      "Point your coding agent to the DevPilot MCP server, then let it inspect sessions, read pending annotations, or work through repair requests.",
  },
  zh: {
    "nav.home": "首页",
    "nav.start": "快速开始",
    "nav.mcp": "MCP 配置",
    "nav.release": "发布文案",
    "hero.title": "把浏览器里的问题，变成 AI 可执行的前端任务。",
    "hero.subtitle":
      "DevPilot 帮团队在真实页面里标注问题、捕获运行时异常，并把干净的任务包交给 Claude、Codex 和接入 MCP 的工作流。",
    "hero.ctaPrimary": "阅读文档",
    "hero.ctaSecondary": "配置 MCP",
    "hero.ctaTertiary": "查看 Beta 发布",
    "hero.card1Label": "本地主流程",
    "hero.card1Title": "标注 -> 复制给 AI",
    "hero.card1Body":
      "在真实页面中使用 DevPilot 创建标注，然后把结构化任务包复制给 Claude、Codex、Cursor 或其他编码工具。",
    "hero.card2Label": "连接模式",
    "hero.card2Title": "稳定性 + MCP + 修复流",
    "hero.card2Body":
      "需要同步会话、SSE 更新、运行时问题捕获和 AI 修复编排时，再接入 MCP bridge。",
    "overview.eyebrow": "产品概览",
    "overview.title": "一个产品，两种实用模式。",
    "overview.body":
      "DevPilot 是渐进增强的工作流。本地模式开箱即用，连接模式再补上协作和 MCP 驱动的修复流程。",
    "features.annotationsTitle": "页面原生标注",
    "features.annotationsBody":
      "直接在真实页面里创建元素、文本和区域标注，不需要切换工具，也不需要重新解释 UI 上下文。",
    "features.handoffTitle": "AI 可读任务包",
    "features.handoffBody":
      "复制包含 selector、分组元素、附近上下文和源码线索的任务包，提升 AI 诊断和修复成功率。",
    "features.stabilityTitle": "可选稳定性副驾",
    "features.stabilityBody":
      "在需要更广浏览器信号时，自动捕获 JS 错误、请求失败和 Promise 拒绝。",
    "features.mcpTitle": "MCP 连接工作流",
    "features.mcpBody":
      "同步会话，通过 SSE 接收更新，并把结构化修复请求交给 Claude、Codex 和其他兼容 agent。",
    "packages.eyebrow": "安装包",
    "packages.title": "需要安装什么",
    "packages.devpilotBody":
      "浏览器侧主包。适合页面原生标注、任务包导出，以及本地 AI handoff 主流程。",
    "packages.mcpBody":
      "本地 bridge 与 MCP server。适合连接模式、SSE 同步、稳定性持久化和 agent 工作流。",
    "compare.eyebrow": "模式对比",
    "compare.title": "先用本地模式，工作流变复杂时再接连接模式。",
    "compare.body":
      "DevPilot 是刻意做成渐进增强的。浏览器包本身就能独立工作；只有在你需要同步会话、稳定性流程和 AI 修复编排时，才需要 MCP。",
    "compare.localTitle": "本地模式",
    "compare.local1": "元素、文本和区域标注",
    "compare.local2": "复制 AI 可读任务包",
    "compare.local3": "单页内即可立即使用",
    "compare.local4": "适合个人调试和快速 handoff",
    "compare.connectedTitle": "连接模式",
    "compare.connected1": "会话同步和 SSE 更新",
    "compare.connected2": "稳定性持久化和 repair request",
    "compare.connected3": "Claude / Codex / MCP agent 工作流",
    "compare.connected4": "适合可重复的浏览器到代码闭环",
    "audience.eyebrow": "适用人群",
    "audience.title": "适合已经长期工作在浏览器和编辑器之间的团队。",
    "audience.devTitle": "前端开发者",
    "audience.devBody":
      "在问题真实发生的位置直接标出来，然后把结构化任务包交给编码助手，而不是手工重新描述页面上下文。",
    "audience.qaTitle": "测试、产品和设计",
    "audience.qaBody":
      "准确指出页面哪里有问题，再把更清晰的问题输入交给实现团队或 AI 工作流。",
    "audience.aiTitle": "AI-first 工作流",
    "audience.aiBody":
      "先把 DevPilot 当成浏览器侧入口，再在需要同步会话和修复编排时接入 MCP。",
    "workflow.eyebrow": "工作流",
    "workflow.title": "典型路径",
    "workflow.step1Title": "先在页面中标注",
    "workflow.step1Body": "直接在真实页面里点元素、选文本或框选区域。",
    "workflow.step2Title": "再复制给 AI",
    "workflow.step2Body": "把干净的任务包交给 Claude、Codex、Cursor 或其他编码助手。",
    "workflow.step3Title": "需要时再接连接模式",
    "workflow.step3Body": "只有在需要同步会话、稳定性流程和修复请求时，再启用 MCP bridge。",
    "docs.eyebrow": "文档",
    "docs.title": "从这里开始",
    "docs.startTitle": "快速开始",
    "docs.startBody": "安装主包、挂载 DevPilot，并了解本地主流程。",
    "docs.mcpTitle": "MCP 配置",
    "docs.mcpBody": "运行本地 bridge，理解端口回退，并把 DevPilot 接到 Claude 或 Codex。",
    "docs.releaseTitle": "发布文案",
    "docs.releaseBody": "双语发布文案，可直接用于社媒、GitHub Release 和对外通知。",
    "faq.eyebrow": "常见问题",
    "faq.title": "用户在试用前通常会问的问题。",
    "faq.q1": "不用 MCP 能用 DevPilot 吗？",
    "faq.a1":
      "可以。浏览器主包本身就能独立工作。你不跑 MCP bridge，也可以直接标注页面并复制任务包。",
    "faq.q2": "什么时候才需要 MCP bridge？",
    "faq.a2":
      "当你需要会话同步、SSE 更新、稳定性持久化，或者要把 repair request 接到 AI agent 时，再启用 MCP。",
    "faq.q3": "DevPilot 会自动改代码吗？",
    "faq.a3":
      "不会。DevPilot 负责准备浏览器上下文和任务包；真正的代码修改仍然发生在你的 coding agent 或编辑器流程里。",
    "faq.q4": "它和普通反馈工具有什么不同？",
    "faq.a4":
      "DevPilot 不是纯反馈收集工具，它更强调浏览器到代码的执行闭环：把真实页面问题直接转成 AI 可以处理的结构化输入。",
    "cta.eyebrow": "立即试用",
    "cta.title": "准备好在真实页面里试一下 DevPilot 了吗？",
    "cta.body":
      "先从浏览器主包开始，等你需要连接工作流时再补上 MCP bridge。",
    "cta.primary": "打开快速开始",
    "cta.secondary": "打开 MCP 配置",
    "announce.eyebrow": "发布文案",
    "announce.title": "一份可直接复用的双语发布说明。",
    "announce.subtitle":
      "这页文案是为对外发布准备的，你可以直接拿去做 GitHub Release、社媒动态、内测邀请或团队同步。",
    "announce.tocZh": "中文",
    "announce.tocEn": "English",
    "announce.zhTitle": "中文发布文案",
    "announce.zhBody1": "DevPilot Beta 现已发布。",
    "announce.zhBody2":
      "DevPilot 是一个把浏览器问题转成 AI 可执行前端任务的产品。当前版本已经把核心体验收敛到一条更清晰的主路径：在真实页面里标注问题，一键复制 AI 可读任务包，按需开启稳定性副驾，并通过 MCP bridge 连接 Claude、Codex 等 agent。",
    "announce.zhItem1":
      "更强的 AI handoff task packet，带 selector、上下文、分组元素和源码线索。",
    "announce.zhItem2":
      "可选的 Stability Copilot，用于运行时错误与请求失败问题。",
    "announce.zhItem3":
      "首个公开的 `@littleee/devpilot-mcp` 包，作为本地 bridge 与 MCP server。",
    "announce.enTitle": "English launch copy",
    "announce.enBody1": "DevPilot Beta is now available.",
    "announce.enBody2":
      "DevPilot turns browser issues into AI-ready frontend tasks. This beta sharpens the product around a clearer main path: annotate issues on real pages, copy clean task packets into AI coding tools, optionally enable Stability Copilot, and connect Claude, Codex, and other agents through the MCP bridge.",
    "announce.enItem1":
      "Richer AI handoff task packets with selectors, grouped context, and source hints.",
    "announce.enItem2":
      "Optional Stability Copilot for runtime errors and failed requests.",
    "announce.enItem3":
      "First public release of `@littleee/devpilot-mcp` as the local bridge and MCP server.",
    "start.eyebrow": "快速开始",
    "start.title": "安装 DevPilot，并走通本地主流程。",
    "start.subtitle":
      "这份指南只覆盖最快路径：安装浏览器包、挂载 DevPilot、创建标注，然后把任务包复制给 AI 编码工具。",
    "start.tocInstall": "安装",
    "start.tocMount": "挂载",
    "start.tocWorkflow": "使用流程",
    "start.tocTips": "实践建议",
    "start.installTitle": "1. 安装主包",
    "start.installBody":
      "DevPilot 是一个 React 浏览器包。即使还没接 MCP bridge，本地模式也已经能独立工作。",
    "start.mountTitle": "2. 挂载 DevPilot",
    "start.mountBody":
      "你可以直接把 DevPilot 挂到页面上。本地模式不依赖额外后端，核心流程已经可用。",
    "start.workflowTitle": "3. 使用本地主流程",
    "start.workflow1": "点击元素、选中文本，或者框选区域。",
    "start.workflow2": "用自然语言描述问题。",
    "start.workflow3": "点击 Copy to AI 生成任务包。",
    "start.workflow4": "粘贴到 Claude、Codex、Cursor 或你常用的 coding agent。",
    "start.tipsTitle": "4. 实用建议",
    "start.tip1": "如果你想让 AI 盯住某个具体控件，优先用元素标注。",
    "start.tip2": "如果问题跨越多个相关元素，优先用区域标注。",
    "start.tip3": "问题描述尽量短而明确，因为任务包已经自带结构化上下文。",
    "start.tip4": "只有在需要运行时问题捕获时，再开启稳定性副驾。",
    "mcpDoc.eyebrow": "MCP 配置",
    "mcpDoc.title": "运行 bridge，并把 DevPilot 接到 AI agent。",
    "mcpDoc.subtitle":
      "当你需要同步会话、SSE 更新、稳定性持久化和结构化修复流时，再接入 MCP bridge。",
    "mcpDoc.tocRun": "启动服务",
    "mcpDoc.tocPorts": "端口行为",
    "mcpDoc.tocConnect": "连接 DevPilot",
    "mcpDoc.tocAgents": "连接 agent",
    "mcpDoc.runTitle": "1. 启动 MCP bridge",
    "mcpDoc.runBody": "这条命令会在一个进程里同时启动本地 HTTP bridge 和 MCP server。",
    "mcpDoc.portsTitle": "2. 理解端口行为",
    "mcpDoc.port1": "默认启动会从 5213 端口开始。",
    "mcpDoc.port2":
      "如果 5213 已被占用，且你没有显式传入 --port，DevPilot MCP 会自动回退到下一个可用端口。",
    "mcpDoc.port3":
      "如果你显式指定了 --port 且该端口被占用，服务会直接报清晰错误，而不是悄悄切换端口。",
    "mcpDoc.connectTitle": "3. 在浏览器里连接 DevPilot",
    "mcpDoc.connectBody":
      "连接模式下，DevPilot 可以同步会话、接收 SSE 更新，并通过 bridge 路由稳定性和修复工作流。",
    "mcpDoc.agentsTitle": "4. 连接 Claude、Codex 或其他 agent",
    "mcpDoc.agentsBody":
      "把你的 coding agent 指向 DevPilot MCP server，然后让它读取会话、查看待处理标注，或者推进 repair request。",
  },
};

function applyLanguage(language) {
  const dictionary = messages[language] ?? messages.en;
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) return;
    const value = dictionary[key];
    if (value) {
      node.textContent = value;
    }
  });

  document.getElementById("lang-zh")?.classList.toggle("active", language === "zh");
  document.getElementById("lang-en")?.classList.toggle("active", language === "en");
  localStorage.setItem("devpilot-docs-lang", language);
}

document.getElementById("lang-zh")?.addEventListener("click", () => applyLanguage("zh"));
document.getElementById("lang-en")?.addEventListener("click", () => applyLanguage("en"));

const browserLanguage = navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
const initialLanguage = localStorage.getItem("devpilot-docs-lang") || browserLanguage;
applyLanguage(initialLanguage);
