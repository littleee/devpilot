import { useMemo, useState, type ReactNode } from "react";

type DemoEvent = {
  id: string;
  title: string;
  detail: string;
};

function createEvent(title: string, detail: string): DemoEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    detail,
  };
}

function StepCard(props: { index: number; title: string; body: string; action?: ReactNode }) {
  return (
    <article className="step-card">
      <span className="step-card__index">0{props.index}</span>
      <h3>{props.title}</h3>
      <p>{props.body}</p>
      {props.action ? <div className="step-card__action">{props.action}</div> : null}
    </article>
  );
}

export default function App() {
  const [events, setEvents] = useState<DemoEvent[]>([
    createEvent("演示就绪", "打开 DevPilot，创建标注，然后在 Claude Code 中查看它们。"),
  ]);

  const promptExamples = useMemo(
    () => [
      "列出当前 DevPilot 会话并展示未处理的标注。",
      "总结未处理的稳定性项并建议下一步修复操作。",
      "回复最新的标注，附上简短诊断并将其标记为已确认。",
    ],
    [],
  );

  const pushEvent = (title: string, detail: string) => {
    setEvents((current) => [createEvent(title, detail), ...current].slice(0, 8));
  };

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Claude Code + MCP 集成演示</p>
        <h1>使用本地 Claude CLI 工作流测试 DevPilot</h1>
        <p className="hero-copy">
          本页面将本地 <code>@littleee/devpilot</code> 包挂载到本地
          <code>devpilot-mcp</code> 桥接器，以便标注和稳定性信号可以通过 MCP
          流入 Claude Code。
        </p>
        <div className="hero-meta">
          <span>HTTP 桥接器：http://127.0.0.1:5213</span>
          <span>MCP 服务器：通过 Claude CLI 的 stdio</span>
        </div>
      </section>

      <section className="steps-grid">
        <StepCard
          index={1}
          title="启动桥接器"
          body="启动本地 devpilot-mcp 服务器，以便浏览器工具栏可以同步会话、标注和稳定性项。"
        />
        <StepCard
          index={2}
          title="注册 Claude MCP"
          body="在 Claude Code 中注册本地 stdio 服务器，然后从本仓库打开一个 Claude 会话。"
        />
        <StepCard
          index={3}
          title="创建信号"
          body="在下方添加页面标注或触发运行时错误，然后让 Claude 读取 DevPilot 会话和待处理的工作。"
          action={<button className="primary-button">保存</button>}
        />
      </section>

      <section className="panel-grid">
        <article className="panel-card">
          <h2>在浏览器中尝试</h2>
          <ul>
            <li>点击页面元素创建元素标注。</li>
            <li>选中文本以验证文本捕获功能。</li>
            <li>按住 Shift 并拖动以创建分组区域标注。</li>
            <li>打开稳定性面板并检查自动观测到的问题。</li>
          </ul>
        </article>

        <article className="panel-card">
          <h2>当前演示模式</h2>
          <p className="panel-note">
            此页面在加载时会抛出一个真实的 JS 错误：
            <code>Cannot read properties of undefined (reading 'a')</code>。
            DevPilot 应当捕获该错误并在稳定性面板中展示。
          </p>
        </article>
      </section>

      <section className="content-grid">
        <article className="content-card">
          <h3>结账漏斗</h3>
          <p>
            使用此卡片进行区域选择。它包含足够的嵌套结构，可用于测试
            分组标注吸附和评论流程。
          </p>
          <button className="primary-button">xxx</button>
        </article>

        <article className="content-card">
          <h3>运行时信号</h3>
          <p>
            当前页面在加载时会抛出一个真实的 JS 错误，供 DevPilot 捕获并通过 MCP 上报。
          </p>
          <button className="secondary-button">次要操作</button>
        </article>

        <article className="content-card">
          <h3>推荐的 Claude 提示词</h3>
          <div className="prompt-list">
            {promptExamples.map((prompt) => (
              <code key={prompt}>{prompt}</code>
            ))}
          </div>
        </article>
      </section>

      <section className="log-panel">
        <div className="log-panel__header">
          <h2>最近的本地演示事件</h2>
          <button
            className="ghost-button"
            onClick={() => setEvents([createEvent("日志已清空", "开始生成新的演示信号。")])}
          >
            重置日志
          </button>
        </div>
        <ul className="event-list">
          {events.map((event) => (
            <li key={event.id} className="event-list__item">
              <strong>{event.title}</strong>
              <span>{event.detail}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
