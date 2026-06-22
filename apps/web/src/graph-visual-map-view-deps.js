export function buildGraphVisualMapViewDeps(host = {}) {
  const {
    graphNodeAttentionReasons = () => [],
    graphNodeClass = () => "",
    graphNodeShowsAsPoint = () => false,
    graphNodeStarRank = () => 0,
    graphShortTitle = (node) => node?.title || node?.id || "",
    noteTypeLabel = () => "",
    graphRelationTypeLabel = () => "",
    graphRelationSourceLabel = () => "",
    graphRelationGroupMeta = () => ({}),
    graphEdgeSelectionKey = () => "",
    graphEdgeVisibleAtFit = () => true,
    graphEdgeShouldRender = () => true
  } = host;

  return {
    graphNodeClass,
    graphNodeStarRank,
    graphShortTitle,
    noteTypeLabel,
    graphNodeAttentionReasons,
    graphNodeShowsAsPoint,
    graphRelationTypeLabel,
    graphRelationSourceLabel,
    graphRelationGroupMeta,
    graphEdgeSelectionKey,
    graphEdgeVisibleAtFit,
    graphEdgeShouldRender
  };
}
