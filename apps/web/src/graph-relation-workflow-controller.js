import { graphDirectNetworkEdgeCount } from "./graph-relation-state-query.js";

function cleanText(value = "") {
  return String(value || "").trim();
}

function cleanKind(value = "") {
  return cleanText(value).toLowerCase();
}

function hasNode(nodes = [], noteId = "") {
  const cleanNoteId = cleanText(noteId);
  return Boolean(cleanNoteId && (Array.isArray(nodes) ? nodes : []).some((node) => cleanText(node?.id) === cleanNoteId));
}

export function graphRelationWorkflowIsolatedSelectionFromAction(action = null) {
  const isolatedKey = cleanText(action?.getAttribute?.("data-graph-select-isolated") || action?.isolatedKey);
  const noteId = cleanText(action?.getAttribute?.("data-graph-isolated-note") || action?.noteId);
  if (!isolatedKey && !noteId) return { ok: false, reason: "missing_isolated_target" };
  return {
    ok: false,
    reason: "legacy_relation_form_removed",
    noteId,
    isolatedKey
  };
}

export function graphRelationWorkflowFormSelectionFromAction(action = null, { currentSelection = null } = {}) {
  const noteId = cleanText(
    action?.getAttribute?.("data-graph-relation-source") ||
    action?.getAttribute?.("data-graph-isolated-note") ||
    action?.noteId ||
    currentSelection?.noteId ||
    currentSelection?.nodeId
  );
  if (!noteId) return { ok: false, reason: "missing_source_note" };
  return {
    ok: false,
    reason: "legacy_relation_form_removed",
    noteId
  };
}

export function graphRelationWorkflowRouteAfterAiConnect({
  noteId = "",
  previousSelection = null,
  edges = [],
  relationStatusCountsAsNetworkEdge = undefined
} = {}) {
  const cleanNoteId = cleanText(noteId);
  if (!cleanNoteId) return { ok: false, reason: "missing_note" };
  const previousSelectionKind = cleanKind(previousSelection?.kind);
  const visibleEdgeCount = graphDirectNetworkEdgeCount(cleanNoteId, edges, relationStatusCountsAsNetworkEdge ? { relationStatusCountsAsNetworkEdge } : {});
  const graphSelectionKind = previousSelectionKind === "isolated" || (!previousSelectionKind && visibleEdgeCount === 0) ? "isolated" : "node";
  return {
    ok: true,
    reason: "",
    noteId: cleanNoteId,
    visibleEdgeCount,
    graphSelectionKind,
    selection: previousSelection || { kind: "isolated", noteId: cleanNoteId }
  };
}

export function graphNormalizeRelationWorkflowSelection(
  selection = null,
  {
    nodes = [],
    isolatedNotes = [],
    resolveIsolatedSelection = () => null
  } = {}
) {
  const kind = cleanKind(selection?.kind);
  if (kind === "isolated") {
    const isolated = resolveIsolatedSelection(selection, isolatedNotes, []);
    if (isolated) {
      return {
        kind: "isolated",
        isolatedKey: isolated.isolatedKey,
        isolatedIndex: isolated.isolatedIndex,
        noteId: isolated.noteId,
        title: isolated.title
      };
    }
    const noteId = cleanText(selection?.noteId || selection?.id);
    if (!noteId) return null;
    return {
      kind: "isolated",
      noteId,
      ...(cleanText(selection?.isolatedKey) ? { isolatedKey: cleanText(selection.isolatedKey) } : {}),
      ...(cleanText(selection?.title) ? { title: cleanText(selection.title) } : {})
    };
  }
  if (kind === "isolatedcomplete") {
    const noteId = cleanText(selection?.noteId || selection?.nodeId || selection?.id);
    return hasNode(nodes, noteId)
      ? {
          kind: "isolatedComplete",
          noteId,
          saveResult: selection?.saveResult && typeof selection.saveResult === "object" ? selection.saveResult : null
        }
      : null;
  }
  if (kind === "relationform") return null;
  return undefined;
}

export function createGraphRelationWorkflowController({
  graphState = {},
  setWorkflowActiveTab = () => "",
  renderGraphPanel = () => {}
} = {}) {
  const startAiConnectForNote = (noteId = "") => {
    const cleanNoteId = cleanText(noteId);
    if (!cleanNoteId) return false;
    setWorkflowActiveTab(cleanNoteId, "ai");
    renderGraphPanel();
    return true;
  };

  const applyAiConnectRoute = ({ noteId = "", previousSelection = null, edges = [], relationStatusCountsAsNetworkEdge = undefined } = {}) => {
    const route = graphRelationWorkflowRouteAfterAiConnect({ noteId, previousSelection, edges, relationStatusCountsAsNetworkEdge });
    if (!route.ok) return null;
    graphState.selection = route.selection;
    return route;
  };

  return {
    startAiConnectForNote,
    applyAiConnectRoute
  };
}
