import { renderGraphVisualMapShellView } from "./graph-visual-map-shell.js";
import { composeGraphVisualMapForRuntime } from "./graph-visual-map-composer.js";

export function renderGraphVisualMapForRuntime(options = {}, deps = {}) {
  const { graphShellProps, shellDeps } = composeGraphVisualMapForRuntime(options, deps);
  return renderGraphVisualMapShellView(graphShellProps, shellDeps);
}

export function createGraphVisualMapController(options = {}) {
  const depsProvider = options.depsProvider || (() => ({}));
  return {
    renderGraphVisualMap: (renderOptions = {}) => renderGraphVisualMapForRuntime(renderOptions, depsProvider())
  };
}
