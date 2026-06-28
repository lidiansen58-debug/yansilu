import {
  relationNetworkWorkflowMessageForNote,
  sourcePromotionWorkflowMessageForNote,
  workflowMessageDedupeKey
} from "./prototype-note-state-helpers.js";

export function sourcePromotionWorkflowMessageForRuntime(note = null, suggestion = null, deps = {}) {
  const {
    isOriginalRecordableSource = () => false,
    noteHasGeneratedOriginal = () => false,
    state = {},
    typeFromFolder = () => ""
  } = deps;
  return sourcePromotionWorkflowMessageForNote(note, suggestion, {
    isOriginalRecordableSource,
    noteHasGeneratedOriginal,
    state,
    typeFromFolder
  });
}

export function relationNetworkWorkflowMessageForRuntime(note = null, overview = {}, deps = {}) {
  const {
    distillationStatusOf = () => "",
    isPermanentLikeNote = () => false
  } = deps;
  return relationNetworkWorkflowMessageForNote(note, overview, {
    distillationStatusOf,
    isPermanentLikeNote
  });
}

export function syncSourcePromotionSystemMessageForRuntime(note = null, suggestion = null, deps = {}) {
  const {
    isOriginalRecordableSource = () => false,
    noteHasGeneratedOriginal = () => false,
    resolveSystemMessageByDedupeKey = () => null,
    upsertSystemMessage = () => null
  } = deps;
  if (!note?.id || !isOriginalRecordableSource(note)) return null;
  if (noteHasGeneratedOriginal(note)) {
    return resolveSystemMessageByDedupeKey(workflowMessageDedupeKey(note.id, "source-promotion", "record-permanent"));
  }
  const message = sourcePromotionWorkflowMessageForRuntime(note, suggestion, deps);
  if (!message?.dedupeKey) return null;
  return upsertSystemMessage(message);
}

export function syncRelationNetworkSystemMessageForRuntime(note = null, overview = {}, deps = {}) {
  const {
    resolveSystemMessageByDedupeKey = () => null,
    upsertSystemMessage = () => null
  } = deps;
  const message = relationNetworkWorkflowMessageForRuntime(note, overview, deps);
  if (!message) return null;
  if (message.resolved) return resolveSystemMessageByDedupeKey(message.dedupeKey);
  return upsertSystemMessage(message);
}
