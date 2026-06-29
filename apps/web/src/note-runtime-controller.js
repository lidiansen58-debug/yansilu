import {
  ensureNoteBodyLoadedForRuntime
} from "./note-loading-runtime.js";
import {
  loadNoteTemplateSettingsFromStorageForRuntime,
  refreshUntitledPlaceholderForRuntime
} from "./note-template-runtime-helpers.js";
import {
  generatedOriginalNoteIdFromBody,
  isPersistableRelationNetworkStatus,
  relationNetworkStatusForNotePolicy,
  resolveFolderRootNoteType
} from "./note-persistence-policy.js";

export function createNoteRuntimeController(depsProvider = () => ({})) {
  const runtimeDeps = () => depsProvider() || {};

  function noteGeneratedOriginalNoteId(note = null) {
    return String(
      note?.generatedOriginalNoteId ||
        note?.generated_original_note_id ||
        generatedOriginalNoteIdFromBody(note?.body || "")
    ).trim();
  }

  function noteHasGeneratedOriginal(note = null) {
    return Boolean(noteGeneratedOriginalNoteId(note));
  }

  function relationNetworkStatusForNote(note = null, options = {}) {
    const {
      readStoredRelationNetworkStatus = () => "",
      state = {},
      typeFromFolder = () => ""
    } = runtimeDeps();
    const noteType = resolveFolderRootNoteType(note, { typeFromFolder: (folderId) => typeFromFolder(state, folderId) });
    const connectedIds = options.connectedIds instanceof Set
      ? options.connectedIds
      : state.graphConnectedNoteIds instanceof Set
        ? state.graphConnectedNoteIds
        : null;
    const connectivityReady = options.connectivityReady === undefined ? state.graphConnectivityReady === true : options.connectivityReady === true;
    return relationNetworkStatusForNotePolicy({
      note,
      noteType,
      connectedIds,
      connectivityReady,
      storedStatus: readStoredRelationNetworkStatus(note?.id)
    });
  }

  function syncNoteRelationNetworkStatus(note = null, options = {}) {
    const {
      state = {},
      typeFromFolder = () => "",
      writeStoredRelationNetworkStatus = () => {}
    } = runtimeDeps();
    if (!note || typeof note !== "object") return "";
    const nextStatus = relationNetworkStatusForNote(note, options);
    note.relationNetworkStatus = nextStatus;
    const noteType = resolveFolderRootNoteType(note, { typeFromFolder: (folderId) => typeFromFolder(state, folderId) });
    if (noteType === "permanent" || noteType === "original") {
      if (isPersistableRelationNetworkStatus(nextStatus)) writeStoredRelationNetworkStatus(note.id, nextStatus);
    } else {
      writeStoredRelationNetworkStatus(note.id, "");
    }
    return nextStatus;
  }

  function syncAllNoteRelationNetworkStatuses(options = {}) {
    const { state = {} } = runtimeDeps();
    for (const note of Array.isArray(state.notes) ? state.notes : []) syncNoteRelationNetworkStatus(note, options);
  }

  function loadNoteTemplateSettingsFromStorage() {
    const {
      settingsState = {},
      noteTemplateStorageScope = () => "global",
      noteTemplateStorageKey = () => "",
      readStoredText = () => "",
      writeStoredText = () => {},
      normalizeStoredNoteTemplateSource = (value) => String(value || ""),
      normalizeDraftBuffer = (value) => String(value || ""),
      normalizeNoteTemplateHistory = (value) => Array.isArray(value) ? value : []
    } = runtimeDeps();
    return loadNoteTemplateSettingsFromStorageForRuntime({
      settingsState,
      noteTemplateStorageScope,
      noteTemplateStorageKey,
      readStoredText,
      writeStoredText,
      normalizeStoredNoteTemplateSource,
      normalizeDraftBuffer,
      normalizeNoteTemplateHistory
    });
  }

  async function refreshUntitledPlaceholderForCurrentTemplate(note = null) {
    const {
      ensureEditableNoteBody = (value) => String(value || ""),
      initialBodyForFolder = () => "",
      isEmptyUntitledMarkdown = () => false,
      isLocalOnlyNote = () => false,
      isUntitledTitle = () => false,
      mapNoteItem = (value) => value,
      normalizedDefaultUntitledBody = () => "",
      noteTabFor = () => null,
      parseLinks = () => [],
      parseTags = () => [],
      setStatus = () => {},
      updateNote = async () => null
    } = runtimeDeps();
    return refreshUntitledPlaceholderForRuntime(note, {
      noteTabFor,
      isUntitledTitle,
      normalizedDefaultUntitledBody,
      ensureEditableNoteBody,
      isEmptyUntitledMarkdown,
      initialBodyForFolder,
      isLocalOnlyNote,
      parseTags,
      parseLinks,
      updateNote,
      mapNoteItem,
      setStatus
    });
  }

  async function ensureNoteBodyLoaded(noteId = "") {
    const {
      editor = {},
      fetchNote = async () => null,
      normalizeAuthorshipItem,
      normalizeOptionalNumber,
      normalizeThinkingStatusItem,
      state = {}
    } = runtimeDeps();
    return ensureNoteBodyLoadedForRuntime(noteId, {
      state,
      fetchNote,
      editor,
      normalizeOptionalNumber,
      normalizeAuthorshipItem,
      normalizeThinkingStatusItem
    });
  }

  return {
    ensureNoteBodyLoaded,
    loadNoteTemplateSettingsFromStorage,
    noteGeneratedOriginalNoteId,
    noteHasGeneratedOriginal,
    refreshUntitledPlaceholderForCurrentTemplate,
    relationNetworkStatusForNote,
    syncAllNoteRelationNetworkStatuses,
    syncNoteRelationNetworkStatus
  };
}
