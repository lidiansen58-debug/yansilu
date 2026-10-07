// Rendering normalizes selections into new objects. Compare the selected
// object on the graph, rather than the identity of that temporary JS object.
export function graphSelectionContextKey(selection = null) {
  if (!selection) return "";
  const clean = value => String(value || "").trim();
  return JSON.stringify([
    clean(selection.kind).toLowerCase(),
    clean(selection.noteId || selection.nodeId || selection.id),
    clean(selection.edgeKey),
    clean(selection.fromNoteId),
    clean(selection.toNoteId),
    clean(selection.relationType),
    clean(selection.clusterKey),
    clean(selection.topicKey)
  ]);
}

export function captureGraphRequestContext(depsProvider, { includeAnalysis = false } = {}) {
  const deps = depsProvider();
  const item = deps.graphState?.item;
  const analysis = deps.graphState?.aiAnalysis;
  const selection = graphSelectionContextKey(deps.graphState?.selection);
  const directory = deps.graphScopeDirectoryId?.();
  const module = deps.state?.module;
  return () => {
    const current = depsProvider();
    return current.graphState?.item === item &&
      (!includeAnalysis || current.graphState?.aiAnalysis === analysis) &&
      graphSelectionContextKey(current.graphState?.selection) === selection &&
      current.graphScopeDirectoryId?.() === directory && current.state?.module === module;
  };
}
