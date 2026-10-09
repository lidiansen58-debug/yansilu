export function buildGraphVisualMapBackdropMarkup({
  runtimeState = {}
} = {}, deps = {}) {
  const {
    graphThemeBoundaryMeta = () => null,
    renderGraphThemeBoundary = () => "",
    renderGraphClusterGlow = () => ""
  } = deps;
  const {
    layout = { nodes: [], width: 0, height: 0, clusterMeta: [] },
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
  return {
    themeBoundaryMarkup,
    // Keep the layer contract without generating decorative background objects.
    starfieldMarkup: "",
    nebulaMarkup: "",
    clusterGlowMarkup: renderGraphClusterGlow(layout.clusterMeta)
  };
}
