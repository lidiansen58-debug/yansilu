import { graphEdgeSelectionKey } from "./graph-relation-visual-state.js";

export function revealSavedGraphRelation(graphState = {}, relation = null, deps = {}) {
  const relationId = String(relation?.id || relation?.relationId || "").trim();
  const edge = relationId && graphState.item?.edges?.find?.(item => String(item?.id || "") === relationId);
  if (!edge) return false;
  deps.setRelationTypeFilter?.("all", { source: "relation-save" });
  graphState.selection = { kind: "edge", edgeKey: graphEdgeSelectionKey(edge) };
  deps.renderGraphPanel?.();
  return true;
}
