export const RELATION_ENTRY_SOURCES = Object.freeze({
  RIGHT_SIDEBAR: "right-sidebar",
  GRAPH_NODE: "graph-node",
  GRAPH_ISOLATED: "graph-isolated",
  GRAPH_AI_CANDIDATE: "graph-ai-candidate",
  INLINE_WIKILINK: "inline-wikilink",
  TOOLBAR_RELATION: "toolbar-relation",
  PERMANENT_WORKSPACE: "permanent-relation-workspace",
  UNKNOWN: "unknown"
});

const SOURCE_ALIASES = new Map([
  ["sidebar", RELATION_ENTRY_SOURCES.RIGHT_SIDEBAR],
  ["right", RELATION_ENTRY_SOURCES.RIGHT_SIDEBAR],
  ["right-panel", RELATION_ENTRY_SOURCES.RIGHT_SIDEBAR],
  ["graph", RELATION_ENTRY_SOURCES.GRAPH_NODE],
  ["graph-relation-form", RELATION_ENTRY_SOURCES.GRAPH_NODE],
  ["isolated", RELATION_ENTRY_SOURCES.GRAPH_ISOLATED],
  ["graph-isolated-complete", RELATION_ENTRY_SOURCES.GRAPH_ISOLATED],
  ["ai-candidate", RELATION_ENTRY_SOURCES.GRAPH_AI_CANDIDATE],
  ["wikilink", RELATION_ENTRY_SOURCES.INLINE_WIKILINK],
  ["toolbar", RELATION_ENTRY_SOURCES.TOOLBAR_RELATION],
  ["button", RELATION_ENTRY_SOURCES.TOOLBAR_RELATION],
  ["workspace", RELATION_ENTRY_SOURCES.PERMANENT_WORKSPACE]
]);

const VALID_SOURCES = new Set(Object.values(RELATION_ENTRY_SOURCES));
const VALID_MODES = new Set(["ai", "manual"]);
const VALID_RETURNS = new Set(["right-sidebar", "graph", "editor", "permanent-relation-workspace"]);

function cleanText(value = "") {
  return String(value || "").trim();
}

function cleanKind(value = "") {
  return cleanText(value).toLowerCase();
}

function cleanSource(value = "") {
  const key = cleanKind(value);
  if (!key) return RELATION_ENTRY_SOURCES.UNKNOWN;
  return SOURCE_ALIASES.get(key) || (VALID_SOURCES.has(key) ? key : RELATION_ENTRY_SOURCES.UNKNOWN);
}

function cleanMode(value = "") {
  const key = cleanKind(value);
  return VALID_MODES.has(key) ? key : "";
}

function defaultReturnToForSource(source = "") {
  const clean = cleanSource(source);
  if (clean === RELATION_ENTRY_SOURCES.GRAPH_NODE || clean === RELATION_ENTRY_SOURCES.GRAPH_ISOLATED || clean === RELATION_ENTRY_SOURCES.GRAPH_AI_CANDIDATE) {
    return "graph";
  }
  if (clean === RELATION_ENTRY_SOURCES.INLINE_WIKILINK || clean === RELATION_ENTRY_SOURCES.TOOLBAR_RELATION) {
    return "editor";
  }
  if (clean === RELATION_ENTRY_SOURCES.PERMANENT_WORKSPACE) return "permanent-relation-workspace";
  return "right-sidebar";
}

function cleanReturnTo(value = "", source = "") {
  const key = cleanKind(value);
  if (VALID_RETURNS.has(key)) return key;
  return defaultReturnToForSource(source);
}

function readAttr(element = null, names = []) {
  for (const name of names) {
    const value = element?.getAttribute?.(name);
    if (cleanText(value)) return cleanText(value);
  }
  return "";
}

function routeInputFromElement(element = null) {
  const sourceAttr = readAttr(element, ["data-relation-entry-source"]);
  const inferredSource = element?.hasAttribute?.("data-graph-ai-candidate-apply") || element?.hasAttribute?.("data-graph-relation-candidate-apply")
    ? RELATION_ENTRY_SOURCES.GRAPH_AI_CANDIDATE
    : element?.hasAttribute?.("data-graph-select-isolated")
      ? RELATION_ENTRY_SOURCES.GRAPH_ISOLATED
      : element?.hasAttribute?.("data-graph-open-relation-form")
        ? RELATION_ENTRY_SOURCES.GRAPH_NODE
        : element?.hasAttribute?.("data-permanent-relation-action")
          ? RELATION_ENTRY_SOURCES.RIGHT_SIDEBAR
          : "";
  return {
    source: sourceAttr || inferredSource,
    noteId: readAttr(element, [
      "data-relation-entry-note",
      "data-graph-relation-source",
      "data-open-note",
      "data-node-id",
      "data-graph-isolated-note"
    ]),
    targetNoteId: readAttr(element, [
      "data-relation-entry-target",
      "data-graph-target-note",
      "data-permanent-relation-target-note"
    ]),
    relationType: readAttr(element, ["data-relation-type", "data-graph-relation-type"]),
    rationaleDraft: readAttr(element, ["data-relation-rationale-draft", "data-graph-rationale-draft"]),
    insightQuestionDraft: readAttr(element, ["data-relation-insight-question-draft", "data-graph-insight-question-draft"]),
    mode: readAttr(element, ["data-relation-entry-mode", "data-permanent-relation-mode"]),
    returnTo: readAttr(element, ["data-relation-return-to", "data-graph-return-to"]),
    entryHint: readAttr(element, ["data-relation-entry-hint"]),
    isolatedKey: readAttr(element, ["data-graph-select-isolated"]),
    graphSelectionKind: readAttr(element, ["data-relation-entry-graph-selection-kind"])
  };
}

export function normalizeRelationEntryRoute(input = {}, defaults = {}) {
  const source = cleanSource(input.source || defaults.source);
  return {
    source,
    noteId: cleanText(input.noteId || input.sourceNoteId || defaults.noteId || defaults.sourceNoteId),
    targetNoteId: cleanText(input.targetNoteId || defaults.targetNoteId),
    relationType: cleanKind(input.relationType || defaults.relationType || "associated_with") || "associated_with",
    rationaleDraft: cleanText(input.rationaleDraft || input.rationale || defaults.rationaleDraft || defaults.rationale),
    insightQuestionDraft: cleanText(input.insightQuestionDraft || input.insightQuestion || defaults.insightQuestionDraft || defaults.insightQuestion),
    mode: cleanMode(input.mode || defaults.mode),
    returnTo: cleanReturnTo(input.returnTo || defaults.returnTo, source),
    entryHint: cleanText(input.entryHint || defaults.entryHint),
    isolatedKey: cleanText(input.isolatedKey || defaults.isolatedKey),
    graphSelectionKind: cleanKind(input.graphSelectionKind || defaults.graphSelectionKind)
  };
}

export function relationEntryRouteFromElement(element = null, defaults = {}) {
  return normalizeRelationEntryRoute(routeInputFromElement(element), defaults);
}

export function relationEntryRouteFromGraphAction(action = null, { currentSelection = null } = {}) {
  const currentKind = cleanKind(currentSelection?.kind);
  const returnTo = currentKind === "isolated" || currentKind === "isolatedcomplete" ? "graph" : "";
  const graphSelectionKind = currentKind || "";
  const elementRoute = routeInputFromElement(action);
  return normalizeRelationEntryRoute({
    ...elementRoute,
    noteId: elementRoute.noteId || action?.noteId,
    targetNoteId: elementRoute.targetNoteId || action?.targetNoteId,
    relationType: elementRoute.relationType || action?.relationType,
    rationaleDraft: elementRoute.rationaleDraft || action?.rationale,
    insightQuestionDraft: elementRoute.insightQuestionDraft || action?.insightQuestion
  }, {
    source: RELATION_ENTRY_SOURCES.GRAPH_NODE,
    returnTo,
    graphSelectionKind
  });
}

export function relationEntryRouteForPermanentWorkspace(noteId = "", options = {}) {
  return normalizeRelationEntryRoute(options, {
    source: RELATION_ENTRY_SOURCES.RIGHT_SIDEBAR,
    noteId,
    returnTo: "right-sidebar"
  });
}

export function relationEntryRouteForPermanentWorkspaceContinuation(noteId = "", currentRoute = null, options = {}) {
  const previous = currentRoute && typeof currentRoute === "object" ? currentRoute : {};
  return normalizeRelationEntryRoute({
    source: options.source || previous.source,
    noteId,
    targetNoteId: options.targetNoteId,
    relationType: options.relationType,
    rationaleDraft: options.rationaleDraft,
    insightQuestionDraft: options.insightQuestionDraft,
    mode: options.mode,
    returnTo: options.returnTo || previous.returnTo,
    entryHint: options.entryHint || previous.entryHint,
    isolatedKey: options.isolatedKey || previous.isolatedKey,
    graphSelectionKind: options.graphSelectionKind || previous.graphSelectionKind
  }, {
    source: RELATION_ENTRY_SOURCES.RIGHT_SIDEBAR,
    noteId,
    returnTo: "right-sidebar"
  });
}

export function relationEntryRouteForInlineLink(noteId = "", targetNoteId = "", options = {}) {
  return normalizeRelationEntryRoute(options, {
    source: RELATION_ENTRY_SOURCES.INLINE_WIKILINK,
    noteId,
    targetNoteId,
    returnTo: "editor"
  });
}
