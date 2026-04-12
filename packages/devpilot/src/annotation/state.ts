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

  remoteAnnotations
    .filter((annotation) => isOpenDevPilotAnnotationStatus(annotation.status))
    .forEach((annotation) => {
      merged.set(annotation.id, annotation);
    });

  localAnnotations
    .filter((annotation) => isOpenDevPilotAnnotationStatus(annotation.status))
    .forEach((annotation) => {
      const remote = remoteById.get(annotation.id);
      if (remote && !isOpenDevPilotAnnotationStatus(remote.status)) {
        return;
      }

      const mergedRemote = merged.get(annotation.id);
      if (!mergedRemote || annotation.updatedAt > mergedRemote.updatedAt) {
        merged.set(annotation.id, annotation);
      }
    });

  return sortAnnotationsByUpdatedAt(Array.from(merged.values()));
}
