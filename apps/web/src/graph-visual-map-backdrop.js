export function buildGraphVisualMapBackdropMarkup({
  runtimeState = {},
  graphState = {},
  relationType = "meaningful"
} = {}, deps = {}) {
  const {
    graphThemeBoundaryMeta = () => null,
    renderGraphThemeBoundary = () => "",
    renderGraphStarfield = () => "",
    renderGraphNebulaField = () => "",
    renderGraphClusterGlow = () => ""
  } = deps;
  const {
    layout = { nodes: [], width: 0, height: 0, clusterMeta: [] },
    zoom = { key: "fit" },
    activeSelection = null
  } = runtimeState;

  const themeBoundaryMarkup = renderGraphThemeBoundary(
    activeSelection?.kind === "theme"
      ? graphThemeBoundaryMeta({
          nodes: layout.nodes,
          noteIds: activeSelection.noteIds,
          title: activeSelection.title,
          layoutWidth: layout.width,
          layoutHeight: layout.height
        })
      : null
  );
  const visualSeed = `${graphState.lastLoadedAt}:${relationType}:${zoom.key}`;

  return {
    themeBoundaryMarkup,
    starfieldMarkup: renderGraphStarfield(layout.width, layout.height, visualSeed),
    nebulaMarkup: renderGraphNebulaField(layout.width, layout.height, visualSeed),
    clusterGlowMarkup: renderGraphClusterGlow(layout.clusterMeta)
  };
}
