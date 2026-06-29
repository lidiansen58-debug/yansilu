import {
  relationNetworkWorkflowMessageForRuntime,
  sourcePromotionWorkflowMessageForRuntime,
  syncRelationNetworkSystemMessageForRuntime,
  syncSourcePromotionSystemMessageForRuntime
} from "./system-message-workflow-sync.js";

export function createWorkflowReminderController(depsProvider = () => ({})) {
  const deps = () => (typeof depsProvider === "function" ? depsProvider() : depsProvider) || {};
  return {
    sourcePromotionWorkflowMessageForNote(note = null, suggestion = null) {
      return sourcePromotionWorkflowMessageForRuntime(note, suggestion, deps());
    },
    syncSourcePromotionSystemMessageForNote(note = null, suggestion = null) {
      return syncSourcePromotionSystemMessageForRuntime(note, suggestion, deps());
    },
    relationNetworkWorkflowMessageForNote(note = null, overview = {}) {
      return relationNetworkWorkflowMessageForRuntime(note, overview, deps());
    },
    syncRelationNetworkSystemMessageForNote(note = null, overview = {}) {
      return syncRelationNetworkSystemMessageForRuntime(note, overview, deps());
    }
  };
}
