import { buildGraphVisualMapChromeDeps } from "./graph-visual-map-chrome-deps.js";
import { buildGraphVisualMapRuntimeStateDeps } from "./graph-visual-map-runtime-state-deps.js";
import { buildGraphVisualMapViewDeps } from "./graph-visual-map-view-deps.js";

export function buildGraphVisualMapRuntimeDeps(host = {}) {
  return {
    ...buildGraphVisualMapRuntimeStateDeps(host),
    ...buildGraphVisualMapChromeDeps(host),
    ...buildGraphVisualMapViewDeps(host)
  };
}
