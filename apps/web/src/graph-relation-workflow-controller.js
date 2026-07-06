import { graphDirectNetworkEdgeCount } from "./graph-relation-state-query.js";
import {
  relationEntryRouteFromGraphAction
} from "./relation-entry-route.js";

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
    ok: true,
    reason: "",
    workflowTab: "manual",
    statusText: "已打开建联流程",
    noteId,
    selection: {
      kind: "relationForm",
      returnTo: "isolated",
      ...(isolatedKey ? { isolatedKey } : {}),
      ...(noteId ? { noteId } : {})
    }
  };
}

export function graphRelationWorkflowFormSelectionFromAction(action = null, { currentSelection = null } = {}) {
  const entryRoute = relationEntryRouteFromGraphAction(action, { currentSelection });
  const noteId = cleanText(entryRoute.noteId || action?.noteId);
  if (!noteId) return { ok: false, reason: "missing_source_note" };
  const targetNoteId = cleanText(entryRoute.targetNoteId || action?.targetNoteId);
  const relationType = cleanKind(entryRoute.relationType || action?.relationType || "associated_with") || "associated_with";
  const rationale = cleanText(entryRoute.rationaleDraft || action?.rationale);
  const previousSelectionKind = cleanKind(currentSelection?.kind);
  const previousReturnTo = cleanKind(currentSelection?.returnTo);
  const returnTo = previousSelectionKind === "isolated" || previousSelectionKind === "isolatedcomplete" || previousReturnTo === "isolated" ? "isolated" : "";
  return {
    ok: true,
    reason: "",
    workflowTab: "manual",
    statusText: targetNoteId ? "已在当前建联流程中带入目标笔记" : "已在当前建联流程中打开手动搜索",
    noteId,
    selection: {
      kind: "relationForm",
      noteId,
      targetNoteId,
      relationType,
      rationale,
      returnTo,
      entryRoute
    }
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
  if (kind === "relationform") {
    const noteId = cleanText(selection?.noteId || selection?.nodeId || selection?.id);
    if (!noteId) return null;
    return {
      kind: "relationForm",
      noteId,
      targetNoteId: cleanText(selection?.targetNoteId),
      relationType: cleanKind(selection?.relationType || "associated_with") || "associated_with",
      rationale: cleanText(selection?.rationale),
      returnTo: cleanKind(selection?.returnTo),
      entryRoute: selection?.entryRoute && typeof selection.entryRoute === "object" ? selection.entryRoute : null
    };
  }
  return undefined;
}

export function createGraphRelationWorkflowController({
  graphState = {},
  setWorkflowActiveTab = () => "",
  openGraphSelection = null,
  renderGraphPanel = () => {},
  setStatus = () => {}
} = {}) {
  const applySelection = (selection = null) => {
    graphState.selection = selection;
    if (typeof openGraphSelection === "function") {
      openGraphSelection(selection);
      return;
    }
    renderGraphPanel();
  };

  const openIsolatedFromAction = (action = null) => {
    const route = graphRelationWorkflowIsolatedSelectionFromAction(action);
    if (!route.ok) return false;
    if (route.noteId) setWorkflowActiveTab(route.noteId, route.workflowTab);
    applySelection(route.selection);
    setStatus(route.statusText, "ok");
    return true;
  };

  const openRelationFormFromAction = (action = null) => {
    const route = graphRelationWorkflowFormSelectionFromAction(action, { currentSelection: graphState.selection });
    if (!route.ok) return false;
    setWorkflowActiveTab(route.noteId, route.workflowTab);
    applySelection(route.selection);
    setStatus(route.statusText, "ok");
    return true;
  };

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
    openIsolatedFromAction,
    openRelationFormFromAction,
    startAiConnectForNote,
    applyAiConnectRoute
  };
}
