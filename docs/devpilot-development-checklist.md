# DevPilot 开发清单

基于 `agentation@3.0.2` 与 `@didi/devpilot` 的对比分析，结合当前仓库实现，整理出这份更适合排期和拆 issue 的开发清单。

## 目标

`DevPilot` 不应在“纯标注工具”层面与 `agentation` 做 feature-for-feature 竞争。

更合理的方向是：

`页面标注/稳定性问题 -> 页面上下文 enrich -> MCP 命中本地源码 -> AI 修复请求 -> 修复状态与验证结果回写`

一句话原则：

`Treat annotation as the entry point, not the product.`

## 优先级原则

- `P0`：直接影响宿主接入、AI 修复成功率、多人/多页协作稳定性。
- `P1`：明显提升产品闭环和交付质量，但可以建立在 P0 之上推进。
- `P2`：锦上添花，或者需要等核心工作流稳定后再做。
- `Not Now`：当前不建议追赶的方向，避免产品叙事被带偏。

---

## P0：必须优先做

### 1. 丰富标注与稳定性上下文

**目标**

让导出结果不再只是“DOM 路径 + 文案备注”，而是足够支撑 AI 做源码定位和修复推断的任务上下文。

**当前问题**

- 元素描述主要来自 `tag / role / text / 前两个 class`
- 缺少 `computed styles`、`nearby elements`、更完整的 selector 信息
- 缺少 `component/source hint`

**建议改动文件**

- `packages/devpilot/src/annotation/area-selection.ts`
- `packages/devpilot/src/types/common.ts`
- `packages/devpilot/src/output.ts`
- `packages/devpilot/src/stability-output.ts`

**建议新增字段**

- `cssClasses: string[]`
- `selectorCandidates: string[]`
- `nearbyElements: string[]`
- `computedStyleSnapshot`
- `elementBoundingBoxes`
- `componentHints`
- `sourceHints`

**验收标准**

- 新建 annotation 后，导出 JSON 能看到结构化上下文字段
- 同一条 annotation 的 Markdown 导出包含关键样式和上下文摘要
- area annotation 不只输出 `relatedElements` 文本，而能输出更可靠的候选元素信息

---

### 2. 宿主集成 API 升级

**目标**

让 `DevPilot` 更像一个可嵌入能力，而不是只能自己工作的页面工具条。

**当前问题**

当前公开 API 还比较少，宿主很难在 annotation/session/stability 生命周期里接入自己的逻辑。

**建议改动文件**

- `packages/devpilot/src/types/common.ts`
- `packages/devpilot/src/index.tsx`

**建议新增回调**

- `onAnnotationAdd`
- `onAnnotationUpdate`
- `onAnnotationDelete`
- `onStabilityObserved`
- `onStabilityStatusChange`
- `onSessionCreated`
- `onConnectionStateChange`

**验收标准**

- 宿主项目无需侵入内部状态，也能监听关键动作
- demo 中能通过这些回调打印出统一事件流

---

### 3. 同步一致性向服务端收口

**目标**

减少多页面、多 tab、多人协作场景下的状态复活和重复执行问题。

**当前问题**

- 前端已经做了很多合并和删除保护
- 但删除 tombstone、修复请求幂等、写入 ownership 仍不够服务端优先

**建议改动模块**

- `packages/devpilot/src/hooks/remote-session-sync.ts`
- `packages/devpilot-mcp/src/**`

**建议补的能力**

- annotation 删除 tombstone
- repair request 幂等保护
- clientId / actorId
- 服务端事件里明确写入 `who changed what`

**验收标准**

- A 页面删除 annotation，B 页面不会把它重新同步回来
- 同一 stability item 在多页面重复点击 `修复` 时不会创建多个 active request
- SSE 收到的事件可以明确是谁发起的变更

---

### 4. 包发布形态现代化

**目标**

提升在 Vite / Next / ESM 宿主里的接入稳定性。

**当前问题**

- 目前包导出仍偏单一
- 对现代 ESM 工具链不够友好

**建议改动文件**

- `packages/devpilot/package.json`
- `packages/devpilot/tsconfig.json`
- 构建脚本相关文件

**建议方向**

- 增加 `module`
- `exports` 同时支持 `import` / `require`
- 补 `sideEffects` 声明

**验收标准**

- 独立 Vite demo、Next demo 都能无额外 hack 地正常接入
- 不再出现 dev 模式直接引用 CJS 产物导致白屏的问题

---

## P1：建议紧接着做

### 5. 源码命中能力

**目标**

把“浏览器上选中了什么”更稳定地映射到“可能该改哪段源码”。

**建议改动模块**

- `packages/devpilot/src/annotation/**`
- `packages/devpilot/src/output.ts`
- `packages/devpilot-mcp/src/**`

**建议方向**

- 组件名 hint
- React fiber / devtools bridge 可选接入
- source map / sourceURL / data-* 线索提取
- 为 MCP 输出候选 source hits

**验收标准**

- Claude / Codex 读取任务包时，能看到“高概率命中的组件/文件候选”

---

### 6. 导出升级为 AI 任务包

**目标**

从“反馈摘要”升级成“可执行工程任务”。

**建议改动文件**

- `packages/devpilot/src/output.ts`
- `packages/devpilot/src/stability-output.ts`
- `packages/devpilot/src/types/repair.ts`

**建议方向**

- 明确区分 `page context / evidence / candidate source hits / desired outcome`
- 将 annotation 与 stability item 统一组织成 task packet
- 为 repair request 补充更完整的 schema

**验收标准**

- Claude CLI / MCP demo 中能直接用输出结果生成更稳定的修复任务
- 导出内容不再主要依赖自然语言说明

---

### 7. 区域吸附与多选体验继续打磨

**目标**

把 area selection 做到“够稳、够可解释、够接近用户直觉”。

**建议改动文件**

- `packages/devpilot/src/hooks/use-area-selection.ts`
- `packages/devpilot/src/annotation/area-selection.ts`
- `packages/devpilot/src/view.tsx`

**重点关注**

- 拖拽阈值与释放阈值
- 外层容器吸附策略
- 多块区域最小包围框
- 标记点跟随目标元素而不是屏幕坐标
- area annotation 的预览解释性

**验收标准**

- 复杂卡片/分组场景下，最终框选结果与用户预期一致
- 标记点在滚动后仍锚定目标元素

---

### 8. 设置面板升级为“诊断面板”

**目标**

让设置面板真正帮助调试，而不是只显示连接状态。

**建议改动文件**

- `packages/devpilot/src/ui/settings-panel.tsx`
- `packages/devpilot/src/view.tsx`

**建议加入**

- 当前模式
- MCP/SSE 最近一次连接时间
- 自动观察状态
- 最近一次采集事件摘要
- 导出格式偏好

**验收标准**

- 开发者能通过设置面板快速判断“为什么没有采集到问题 / 为什么没有同步”

---

## P2：值得做，但不抢主线

### 9. 动画冻结

**为什么值得做**

这项能力对精准标注、稳定性复现、复杂 hover/动效页面特别有帮助，而且比 drawing 更贴近“工程问题定位”。

**建议改动模块**

- `packages/devpilot/src/view.tsx`
- 可能新增 `packages/devpilot/src/observation/freeze.ts`

**验收标准**

- 一键暂停 CSS animation / transition / video / gif 类动态元素
- 关闭后可恢复页面状态

---

### 10. Webhook / 外部交付适配器

**为什么值得做**

适合企业集成，但不应取代 MCP 主线。

**建议改动模块**

- `packages/devpilot/src/types/common.ts`
- `packages/devpilot/src/sync/**`

**验收标准**

- 可以把 annotation / stability 事件推送到外部系统
- 和现有 MCP 模式并存，不互相耦合

---

### 11. 主题与视觉精修

**为什么放 P2**

它会提升完成度，但不会决定产品闭环是否成立。

**建议改动模块**

- `packages/devpilot/src/styles.css.ts`
- `packages/devpilot/src/ui/**`

**验收标准**

- 支持 light/dark 或宿主主题适配
- 工具条和面板在窄宽度下仍稳定

---

## Not Now：当前不建议追

### 1. Drawing / Wireframe / Placement / Rearrange

这些能力更偏 design tool，而不是“浏览器问题到代码修复”的工程闭环。

如果没有清晰证明它们能直接提升修复效率，暂时不建议投入。

### 2. 为了和 Agentation 对齐而扩展设置页

设置面板应该服务于：

- 连接诊断
- 自动观察
- 导出偏好
- 调试信息

而不是单纯复制别人的设置结构。

---

## 推荐排期

### Sprint 1

- P0-1 丰富上下文
- P0-2 宿主 API
- P0-4 包发布形态升级

### Sprint 2

- P0-3 同步一致性服务端收口
- P1-7 区域吸附与多选体验
- P1-8 设置面板诊断化

### Sprint 3

- P1-5 源码命中能力
- P1-6 AI 任务包
- P2-9 动画冻结

---

## 判断标准

如果一个功能满足下面任一条件，应优先做：

- 提高 AI 定位源码和生成修复的成功率
- 降低多页面/多人协作的不一致
- 提高宿主接入成功率
- 缩短“发现问题 -> 发起修复”的路径

如果一个功能主要只是让产品“更像 agentation”，但不直接提升上述目标，应延后。

---

## 最终结论

`DevPilot` 当前最有价值的战略，不是成为一个更全的视觉反馈工具，而是成为一个更强的前端工程副驾。

要保持的方向是：

`浏览器问题捕获 -> 上下文 enrich -> MCP/源码命中 -> AI 修复请求 -> 状态回写与验证`

标注是入口，但闭环才是产品。
