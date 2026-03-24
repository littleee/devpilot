# 稳定性副驾迁移到 AG-UI 改造方案

## 1. 结论

当前稳定性副驾最初不是 AG-UI 标准实现，但当前仓库内这版已经完成了协议层迁移，前后端运行时直接使用 AG-UI 事件流。

当前实现的本质是：
- 自定义 SSE 协议
- 自定义前端 client
- 自定义消息与状态模型
- AG-UI 风格的产品形态

可以认为当前状态是：
- UI 层：自定义 widget，但已消费 AG-UI 事件
- 协议层：已切到 AG-UI
- 状态层：已切到 `STATE_SNAPSHOT`
- 生命周期层：已切到 `RUN_*`
- 工具调用层：尚未建设

但当前实现已经具备迁移到 AG-UI 的良好基础，尤其是：
- 已有清晰的“诊断概览 / 分析对话”分层
- 已有流式诊断服务
- 已有事件采集和上下文拼装逻辑
- 已有稳定的 Darwin 接入样板

## 2. 迁移目标

目标不是重做整个副驾，而是以最小成本迁移到 AG-UI：

1. 保留现有副驾产品形态
2. 保留 Darwin 侧采集逻辑
3. 将后端诊断流改造成 AG-UI 标准事件流
4. 将前端消息和状态处理迁移到 AG-UI client
5. 为未来工具调用能力预留标准扩展位

## 3. 当前实现与 AG-UI 对照表

| 维度 | 当前实现 | AG-UI 标准实现 | 迁移改造点 |
|---|---|---|---|
| 协议定位 | 自定义稳定性副驾协议 | Agent 与 UI 间的标准事件协议 | 后端输出改为 AG-UI BaseEvent |
| 传输方式 | `POST /v1/diagnose/stream` + SSE | HTTP / WebSocket 均可，重点是事件格式标准化 | 可保留 SSE，只改事件体 |
| 前端 client | 自定义 `streamDiagnostic()` | `@ag-ui/client` | 替换 client 层 |
| 消息模型 | `conversation[]` 自管 | AG-UI 标准 message history | 对话区迁移到 AG-UI 消息层 |
| 状态模型 | `IncidentAnalysis` 自管 | `STATE_SNAPSHOT` / `STATE_DELTA` | 概览区迁移到 AG-UI 状态层 |
| 生命周期 | `metadata` / `done` / `error` | `RUN_STARTED` / `RUN_FINISHED` / `RUN_ERROR` | 后端运行态标准化 |
| 工具调用 | 无标准 tool 生命周期 | `TOOL_CALL_*` | 后续扩展查日志/查 trace/改代码 |
| UI 层 | 自定义 widget | 不强制 UI 长相 | UI 可保留，先改数据驱动层 |

## 4. 当前事件到 AG-UI 的映射

| 当前事件/概念 | 当前含义 | AG-UI 推荐映射 | 备注 |
|---|---|---|---|
| `metadata: diagnostic-started:*` | 启动一次诊断流 | `RUN_STARTED` + 可选 `CUSTOM` | 来源信息如 `llm` / `fallback` 建议放 state 或 custom |
| `assistant_reply` | 聊天回复 | `TEXT_MESSAGE_CHUNK` 或相关消息事件 | 最适合直接迁到消息流 |
| `summary` | 结论摘要 | `STATE_SNAPSHOT` / `STATE_DELTA.diagnosis.summary` | 概览应属于 state |
| `possible_cause` | 可能原因列表 | `STATE_SNAPSHOT` / `STATE_DELTA.diagnosis.possibleCauses` | 不建议保留自定义事件 |
| `evidence` | 诊断依据列表 | `STATE_SNAPSHOT` / `STATE_DELTA.diagnosis.evidence` | 同上 |
| `next_step` | 排查步骤列表 | `STATE_SNAPSHOT` / `STATE_DELTA.diagnosis.nextSteps` | 同上 |
| `missing_context` | 缺失上下文列表 | `STATE_SNAPSHOT` / `STATE_DELTA.diagnosis.missingContext` | 同上 |
| `confidence` | 置信度 | `STATE_SNAPSHOT` / `STATE_DELTA.diagnosis.confidence` | UI 可不展示，状态可保留 |
| `done` | 诊断结束 | `RUN_FINISHED` | 生命周期标准化 |
| `error` | 流式诊断失败 | `RUN_ERROR` | 生命周期标准化 |
| `conversation[]` | 用户和副驾对话历史 | AG-UI message history | 前端不再自己拼 message state |
| `IncidentAnalysis` | 诊断概览 | AG-UI state 中的 `diagnosis` 节点 | 供概览页消费 |
| `reportCustomEvent()` | Darwin 业务异常上报 | 保留，映射为 `CUSTOM` 或标准 state 输入 | 采集入口可以不动 |

## 5. 推荐的 AG-UI 状态模型

建议将结构化诊断统一收口到 state 中：

```json
{
  "incident": {
    "id": "js_xxx",
    "kind": "js_error",
    "message": "Uncaught TypeError: Cannot read properties of undefined (reading 'ONLINE')",
    "route": "/darwin/relationship/list",
    "count": 3
  },
  "diagnosis": {
    "status": "done",
    "source": "llm",
    "summary": "RelationshipList 组件渲染时访问了未定义对象的 ONLINE 属性。",
    "possibleCauses": [],
    "evidence": [],
    "nextSteps": [],
    "missingContext": []
  }
}
```

推荐边界：
- `诊断概览` = state
- `分析对话` = message
- `tab` / `contextCollapsed` / 弹窗开关 = 本地 widget UI state

## 6. 分层改造方案

### 6.1 后端层

涉及文件：
- `apps/diagnostic-agent/src/index.ts`
- `apps/diagnostic-agent/src/server/sse.ts`

目标：
- 不再输出当前自定义事件名
- 改为输出 AG-UI `BaseEvent`
- 聊天回复走消息事件
- 诊断概览走 state 事件
- 运行开始/结束/失败使用标准 lifecycle 事件

建议：
1. 保留 heuristics 和 llm 逻辑
2. 先替换输出协议
3. 先不要同时重写前端 UI

### 6.2 前端 client 层

涉及文件：
- `packages/sdk-core/src/client/agent-client.ts`

目标：
- 替换自定义 SSE 解析
- 接入 `@ag-ui/client`
- 让事件解析和消息状态处理由 AG-UI client 驱动

建议：
1. 先保留 transport
2. 先换 event parsing
3. 再换消息消费逻辑

### 6.3 前端状态层

涉及文件：
- `packages/sdk-core/src/controller.ts`
- `packages/sdk-core/src/types.ts`

目标：
- `conversation` 迁到 AG-UI message history
- `IncidentAnalysis` 迁到 AG-UI state
- 自动诊断与追问共用同一 run/message/state 模型

### 6.4 UI 层

涉及文件：
- `packages/widget/src/render.ts`
- `packages/widget/src/index.ts`

目标：
- UI 形态可保留
- 改成消费 AG-UI 的 messages 和 state

原则：
- 先不重做界面
- 先切换数据驱动层

## 7. 推荐实施顺序

### Phase 1：协议兼容

目标：后端先说 AG-UI 的语言

工作项：
- 引入 AG-UI core 类型
- 重写 SSE 输出为 AG-UI 标准事件
- 暂时保留旧前端
- 写一个临时 adapter，把 AG-UI event 翻译回旧 UI 所需结构

交付结果：
- 后端已经是 AG-UI 协议
- 现有 UI 不回退

### Phase 2：前端消息层迁移

目标：分析对话改用 AG-UI 消息模型

工作项：
- 接入 `@ag-ui/client`
- 替换 `streamDiagnostic()`
- 聊天区改消费 AG-UI messages

交付结果：
- 聊天区已经脱离自定义消息协议

### Phase 3：前端状态层迁移

目标：诊断概览改用 AG-UI state

工作项：
- `summary/possibleCauses/evidence/nextSteps` 改从 `STATE_SNAPSHOT` / `STATE_DELTA` 读取
- 精简 `controller.ts` 中的自定义状态拼装逻辑

交付结果：
- 概览区已使用 AG-UI 标准 state

### Phase 4：工具调用扩展

目标：发挥 AG-UI 在 agent/tool 场景下的真正价值

潜在能力：
- 查 trace
- 查接口响应
- 查稳定性平台
- 查日志
- 代码修复建议
- Patch 预览 + 人工确认

## 8. 还缺哪一步

从当前实现走到“真正 AG-UI 副驾”，还缺这些关键步骤：

1. 协议标准化  
当前最核心缺口，必须先做。

2. client 替换  
当前前端还是自定义 stream parser。

3. 消息与状态彻底分治  
产品层面已经开始分层，但数据模型还没彻底迁到 AG-UI 语义。

4. lifecycle 标准化  
缺少标准 run/step 生命周期事件。

5. tool call 标准化  
目前副驾还主要是“诊断 + 回答”，没有标准工具执行流。

## 9. 风险与注意事项

1. 不建议一口气重写 UI  
建议先迁协议和状态，再迁 UI 消费层。

2. 不建议继续把结构化诊断作为聊天消息输出  
摘要、依据、步骤应始终视为 state，而不是 message。

3. 不建议把改代码做成普通聊天回复  
如果以后支持代码修改，应使用 tool call + patch preview + 人工确认。

4. Darwin 当前通过外部源码直连副驾  
迁移过程中要留意 Vite 对外部 workspace 的热更新与依赖解析。

## 10. 当前进度

已完成：

- [x] 后端输出 `RUN_STARTED / MESSAGES_SNAPSHOT / STATE_SNAPSHOT / TEXT_MESSAGE_* / RUN_FINISHED`
- [x] 后端异常输出 `RUN_ERROR`
- [x] 前端 runtime 直接消费 AG-UI 事件，不再依赖自定义事件协议
- [x] 前端 `streamDiagnostic()` 已切到官方 `@ag-ui/client` 的 `HttpAgent`
- [x] 诊断概览从 `STATE_SNAPSHOT` 读取
- [x] 分析对话从 `MESSAGES_SNAPSHOT + TEXT_MESSAGE_*` 读取
- [x] `STATE_DELTA` 已落地
- [x] `STEP_*` 生命周期已落地
- [x] `TOOL_CALL_*` 生命周期已落地

剩余主要工作：

- [ ] 把 `TOOL_CALL_*` 真正接到查 trace / 查日志 / 改代码等外部能力
- [ ] 为 `STEP / TOOL_CALL` 设计对应的前端展示

## 11. 下一步建议

下一步建议先做工具调用扩展，也就是：

1. 定义 `trace lookup` 的 tool call 协议
2. 定义 `log lookup` 的 tool call 协议
3. 定义 `patch preview` 的 tool call 协议
4. 保持 UI 不变，先把 tool 生命周期跑通
5. 后续再接官方 client 包做最后一层收口

这是当前最值得继续推进的一步。

## 12. 任务拆分清单

- [x] 定义 `diagnosis` 对应的 AG-UI state schema
- [x] 定义 `assistant_reply` 到 AG-UI message 事件的映射
- [x] 定义 `metadata/done/error` 到 AG-UI lifecycle 的映射
- [x] 改造 `apps/diagnostic-agent/src/server/sse.ts`
- [x] 前端 runtime 改为直接消费 AG-UI event
- [ ] 定义 `TOOL_CALL_*` 对应的 trace/log/code 修复工具协议
- [ ] 在 Darwin 验证自动诊断与继续追问不回退
- [ ] 再考虑替换前端 client 为 `@ag-ui/client`

## 12. 参考资料

- AG-UI Introduction
- AG-UI Architecture
- AG-UI State Management
- AG-UI JS Core Overview
- AG-UI Events
