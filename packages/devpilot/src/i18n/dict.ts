export type DevPilotLocale = "zh-CN" | "en-US";

export interface TranslationDict {
  // Toolbar
  "toolbar.dragHandle": string;
  "toolbar.copyToAI": string;
  "toolbar.copied": string;
  "toolbar.settings": string;
  "toolbar.connectionLost": string;
  "toolbar.collapse": string;
  "toolbar.openDevPilot": string;

  // Annotation popup
  "popup.editAnnotation": string;
  "popup.addAreaAnnotation": string;
  "popup.addAnnotation": string;
  "popup.keyboardHint": string;
  "popup.selectedArea": string;
  "popup.elementCount": string;
  "popup.currentElement": string;
  "popup.placeholderArea": string;
  "popup.placeholderElement": string;
  "popup.cancel": string;
  "popup.delete": string;
  "popup.save": string;
  "popup.add": string;

  // Area selection
  "area.elements": string;
  "area.pendingArea": string;
  "area.pending": string;

  // Settings panel
  "settings.title": string;
  "settings.close": string;
  "settings.preferences": string;
  "settings.language": string;
  "settings.language.zhCN": string;
  "settings.language.enUS": string;
  "settings.features": string;
  "settings.stabilityCopilot": string;
  "settings.stabilityTooltip": string;
  "settings.connection": string;
  "settings.mcp": string;
  "settings.localMode": string;
  "settings.connected": string;
  "settings.disconnected": string;
  "settings.endpoint": string;
  "settings.notConfigured": string;
  "settings.session": string;
  "settings.notEstablished": string;

  // Stability panel
  "stability.title": string;
  "stability.close": string;
  "stability.watching": string;
  "stability.lastCaptured": string;
  "stability.openIssues": string;
  "stability.issue": string;
  "stability.issues": string;
  "stability.noIssues": string;
  "stability.watchingDescription": string;
  "stability.new": string;
  "stability.observed": string;
  "stability.page": string;
  "stability.copy": string;
  "stability.technicalDetails": string;
  "stability.collapse": string;
  "stability.expand": string;
  "stability.observedSymptom": string;
  "stability.signals": string;
  "stability.path": string;
  "stability.url": string;
  "stability.viewport": string;
  "stability.captured": string;
  "stability.issueFetch": string;
  "stability.issuePromise": string;
  "stability.issueError": string;
  "stability.issueGeneric": string;
  "stability.justNow": string;
  "stability.minutesAgo": string;
  "stability.hoursAgo": string;
  "stability.daysAgo": string;

  // Session panel
  "session.title": string;
  "session.subtitle": string;
  "session.copyTooltip": string;
  "session.copied": string;
  "session.copyFailed": string;
  "session.copyCurrent": string;
  "session.close": string;
  "session.open": string;
  "session.acknowledged": string;
  "session.total": string;
  "session.pending": string;
  "session.emptyNoAnnotations": string;
  "session.emptyNoPending": string;
  "session.detailTitle": string;
  "session.detailNote": string;
  "session.currentAnnotation": string;
  "session.selectedText": string;
  "session.elementContext": string;
  "session.elementSummary": string;
  "session.status": string;
  "session.elementPath": string;
  "session.nearbyText": string;
  "session.matchedElements": string;
  "session.createdAt": string;
  "session.updatedAt": string;
  "session.areaSize": string;
  "session.matchCount": string;
  "session.elementUnit": string;
  "session.actions": string;
  "session.edit": string;
  "session.markAcknowledged": string;
  "session.reopen": string;
  "session.resolve": string;
  "session.dismiss": string;
  "session.delete": string;
  "session.emptyDetail": string;

  // Annotation status labels
  "annotation.pending": string;
  "annotation.acknowledged": string;
  "annotation.resolved": string;
  "annotation.dismissed": string;

  // Stability status labels
  "stabilityState.open": string;
  "stabilityState.diagnosing": string;
  "stabilityState.resolved": string;

  // Stability severity labels
  "stabilityState.low": string;
  "stabilityState.medium": string;
  "stabilityState.high": string;
  "stabilityState.critical": string;
}

const dictZhCN: TranslationDict = {
  // Toolbar
  "toolbar.dragHandle": "拖拽工具条",
  "toolbar.copyToAI": "复制给 AI",
  "toolbar.copied": "已复制",
  "toolbar.settings": "设置",
  "toolbar.connectionLost": "连接已断开",
  "toolbar.collapse": "收起",
  "toolbar.openDevPilot": "打开 DevPilot",

  // Annotation popup
  "popup.editAnnotation": "编辑标注",
  "popup.addAreaAnnotation": "添加区域标注",
  "popup.addAnnotation": "添加标注",
  "popup.keyboardHint": "Cmd/Ctrl + Enter",
  "popup.selectedArea": "选中区域",
  "popup.elementCount": "个元素",
  "popup.currentElement": "当前元素",
  "popup.placeholderArea": "描述这个区域或多个组件需要修改什么",
  "popup.placeholderElement": "描述这个页面元素需要修改什么",
  "popup.cancel": "取消",
  "popup.delete": "删除",
  "popup.save": "保存",
  "popup.add": "添加",

  // Area selection
  "area.elements": "个元素",
  "area.pendingArea": "待提交区域标注",
  "area.pending": "待提交标注",

  // Settings panel
  "settings.title": "设置",
  "settings.close": "关闭设置",
  "settings.preferences": "偏好",
  "settings.language": "界面语言",
  "settings.language.zhCN": "简体中文",
  "settings.language.enUS": "English",
  "settings.features": "功能",
  "settings.stabilityCopilot": "稳定性副驾",
  "settings.stabilityTooltip": "开启后将自动捕获 JS 异常、Promise 拒绝和接口失败",
  "settings.connection": "连接",
  "settings.mcp": "MCP",
  "settings.localMode": "本地模式",
  "settings.connected": "已连接",
  "settings.disconnected": "未连接",
  "settings.endpoint": "Endpoint",
  "settings.notConfigured": "未配置",
  "settings.session": "Session",
  "settings.notEstablished": "未建立",

  // Stability panel
  "stability.title": "稳定性副驾",
  "stability.close": "关闭",
  "stability.watching": "正在监测运行时问题",
  "stability.lastCaptured": "最近捕获",
  "stability.openIssues": "待处理问题",
  "stability.issue": "个问题",
  "stability.issues": "个问题",
  "stability.noIssues": "尚未捕获到问题",
  "stability.watchingDescription": "稳定性副驾正在监测 JS 错误、Promise 拒绝和请求失败。",
  "stability.new": "新",
  "stability.observed": "观测时间",
  "stability.page": "页面",
  "stability.copy": "复制",
  "stability.technicalDetails": "技术细节",
  "stability.collapse": "收起",
  "stability.expand": "展开",
  "stability.observedSymptom": "观测症状",
  "stability.signals": "信号",
  "stability.path": "路径",
  "stability.url": "URL",
  "stability.viewport": "视口",
  "stability.captured": "捕获时间",
  "stability.issueFetch": "页面请求失败，可能导致当前区域无法加载数据或完成操作。",
  "stability.issuePromise": "页面里的异步流程被中断，可能导致状态没有更新或交互停在中间态。",
  "stability.issueError": "页面运行时出现错误，当前模块可能无法继续正常工作。",
  "stability.issueGeneric": "页面运行时出现异常，建议尽快交给 AI 或开发者继续诊断。",
  "stability.justNow": "刚刚",
  "stability.minutesAgo": "{n} 分钟前",
  "stability.hoursAgo": "{n} 小时前",
  "stability.daysAgo": "{n} 天前",

  // Session panel
  "session.title": "本页标注",
  "session.subtitle": "这里先只展示 annotation，会话、稳定性和 MCP 同步后续再逐步接进来。",
  "session.copyTooltip": "复制本页仍需处理的标注信息",
  "session.copied": "已复制当前标注",
  "session.copyFailed": "复制失败",
  "session.copyCurrent": "复制当前标注",
  "session.close": "关闭会话面板",
  "session.open": "未完成",
  "session.acknowledged": "处理中",
  "session.total": "当前总数",
  "session.pending": "当前待处理",
  "session.emptyNoAnnotations": "还没有本页标注。进入「标注模式」后点击页面元素，即可就地创建 annotation。",
  "session.emptyNoPending": "当前没有未完成标注。解决或忽略后的项目会直接从本页移除。",
  "session.detailTitle": "当前详情",
  "session.detailNote": "Claude / Cursor 回复后也会在这里继续展开",
  "session.currentAnnotation": "当前标注",
  "session.selectedText": "选中文本",
  "session.elementContext": "元素上下文",
  "session.elementSummary": "元素摘要",
  "session.status": "状态",
  "session.elementPath": "元素路径",
  "session.nearbyText": "附近文本",
  "session.matchedElements": "命中元素",
  "session.createdAt": "创建时间",
  "session.updatedAt": "最后更新",
  "session.areaSize": "区域尺寸",
  "session.matchCount": "命中数量",
  "session.elementUnit": "个元素",
  "session.actions": "动作",
  "session.edit": "编辑标注",
  "session.markAcknowledged": "标记处理中",
  "session.reopen": "重新设为待处理",
  "session.resolve": "解决并移除",
  "session.dismiss": "忽略并移除",
  "session.delete": "删除标注",
  "session.emptyDetail": "先从左侧列表里选择一条标注。后续这里会继续接 Claude / Cursor 的回复、状态流转和源码命中信息。",

  // Annotation status labels
  "annotation.pending": "待处理",
  "annotation.acknowledged": "处理中",
  "annotation.resolved": "已解决",
  "annotation.dismissed": "已忽略",

  // Stability status labels
  "stabilityState.open": "待处理",
  "stabilityState.diagnosing": "排查中",
  "stabilityState.resolved": "已解决",

  // Stability severity labels
  "stabilityState.low": "低",
  "stabilityState.medium": "中",
  "stabilityState.high": "高",
  "stabilityState.critical": "紧急",
};

const dictEnUS: TranslationDict = {
  // Toolbar
  "toolbar.dragHandle": "Drag toolbar",
  "toolbar.copyToAI": "Copy to AI",
  "toolbar.copied": "Copied",
  "toolbar.settings": "Settings",
  "toolbar.connectionLost": "Connection lost",
  "toolbar.collapse": "Collapse",
  "toolbar.openDevPilot": "Open DevPilot",

  // Annotation popup
  "popup.editAnnotation": "Edit annotation",
  "popup.addAreaAnnotation": "Add area annotation",
  "popup.addAnnotation": "Add annotation",
  "popup.keyboardHint": "Cmd/Ctrl + Enter",
  "popup.selectedArea": "Selected area",
  "popup.elementCount": "elements",
  "popup.currentElement": "Current element",
  "popup.placeholderArea": "Describe what needs to change in this area or components",
  "popup.placeholderElement": "Describe what needs to change in this element",
  "popup.cancel": "Cancel",
  "popup.delete": "Delete",
  "popup.save": "Save",
  "popup.add": "Add",

  // Area selection
  "area.elements": "elements",
  "area.pendingArea": "Pending area annotation",
  "area.pending": "Pending annotation",

  // Settings panel
  "settings.title": "Settings",
  "settings.close": "Close settings",
  "settings.preferences": "Preferences",
  "settings.language": "Interface Language",
  "settings.language.zhCN": "简体中文",
  "settings.language.enUS": "English",
  "settings.features": "Features",
  "settings.stabilityCopilot": "Stability Copilot",
  "settings.stabilityTooltip": "Auto-capture JS errors, promise rejections, and failed requests when enabled",
  "settings.connection": "Connection",
  "settings.mcp": "MCP",
  "settings.localMode": "Local",
  "settings.connected": "Connected",
  "settings.disconnected": "Disconnected",
  "settings.endpoint": "Endpoint",
  "settings.notConfigured": "Not configured",
  "settings.session": "Session",
  "settings.notEstablished": "Not established",

  // Stability panel
  "stability.title": "Stability Copilot",
  "stability.close": "Close",
  "stability.watching": "Watching for runtime issues",
  "stability.lastCaptured": "Last captured",
  "stability.openIssues": "Open Issues",
  "stability.issue": "issue",
  "stability.issues": "issues",
  "stability.noIssues": "No issues captured yet",
  "stability.watchingDescription": "Stability Copilot is watching for JS errors, promise rejections, and failed requests.",
  "stability.new": "New",
  "stability.observed": "Observed",
  "stability.page": "Page",
  "stability.copy": "Copy",
  "stability.technicalDetails": "Technical details",
  "stability.collapse": "Collapse",
  "stability.expand": "Expand",
  "stability.observedSymptom": "Observed symptom",
  "stability.signals": "Signals",
  "stability.path": "Path",
  "stability.url": "URL",
  "stability.viewport": "Viewport",
  "stability.captured": "Captured",
  "stability.issueFetch": "A page request failed. The current area may not be able to load data or complete actions.",
  "stability.issuePromise": "An async flow in the page was interrupted. State may not have updated or the interaction may be stuck.",
  "stability.issueError": "A runtime error occurred in the page. The current module may not continue working properly.",
  "stability.issueGeneric": "A runtime exception occurred in the page. Hand it off to AI or a developer for further diagnosis.",
  "stability.justNow": "just now",
  "stability.minutesAgo": "{n}m ago",
  "stability.hoursAgo": "{n}h ago",
  "stability.daysAgo": "{n}d ago",

  // Session panel
  "session.title": "Page Annotations",
  "session.subtitle": "Annotations on this page. Session, stability and MCP sync will be integrated gradually.",
  "session.copyTooltip": "Copy pending annotations on this page",
  "session.copied": "Copied current annotations",
  "session.copyFailed": "Copy failed",
  "session.copyCurrent": "Copy current annotations",
  "session.close": "Close session panel",
  "session.open": "Open",
  "session.acknowledged": "In progress",
  "session.total": "Total",
  "session.pending": "Pending",
  "session.emptyNoAnnotations": "No annotations yet. Enter annotation mode and click a page element to create one.",
  "session.emptyNoPending": "No pending annotations. Resolved or dismissed items are removed from this page.",
  "session.detailTitle": "Details",
  "session.detailNote": "Claude / Cursor replies will also be shown here",
  "session.currentAnnotation": "Current annotation",
  "session.selectedText": "Selected text",
  "session.elementContext": "Element context",
  "session.elementSummary": "Element summary",
  "session.status": "Status",
  "session.elementPath": "Element path",
  "session.nearbyText": "Nearby text",
  "session.matchedElements": "Matched elements",
  "session.createdAt": "Created",
  "session.updatedAt": "Last updated",
  "session.areaSize": "Area size",
  "session.matchCount": "Match count",
  "session.elementUnit": "elements",
  "session.actions": "Actions",
  "session.edit": "Edit annotation",
  "session.markAcknowledged": "Mark in progress",
  "session.reopen": "Reopen",
  "session.resolve": "Resolve and remove",
  "session.dismiss": "Dismiss and remove",
  "session.delete": "Delete annotation",
  "session.emptyDetail": "Select an annotation from the list on the left. Claude / Cursor replies, status changes and source hits will be shown here.",

  // Annotation status labels
  "annotation.pending": "Pending",
  "annotation.acknowledged": "In progress",
  "annotation.resolved": "Resolved",
  "annotation.dismissed": "Dismissed",

  // Stability status labels
  "stabilityState.open": "Open",
  "stabilityState.diagnosing": "Diagnosing",
  "stabilityState.resolved": "Resolved",

  // Stability severity labels
  "stabilityState.low": "Low",
  "stabilityState.medium": "Medium",
  "stabilityState.high": "High",
  "stabilityState.critical": "Critical",
};

const DICT_MAP: Record<DevPilotLocale, TranslationDict> = {
  "zh-CN": dictZhCN,
  "en-US": dictEnUS,
};

export function getDict(locale: DevPilotLocale): TranslationDict {
  return DICT_MAP[locale] ?? dictZhCN;
}

export function isDevPilotLocale(value: unknown): value is DevPilotLocale {
  return value === "zh-CN" || value === "en-US";
}
