import type {
  DevPilotAnnotationStatus,
  DevPilotRepairRequestStatus,
  DevPilotSelectionKind,
  DevPilotStabilitySeverity,
  DevPilotStabilityStatus,
} from "../types.js";

export type SessionRow = {
  id: string;
  page_key: string;
  pathname: string;
  url: string;
  title: string;
  status: "active" | "closed";
  created_at: number;
  updated_at: number;
};

export type WorkspaceRow = {
  id: string;
  name: string;
  root_path: string;
  dev_server_urls_json: string | null;
  created_at: number;
  updated_at: number;
};

export type AnnotationRow = {
  id: string;
  session_id: string;
  pathname: string;
  created_at: number;
  updated_at: number;
  kind: DevPilotSelectionKind | null;
  status: DevPilotAnnotationStatus;
  comment: string;
  element_name: string;
  element_path: string;
  match_count: number | null;
  selected_text: string | null;
  nearby_text: string | null;
  related_elements: string | null;
  page_x: number;
  page_y: number;
  rect_json: string;
  context_json: string | null;
  resolved_at: number | null;
  resolved_by: "human" | "agent" | null;
  deleted_at: number | null;
  deleted_by: "human" | "agent" | null;
};

export type ReplyRow = {
  id: string;
  annotation_id: string;
  role: "human" | "agent";
  content: string;
  created_at: number;
};

export type StabilityRow = {
  id: string;
  session_id: string;
  pathname: string;
  created_at: number;
  updated_at: number;
  status: DevPilotStabilityStatus;
  severity: DevPilotStabilitySeverity;
  title: string;
  symptom: string;
  repro_steps: string | null;
  impact: string | null;
  signals: string | null;
  fix_goal: string | null;
  context_json: string;
};

export type RepairRequestRow = {
  id: string;
  session_id: string;
  stability_item_id: string | null;
  pathname: string;
  created_at: number;
  updated_at: number;
  status: DevPilotRepairRequestStatus;
  title: string;
  severity: DevPilotStabilitySeverity | null;
  prompt: string;
  requested_by: "human" | "agent";
  completed_at: number | null;
  completed_by: "human" | "agent" | null;
  result_summary: string | null;
  idempotency_key: string | null;
  actor_id: string | null;
};
