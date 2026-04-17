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
    createEvent("Demo ready", "Open DevPilot, create annotations, then inspect them from Claude Code."),
  ]);

  const promptExamples = useMemo(
    () => [
      "List current DevPilot sessions and show the open annotations.",
      "Summarize open stability items and suggest next repair steps.",
      "Reply to the newest annotation with a short diagnosis and mark it acknowledged.",
    ],
    [],
  );

  const pushEvent = (title: string, detail: string) => {
    setEvents((current) => [createEvent(title, detail), ...current].slice(0, 8));
  };

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Claude Code + MCP integration demo</p>
        <h1>使用本地 Claude CLI 工作流测试 DevPilot</h1>
        <p className="hero-copy">
          This page mounts the local <code>@littleee/devpilot</code> package against the
          local <code>devpilot-mcp</code> bridge so annotations and stability signals can
          flow into Claude Code through MCP.
        </p>
        <div className="hero-meta">
          <span>HTTP bridge: http://127.0.0.1:5213</span>
          <span>MCP server: stdio via Claude CLI</span>
        </div>
      </section>

      <section className="steps-grid">
        <StepCard
          index={1}
          title="Run the bridge"
          body="启动本地 devpilot-mcp 服务器，以便浏览器工具栏可以同步会话、标注和稳定性项。"
        />
        <StepCard
          index={2}
          title="Register Claude MCP"
          body="Register the local stdio server with Claude Code, then open a Claude session from this repository."
        />
        <StepCard
          index={3}
          title="Create signals"
          body="Add page annotations or trigger runtime failures below, then ask Claude to read DevPilot sessions and pending work."
          action={<button className="primary-button">保存</button>}
        />
      </section>

      <section className="panel-grid">
        <article className="panel-card">
          <h2>Try in the browser</h2>
          <ul>
            <li>xxx</li>
            <li>Select text to verify text capture.</li>
            <li>Hold Shift and drag to create grouped area annotations.</li>
            <li>Open the stability panel and inspect auto-observed issues.</li>
          </ul>
        </article>

        <article className="panel-card">
          <h2>Current demo mode</h2>
          <p className="panel-note">
            此页面在加载时会抛出一个真实的 JS 错误：
            <code>Cannot read properties of undefined (reading 'a')</code>。
            DevPilot 应当捕获该错误并在稳定性面板中展示。
          </p>
        </article>
      </section>

      <section className="content-grid">
        <article className="content-card">
          <h3>Checkout Funnel</h3>
          <p>
            Use this card for area selection. It has enough nested structure to test
            grouped annotation snapping and comment flow.
          </p>
          <button className="primary-button">xxx</button>
        </article>

        <article className="content-card">
          <h3>Runtime Signals</h3>
          <p>
            当前页面在加载时会抛出一个真实的 JS 错误，供 DevPilot 捕获并通过 MCP 上报。
          </p>
          <button className="secondary-button">Secondary Actions</button>
        </article>

        <article className="content-card">
          <h3>Suggested Claude prompts</h3>
          <div className="prompt-list">
            {promptExamples.map((prompt) => (
              <code key={prompt}>{prompt}</code>
            ))}
          </div>
        </article>
      </section>

      <section className="log-panel">
        <div className="log-panel__header">
          <h2>Recent local demo events</h2>
          <button
            className="ghost-button"
            onClick={() => setEvents([createEvent("Log cleared", "Start generating new demo signals.")])}
          >
            Reset log
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
