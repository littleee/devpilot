import type {
  DevPilotAgentPlaybook,
  DevPilotAgentPlaybookBundle,
  DevPilotAgentWorkflowMode,
  DevPilotAgentWorkflowRecommendation,
  DevPilotAgentWorkflowStep,
} from "../types/agent-workflow.js";
import type { DevPilotTaskPacket, DevPilotSessionTaskPacketResult } from "./task-packet.js";

const AVAILABLE_MODES: DevPilotAgentWorkflowMode[] = ["critique", "self-driving", "watch"];

type SessionContext = {
  sessionId: string;
  session: {
    id: string;
    title: string;
    pathname: string;
    url: string;
  };
  packet: DevPilotTaskPacket;
  repairRequests: DevPilotSessionTaskPacketResult["repairRequests"];
};

export interface BuildAgentPlaybookBundleOptions {
  mode?: DevPilotAgentWorkflowMode;
  includePromptTemplate?: boolean;
  sessionContext?: SessionContext;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildToolSequence(mode: DevPilotAgentWorkflowMode): DevPilotAgentWorkflowStep[] {
  switch (mode) {
    case "critique":
      return [
        {
          title: "Read the current session brief",
          purpose: "Use the task packet as the source of truth for scope, severity, evidence, and likely targets.",
          tools: ["devpilot_get_session_task_packet"],
        },
        {
          title: "Claim the work for investigation",
          purpose: "Mark the relevant annotation or stability item as actively being investigated before deeper analysis.",
          tools: ["devpilot_acknowledge", "devpilot_diagnose_stability_item"],
          optional: true,
        },
        {
          title: "Strengthen source mapping",
          purpose: "Resolve browser hints or runtime signals into verified local files when the packet does not already contain strong source matches.",
          tools: ["devpilot_resolve_annotation_source", "devpilot_resolve_stability_source"],
          optional: true,
        },
        {
          title: "Inspect focused code context",
          purpose: "Read narrow source snippets around the likely fix targets before proposing a change.",
          tools: ["devpilot_get_source_snippet"],
        },
        {
          title: "Reply with diagnosis and a fix plan",
          purpose: "Summarize root cause, likely files, proposed minimal change, and how validation should be done.",
          tools: ["devpilot_reply"],
        },
      ];
    case "self-driving":
      return [
        {
          title: "Read the current session brief",
          purpose: "Start from the task packet so edits stay aligned with the requested outcome and acceptance criteria.",
          tools: ["devpilot_get_session_task_packet"],
        },
        {
          title: "Claim execution ownership",
          purpose: "Accept or acknowledge the relevant DevPilot items before making code changes.",
          tools: [
            "devpilot_accept_repair_request",
            "devpilot_acknowledge",
            "devpilot_diagnose_stability_item",
          ],
          optional: true,
        },
        {
          title: "Confirm the exact code target",
          purpose: "Use verified source resolution and snippets to confirm the file and line before editing.",
          tools: [
            "devpilot_resolve_annotation_source",
            "devpilot_resolve_stability_source",
            "devpilot_get_source_snippet",
          ],
          optional: true,
        },
        {
          title: "Apply the smallest safe change",
          purpose: "Edit only the code needed to resolve the reported issue and avoid widening scope.",
        },
        {
          title: "Validate the affected flow",
          purpose: "Run the most relevant checks you can and note any checks you could not run.",
        },
        {
          title: "Report and close the loop",
          purpose: "Reply with a concise outcome summary, then resolve the related DevPilot items after validation.",
          tools: [
            "devpilot_reply",
            "devpilot_resolve",
            "devpilot_resolve_stability_item",
            "devpilot_complete_repair_request",
          ],
        },
      ];
    case "watch":
      return [
        {
          title: "Wait for new work",
          purpose: "Watch DevPilot event streams for new annotations, stability items, or repair requests.",
          tools: [
            "devpilot_watch_annotations",
            "devpilot_watch_stability_items",
            "devpilot_watch_repair_requests",
          ],
        },
        {
          title: "Turn each batch into a fresh brief",
          purpose: "Build a task packet for the affected session before deciding how to proceed.",
          tools: ["devpilot_get_session_task_packet"],
        },
        {
          title: "Choose a working mode",
          purpose: "Branch into self-driving when the source target is clear and the request is explicit; otherwise branch into critique.",
          tools: ["devpilot_get_agent_playbook"],
          optional: true,
        },
        {
          title: "Keep the thread up to date",
          purpose: "Post concise status updates and only close items after the chosen branch has actually completed.",
          tools: ["devpilot_reply", "devpilot_resolve", "devpilot_complete_repair_request"],
          optional: true,
        },
      ];
  }
}

function buildUseWhen(mode: DevPilotAgentWorkflowMode): string[] {
  switch (mode) {
    case "critique":
      return [
        "Source resolution is weak, ambiguous, or missing.",
        "The issue is high-risk or critical and needs confirmation before editing.",
        "The user wants diagnosis, file targeting, or a fix plan before any code changes.",
      ];
    case "self-driving":
      return [
        "There is an explicit repair request or a clearly bounded task packet.",
        "Verified source matches or other strong code targets are already available.",
        "A targeted fix can be made safely without a broad product or architecture decision.",
      ];
    case "watch":
      return [
        "You want ongoing intake from DevPilot instead of a one-shot session read.",
        "New annotations, incidents, or repair requests may appear while you are working.",
        "You need a standing agent loop that can triage each new batch into critique or self-driving execution.",
      ];
  }
}

function buildAvoidWhen(mode: DevPilotAgentWorkflowMode): string[] {
  switch (mode) {
    case "critique":
      return [
        "A human has already requested execution and the fix target is clear enough to proceed.",
        "The task is trivial and already has strong verified source matches.",
      ];
    case "self-driving":
      return [
        "The root cause is still unclear after reading the packet and snippets.",
        "The required fix implies broad refactors, schema changes, or a product decision.",
      ];
    case "watch":
      return [
        "You only need to handle a single static session once.",
        "A one-shot critique or self-driving flow is enough and background watching adds noise.",
      ];
  }
}

function buildDecisionRules(mode: DevPilotAgentWorkflowMode): string[] {
  switch (mode) {
    case "critique":
      return [
        "Do not edit code or resolve items until the root cause and likely fix target are clear.",
        "If a repair request appears or strong resolvedSources become available, switch to self-driving mode.",
        "Prefer narrowing ambiguity over proposing a broad speculative fix.",
      ];
    case "self-driving":
      return [
        "Prefer resolvedSources first, then source resolution tools, before touching code.",
        "Use the smallest safe change that satisfies the packet's acceptance criteria.",
        "If the task becomes ambiguous or expands in scope, stop and fall back to critique mode.",
      ];
    case "watch":
      return [
        "Prefer self-driving when repair requests are explicit and source targeting is strong.",
        "Prefer critique when source resolution is weak, severity is high, or the scope is still unclear.",
        "Treat each watch batch as a fresh triage event and avoid duplicate acknowledgements.",
      ];
  }
}

function buildEscalationRules(mode: DevPilotAgentWorkflowMode): string[] {
  const shared = [
    "Escalate before broad refactors, schema changes, or irreversible data migrations.",
    "Escalate when the evidence conflicts with the observed source code or user request.",
  ];

  switch (mode) {
    case "critique":
      return shared.concat(
        "Escalate instead of guessing when multiple root-cause candidates remain plausible.",
      );
    case "self-driving":
      return shared.concat(
        "Pause before shipping a workaround that only hides a runtime failure without addressing its cause.",
      );
    case "watch":
      return shared.concat(
        "Escalate when the incoming batch mixes unrelated issues that should not be handled in one pass.",
      );
  }
}

function buildOutputExpectations(mode: DevPilotAgentWorkflowMode): string[] {
  switch (mode) {
    case "critique":
      return [
        "Identify the likely root cause and the strongest candidate files.",
        "Propose a minimal fix plan and how to validate it.",
        "Call out uncertainty, missing evidence, or reasons the task should stay open.",
      ];
    case "self-driving":
      return [
        "List the files changed.",
        "Explain how the change satisfies the evidence and acceptance criteria.",
        "Describe the validation you ran or the checks you could not run.",
        "Call out remaining risks, assumptions, or follow-up work.",
      ];
    case "watch":
      return [
        "Summarize each new batch briefly with its chosen mode.",
        "Keep status updates short and avoid repeating the full packet unless needed.",
        "Record what remains open after each batch is processed.",
      ];
  }
}

function buildCompletionActions(mode: DevPilotAgentWorkflowMode): string[] {
  switch (mode) {
    case "critique":
      return [
        "Reply with diagnosis, likely fix targets, and validation suggestions.",
        "Leave the annotation, stability item, or repair request open until code changes are actually made.",
      ];
    case "self-driving":
      return [
        "Reply with a concise outcome summary before closing items.",
        "Resolve annotations and stability items only after validation is complete.",
        "Complete accepted repair requests with a short result summary.",
      ];
    case "watch":
      return [
        "For each batch, either branch to critique or self-driving and complete that loop.",
        "Keep unresolved work open and visible when a batch cannot be finished safely.",
      ];
  }
}

function buildSystemPrompt(mode: DevPilotAgentWorkflowMode): string {
  switch (mode) {
    case "critique":
      return [
        "You are operating in DevPilot critique mode.",
        "Use DevPilot MCP tools as the source of truth for scope, evidence, and current status.",
        "Diagnose the issue, localize likely code targets, and reply with a minimal fix plan.",
        "Do not edit code or resolve DevPilot items until the root cause is clear enough to execute safely.",
      ].join(" ");
    case "self-driving":
      return [
        "You are operating in DevPilot self-driving mode.",
        "Use DevPilot MCP tools as the source of truth, claim work before editing, and prefer verified source matches.",
        "Make the smallest safe code change, validate it, reply with the result, and only then resolve the matching DevPilot items.",
        "Pause for human input if the task expands beyond a targeted fix.",
      ].join(" ");
    case "watch":
      return [
        "You are operating in DevPilot watch mode.",
        "Stay attached to DevPilot event streams, triage each new batch quickly, and branch into critique or self-driving mode based on clarity and risk.",
        "Keep thread updates concise and avoid duplicate status changes.",
      ].join(" ");
  }
}

function buildGenericTaskPrompt(mode: DevPilotAgentWorkflowMode): string {
  const playbook = buildAgentPlaybook(mode, { includePromptTemplate: false });
  const lines = [
    `Follow the official DevPilot ${playbook.label} workflow.`,
    "Use DevPilot MCP tools as your source of truth.",
    "",
    "Ordered flow:",
    ...playbook.toolSequence.map((step, index) => {
      const toolText = step.tools && step.tools.length > 0
        ? ` via ${step.tools.join(", ")}`
        : "";
      const optionalText = step.optional ? " (optional)" : "";
      return `${index + 1}. ${step.title}${optionalText}${toolText}. ${step.purpose}`;
    }),
    "",
    "Completion expectations:",
    ...playbook.outputExpectations.map((item) => `- ${item}`),
  ];

  return lines.join("\n");
}

function renderList(title: string, items: string[], limit = 5): string[] {
  if (items.length === 0) {
    return [];
  }

  return [
    `${title}:`,
    ...items.slice(0, limit).map((item) => `- ${item}`),
  ];
}

function buildSessionTaskPrompt(
  mode: DevPilotAgentWorkflowMode,
  sessionContext: SessionContext,
): string {
  const { packet, repairRequests, session } = sessionContext;
  const lines = [
    `Session ID: ${sessionContext.sessionId}`,
    `Mode: ${mode}`,
    `Page: ${session.pathname} (${session.url})`,
    `Task: ${packet.task.title}`,
    `Desired outcome: ${packet.task.desiredOutcome}`,
    `Priority: ${packet.agent.priority}`,
    `Intent: ${packet.agent.intent}`,
    `Issue counts: ${packet.summary.annotationCount} annotations, ${packet.summary.stabilityCount} stability items, ${repairRequests.length} repair requests`,
  ];

  lines.push(
    ...renderList("Primary targets", packet.agent.primaryTargets),
    ...renderList("Acceptance criteria", packet.agent.acceptanceCriteria),
    ...renderList(
      "Verified sources",
      (packet.resolvedSources || []).map((source) =>
        source.line
          ? `${source.relativePath}:${source.line}${source.column ? `:${source.column}` : ""}`
          : source.relativePath
      ),
    ),
    ...renderList(
      "Active repair requests",
      repairRequests.map((request) => `${request.title}: ${request.prompt}`),
    ),
  );

  lines.push(
    "",
    "Treat the task packet as the source of truth. Keep edits targeted, summarize validation, and update DevPilot status when the chosen mode says it is safe to do so.",
  );

  return lines.join("\n");
}

function buildPromptTemplates(
  mode: DevPilotAgentWorkflowMode,
  sessionContext?: SessionContext,
) {
  return {
    system: buildSystemPrompt(mode),
    task: sessionContext
      ? buildSessionTaskPrompt(mode, sessionContext)
      : buildGenericTaskPrompt(mode),
  };
}

function inferRecommendedMode(
  packet: DevPilotTaskPacket,
  repairRequests: DevPilotSessionTaskPacketResult["repairRequests"],
): { mode: DevPilotAgentWorkflowMode; reasons: string[] } {
  const reasons: string[] = [];
  const hasRepairRequests = repairRequests.length > 0;
  const hasResolvedSources = (packet.resolvedSources?.length || 0) > 0;
  const hasStability = packet.summary.stabilityCount > 0;
  const isCritical = packet.agent.priority === "critical";
  const isHigh = packet.agent.priority === "high";
  const isMixed = packet.agent.intent === "mixed-fix";

  if (hasRepairRequests) {
    reasons.push("Active repair requests explicitly authorize execution work.");
  }

  if (hasResolvedSources) {
    reasons.push("Verified local source matches are already available.");
  } else {
    reasons.push("Verified local source matches are still missing or incomplete.");
  }

  if (isCritical && !hasRepairRequests) {
    reasons.push("Critical issues without an explicit repair request should be confirmed before editing.");
    return { mode: "critique", reasons };
  }

  if (!hasResolvedSources && (hasStability || isMixed || isHigh)) {
    reasons.push("The task still needs diagnosis because risk is elevated and source targeting is weak.");
    return { mode: "critique", reasons };
  }

  if (hasRepairRequests || hasResolvedSources) {
    reasons.push("The task is bounded enough to execute with a targeted self-driving fix.");
    return { mode: "self-driving", reasons };
  }

  reasons.push("Start with diagnosis first, then switch to execution once the target is clearer.");
  return { mode: "critique", reasons };
}

function buildNextTools(
  mode: DevPilotAgentWorkflowMode,
  packet: DevPilotTaskPacket,
  repairRequests: DevPilotSessionTaskPacketResult["repairRequests"],
): string[] {
  const tools: string[] = [];
  const hasResolvedSources = (packet.resolvedSources?.length || 0) > 0;

  if (mode === "watch") {
    return [
      "devpilot_watch_annotations",
      "devpilot_watch_stability_items",
      "devpilot_watch_repair_requests",
      "devpilot_get_session_task_packet",
    ];
  }

  if (repairRequests.length > 0 && mode === "self-driving") {
    tools.push("devpilot_accept_repair_request");
  }

  if (packet.summary.annotationCount > 0) {
    tools.push("devpilot_acknowledge");
  }
  if (packet.summary.stabilityCount > 0) {
    tools.push("devpilot_diagnose_stability_item");
  }
  if (!hasResolvedSources) {
    if (packet.summary.annotationCount > 0) {
      tools.push("devpilot_resolve_annotation_source");
    }
    if (packet.summary.stabilityCount > 0) {
      tools.push("devpilot_resolve_stability_source");
    }
  }
  if (hasResolvedSources || packet.summary.annotationCount > 0 || packet.summary.stabilityCount > 0) {
    tools.push("devpilot_get_source_snippet");
  }
  tools.push("devpilot_reply");

  if (mode === "self-driving") {
    if (packet.summary.annotationCount > 0) {
      tools.push("devpilot_resolve");
    }
    if (packet.summary.stabilityCount > 0) {
      tools.push("devpilot_resolve_stability_item");
    }
    if (repairRequests.length > 0) {
      tools.push("devpilot_complete_repair_request");
    }
  }

  return unique(tools);
}

function buildCompletionTools(
  mode: DevPilotAgentWorkflowMode,
  packet: DevPilotTaskPacket,
  repairRequests: DevPilotSessionTaskPacketResult["repairRequests"],
): string[] {
  if (mode === "watch") {
    return ["devpilot_reply"];
  }

  const tools = ["devpilot_reply"];

  if (mode === "self-driving") {
    if (packet.summary.annotationCount > 0) {
      tools.push("devpilot_resolve");
    }
    if (packet.summary.stabilityCount > 0) {
      tools.push("devpilot_resolve_stability_item");
    }
    if (repairRequests.length > 0) {
      tools.push("devpilot_complete_repair_request");
    }
  }

  return tools;
}

export function buildAgentWorkflowRecommendation(
  sessionContext: SessionContext,
): DevPilotAgentWorkflowRecommendation {
  const { mode, reasons } = inferRecommendedMode(
    sessionContext.packet,
    sessionContext.repairRequests,
  );

  return {
    version: "1",
    recommendedMode: mode,
    reasons,
    nextTools: buildNextTools(mode, sessionContext.packet, sessionContext.repairRequests),
    completionTools: buildCompletionTools(
      mode,
      sessionContext.packet,
      sessionContext.repairRequests,
    ),
    playbookTool: "devpilot_get_agent_playbook",
    sessionPrompt: buildSessionTaskPrompt(mode, sessionContext),
  };
}

export function buildAgentPlaybook(
  mode: DevPilotAgentWorkflowMode,
  options: Pick<BuildAgentPlaybookBundleOptions, "includePromptTemplate" | "sessionContext"> = {},
): DevPilotAgentPlaybook {
  const includePromptTemplate = options.includePromptTemplate ?? true;

  return {
    version: "1",
    mode,
    label: mode === "self-driving"
      ? "Self-Driving Mode"
      : mode === "watch"
        ? "Watch Mode"
        : "Critique Mode",
    summary: mode === "self-driving"
      ? "Inspect source, make the smallest safe code change, validate it, then reply and resolve the matching DevPilot items."
      : mode === "watch"
        ? "Stay attached to DevPilot event streams and triage each new batch into critique or self-driving execution."
        : "Diagnose the issue, locate likely code targets, and reply with a fix plan before making code changes.",
    useWhen: buildUseWhen(mode),
    avoidWhen: buildAvoidWhen(mode),
    decisionRules: buildDecisionRules(mode),
    escalationRules: buildEscalationRules(mode),
    toolSequence: buildToolSequence(mode),
    outputExpectations: buildOutputExpectations(mode),
    completionActions: buildCompletionActions(mode),
    promptTemplates: includePromptTemplate
      ? buildPromptTemplates(mode, options.sessionContext)
      : undefined,
  };
}

export function buildAgentPlaybookBundle(
  options: BuildAgentPlaybookBundleOptions = {},
): DevPilotAgentPlaybookBundle {
  const requestedMode = options.mode;
  const modes = requestedMode ? [requestedMode] : AVAILABLE_MODES;

  return {
    version: "1",
    requestedMode,
    availableModes: AVAILABLE_MODES,
    recommendation: options.sessionContext
      ? buildAgentWorkflowRecommendation(options.sessionContext)
      : undefined,
    playbooks: modes.map((mode) => buildAgentPlaybook(mode, options)),
  };
}
