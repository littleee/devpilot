export type DevPilotAgentWorkflowMode = "critique" | "self-driving" | "watch";

export interface DevPilotAgentWorkflowStep {
  title: string;
  purpose: string;
  tools?: string[];
  optional?: boolean;
}

export interface DevPilotAgentPromptTemplates {
  system: string;
  task: string;
}

export interface DevPilotAgentPlaybook {
  version: "1";
  mode: DevPilotAgentWorkflowMode;
  label: string;
  summary: string;
  useWhen: string[];
  avoidWhen: string[];
  decisionRules: string[];
  escalationRules: string[];
  toolSequence: DevPilotAgentWorkflowStep[];
  outputExpectations: string[];
  completionActions: string[];
  promptTemplates?: DevPilotAgentPromptTemplates;
}

export interface DevPilotAgentWorkflowRecommendation {
  version: "1";
  recommendedMode: DevPilotAgentWorkflowMode;
  reasons: string[];
  nextTools: string[];
  completionTools: string[];
  playbookTool: "devpilot_get_agent_playbook";
  sessionPrompt?: string;
}

export interface DevPilotAgentPlaybookBundle {
  version: "1";
  requestedMode?: DevPilotAgentWorkflowMode;
  availableModes: DevPilotAgentWorkflowMode[];
  recommendation?: DevPilotAgentWorkflowRecommendation;
  playbooks: DevPilotAgentPlaybook[];
}
