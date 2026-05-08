import { DEFAULT_DB_PATH, initDatabase, openDatabase } from "./store/db.js";
import { createAnnotationRepository } from "./store/annotation-repository.js";
import { createRepairRepository } from "./store/repair-repository.js";
import { createSessionRepository } from "./store/session-repository.js";
import { createStabilityRepository } from "./store/stability-repository.js";
import { createWorkspaceRepository } from "./store/workspace-repository.js";
import type { DevPilotSessionWithAnnotations } from "./types.js";

export function createStore(dbPath = DEFAULT_DB_PATH) {
  const db = openDatabase(dbPath);
  initDatabase(db);

  const sessions = createSessionRepository(db);
  const workspaces = createWorkspaceRepository(db);
  const annotations = createAnnotationRepository(db, {
    getSessionById: sessions.getSessionById,
    touchSession: sessions.touchSession,
  });
  const stability = createStabilityRepository(db, {
    getSessionById: sessions.getSessionById,
    touchSession: sessions.touchSession,
  });
  const repairs = createRepairRepository(db, {
    getSessionById: sessions.getSessionById,
    touchSession: sessions.touchSession,
  });

  return {
    getDbPath(): string {
      return dbPath;
    },
    ensureSession: sessions.ensureSession,
    listSessions: sessions.listSessions,
    registerWorkspace: workspaces.registerWorkspace,
    listWorkspaces: workspaces.listWorkspaces,
    getWorkspace(id: string) {
      return workspaces.getWorkspaceById(id);
    },
    getSession(id: string) {
      return sessions.getSessionById(id);
    },
    getSessionWithAnnotations(id: string): DevPilotSessionWithAnnotations | null {
      const session = sessions.getSessionById(id);
      if (!session) {
        return null;
      }

      return {
        ...session,
        annotations: annotations.listSessionAnnotations(id),
        stabilityItems: stability.listSessionStabilityItems(id),
        repairRequests: repairs.listSessionRepairRequests(id),
      };
    },
    addAnnotation: annotations.addAnnotation,
    updateAnnotation: annotations.updateAnnotation,
    updateAnnotationStatus: annotations.updateAnnotationStatus,
    deleteAnnotation: annotations.deleteAnnotation,
    hardDeleteAnnotation: annotations.hardDeleteAnnotation,
    addReply: annotations.addReply,
    getAnnotation(id: string) {
      return annotations.getAnnotationById(id);
    },
    getPendingAnnotations: annotations.getPendingAnnotations,
    getAllPendingAnnotations: annotations.getAllPendingAnnotations,
    addStabilityItem: stability.addStabilityItem,
    updateStabilityItem: stability.updateStabilityItem,
    updateStabilityStatus: stability.updateStabilityStatus,
    deleteStabilityItem: stability.deleteStabilityItem,
    getStabilityItem(id: string) {
      return stability.getStabilityItemById(id);
    },
    getSessionStabilityItems: stability.listSessionStabilityItems,
    getOpenSessionStabilityItems: stability.getOpenSessionStabilityItems,
    getAllOpenStabilityItems: stability.getAllOpenStabilityItems,
    addRepairRequest: repairs.addRepairRequest,
    updateRepairRequest: repairs.updateRepairRequest,
    getRepairRequestByIdempotency: repairs.getExistingByIdempotency,
    getRepairRequest(id: string) {
      return repairs.getRepairRequestById(id);
    },
    getSessionRepairRequests: repairs.listSessionRepairRequests,
    getOpenSessionRepairRequests: repairs.getOpenSessionRepairRequests,
    getAllOpenRepairRequests: repairs.getAllOpenRepairRequests,
    close(): void {
      db.close();
    },
  };
}

export type DevPilotStore = ReturnType<typeof createStore>;
