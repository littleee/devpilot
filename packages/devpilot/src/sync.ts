import type { DevPilotAnnotation } from "./types";

export interface DevPilotRemoteSession {
  id: string;
  pageKey: string;
  pathname: string;
  url: string;
  title: string;
  status: "active" | "closed";
  createdAt: number;
  updatedAt: number;
}

export interface DevPilotRemoteSessionWithAnnotations extends DevPilotRemoteSession {
  annotations: DevPilotAnnotation[];
}

export interface DevPilotEnsureRemoteSessionInput {
  pageKey: string;
  pathname: string;
  url: string;
  title: string;
}

async function readJson<T>(response: Response, action: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`Failed to ${action}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function ensureRemoteSession(
  endpoint: string,
  input: DevPilotEnsureRemoteSessionInput,
): Promise<DevPilotRemoteSession> {
  const response = await fetch(`${endpoint}/sessions/ensure`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return readJson<DevPilotRemoteSession>(response, "ensure session");
}

export async function getRemoteSession(
  endpoint: string,
  sessionId: string,
): Promise<DevPilotRemoteSessionWithAnnotations> {
  const response = await fetch(`${endpoint}/sessions/${sessionId}`);
  return readJson<DevPilotRemoteSessionWithAnnotations>(response, "load session");
}

export async function syncRemoteAnnotation(
  endpoint: string,
  sessionId: string,
  annotation: DevPilotAnnotation,
): Promise<DevPilotAnnotation> {
  const response = await fetch(`${endpoint}/sessions/${sessionId}/annotations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(annotation),
  });

  return readJson<DevPilotAnnotation>(response, "create annotation");
}

export async function updateRemoteAnnotation(
  endpoint: string,
  annotationId: string,
  data: Partial<DevPilotAnnotation> & { status?: string },
): Promise<DevPilotAnnotation> {
  const response = await fetch(`${endpoint}/annotations/${annotationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return readJson<DevPilotAnnotation>(response, "update annotation");
}

export async function deleteRemoteAnnotation(
  endpoint: string,
  annotationId: string,
): Promise<void> {
  const response = await fetch(`${endpoint}/annotations/${annotationId}`, {
    method: "DELETE",
  });

  await readJson<{ deleted: boolean }>(response, "delete annotation");
}
