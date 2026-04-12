import { useMemo, useState } from "react";

import { DevPilot } from "../../../packages/devpilot/src/index";

const ENDPOINT = "http://127.0.0.1:5213";

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

function StepCard(props: { index: number; title: string; body: string }) {
  return (
    <article className="step-card">
      <span className="step-card__index">0{props.index}</span>
      <h3>{props.title}</h3>
      <p>{props.body}</p>
    </article>
  );
}

function SignalButton(props: {
  label: string;
  description: string;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      className="signal-button"
      onClick={() => {
        void props.onClick();
      }}
    >
      <strong>{props.label}</strong>
      <span>{props.description}</span>
    </button>
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

  const triggerWindowError = () => {
    pushEvent("Window error queued", "A JS runtime error will be thrown on the next tick.");
    window.setTimeout(() => {
      throw new Error("DevPilot Claude MCP demo: simulated runtime exception");
    }, 0);
  };

  const triggerUnhandledRejection = () => {
    pushEvent("Unhandled rejection queued", "A rejected promise without catch will be emitted.");
    window.setTimeout(() => {
      Promise.reject(new Error("DevPilot Claude MCP demo: simulated unhandled rejection"));
    }, 0);
  };

  const triggerFailedFetch = async () => {
    pushEvent("Failed fetch queued", "A network request to an unused local port will fail.");
    try {
      await fetch("http://127.0.0.1:9/devpilot-demo-network-failure", {
        method: "POST",
        mode: "cors",
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      pushEvent("Fetch failed as expected", reason);
    }
  };

  return (
    <>
      <DevPilot
        endpoint={ENDPOINT}
        defaultOpen
        features={{
          mcp: true,
          stability: true,
        }}
      />

      <main className="page-shell">
        <section className="hero">
          <p className="eyebrow">Claude Code + MCP integration demo</p>
          <h1>Test DevPilot with a local Claude CLI workflow</h1>
          <p className="hero-copy">
            This page mounts the local <code>@littleee/devpilot</code> package against the
            local <code>devpilot-mcp</code> bridge so annotations and stability signals can
            flow into Claude Code through MCP.
          </p>
          <div className="hero-meta">
            <span>HTTP bridge: {ENDPOINT}</span>
            <span>MCP server: stdio via Claude CLI</span>
          </div>
        </section>

        <section className="steps-grid">
          <StepCard
            index={1}
            title="Run the bridge"
            body="Start the local devpilot-mcp server so the browser toolbar can sync sessions, annotations, and stability items."
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
          />
        </section>

        <section className="panel-grid">
          <article className="panel-card">
            <h2>Try in the browser</h2>
            <ul>
              <li>Click elements to create regular annotations.</li>
              <li>Select text to verify text capture.</li>
              <li>Hold Shift and drag to create grouped area annotations.</li>
              <li>Open the stability panel and inspect auto-observed issues.</li>
            </ul>
          </article>

          <article className="panel-card">
            <h2>Trigger stability signals</h2>
            <div className="signal-grid">
              <SignalButton
                label="Trigger JS error"
                description="Queues a window.onerror event for the stability collector."
                onClick={triggerWindowError}
              />
              <SignalButton
                label="Trigger rejection"
                description="Queues an unhandled promise rejection."
                onClick={triggerUnhandledRejection}
              />
              <SignalButton
                label="Trigger failed fetch"
                description="Calls an unused local port to simulate network failure."
                onClick={triggerFailedFetch}
              />
            </div>
          </article>
        </section>

        <section className="content-grid">
          <article className="content-card">
            <h3>Checkout Funnel</h3>
            <p>
              Use this card for area selection. It has enough nested structure to test
              grouped annotation snapping and comment flow.
            </p>
            <button className="primary-button">primary actions</button>
          </article>

          <article className="content-card">
            <h3>Runtime Signals</h3>
            <p>
              Select this paragraph or trigger one of the signal buttons above to create
              stability items that Claude can inspect through MCP.
            </p>
            <button className="secondary-button">Secondary Action</button>
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
    </>
  );
}
