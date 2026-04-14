import {
  isOpenDevPilotAnnotationStatus,
  type DevPilotAnnotation,
  type DevPilotAnnotationStatus,
} from "../types";

export function getAnnotationStatusLabel(
  status: DevPilotAnnotationStatus,
): string {
  switch (status) {
    case "acknowledged":
      return "处理中";
    case "resolved":
      return "已解决";
    case "dismissed":
      return "已忽略";
    default:
      return "待处理";
  }
}

export function sortAnnotationsByUpdatedAt(
  annotations: DevPilotAnnotation[],
): DevPilotAnnotation[] {
  return [...annotations].sort((a, b) => {
    if (b.updatedAt !== a.updatedAt) {
      return b.updatedAt - a.updatedAt;
    }

    return b.createdAt - a.createdAt;
  });
}

export function mergeRemoteAnnotations(
  localAnnotations: DevPilotAnnotation[],
  remoteAnnotations: DevPilotAnnotation[],
): DevPilotAnnotation[] {
  const merged = new Map<string, DevPilotAnnotation>();
  const remoteById = new Map(remoteAnnotations.map((annotation) => [annotation.id, annotation]));

  // Prefer remote versions so status changes (e.g. resolved) are reflected.
  remoteAnnotations.forEach((annotation) => {
    merged.set(annotation.id, annotation);
  });

  // Keep local-only open annotations, or local annotations that are newer than remote.
  localAnnotations
    .filter((annotation) => isOpenDevPilotAnnotationStatus(annotation.status))
    .forEach((annotation) => {
      const remote = remoteById.get(annotation.id);
      if (!remote) {
        merged.set(annotation.id, annotation);
      } else if (annotation.updatedAt > remote.updatedAt) {
        merged.set(annotation.id, annotation);
      }
    });

  return sortAnnotationsByUpdatedAt(
    Array.from(merged.values()).filter((annotation) =>
      isOpenDevPilotAnnotationStatus(annotation.status),
    ),
  );
}
