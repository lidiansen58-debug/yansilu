function orderGeometryRows(rows) {
  return rows.sort((left, right) => String(left[0]).localeCompare(String(right[0])) ||
    String(left[1]).localeCompare(String(right[1])) || String(left[2]).localeCompare(String(right[2])));
}

function viewportLayoutKey(root, viewport) {
  const svg = viewport?.querySelector?.(".graph-map-svg");
  return JSON.stringify([
    viewport?.getAttribute?.("data-graph-zoom"), svg?.getAttribute?.("viewBox"),
    root?.querySelector?.(".graph-map-panel")?.classList?.contains("is-expanded") || false,
    orderGeometryRows([...(svg?.querySelectorAll?.(".graph-map-node") || [])].map(node => [
      node.getAttribute("data-node-id"), node.querySelector("circle")?.getAttribute("cx"),
      node.querySelector("circle")?.getAttribute("cy")
    ])),
    orderGeometryRows([...(svg?.querySelectorAll?.(".graph-map-edge-group") || [])].map(edge => [
      edge.getAttribute("data-edge-from"), edge.getAttribute("data-edge-to"), edge.getAttribute("data-edge-key")
    ]))
  ]);
}

function clusterDetailViewport(root) {
  const panel = root?.querySelector?.(".graph-selection-panel.is-cluster");
  const body = panel?.querySelector?.(".graph-selection-body");
  if (!body) return null;
  const key = JSON.stringify([
    panel.querySelector("[data-graph-theme-note-ids]")?.getAttribute("data-graph-theme-note-ids"),
    [...panel.querySelectorAll("[data-graph-section]")].map(section => [
      section.getAttribute("data-graph-section"), section.hasAttribute("open")
    ])
  ]);
  return { body, key };
}

export function captureGraphViewport(root = globalThis.document) {
  const viewport = root?.querySelector?.(".graph-map-viewport");
  if (!viewport) return null;
  const detail = clusterDetailViewport(root);
  return {
    left: viewport.scrollLeft, top: viewport.scrollTop, key: viewportLayoutKey(root, viewport),
    detail: detail ? { top: detail.body.scrollTop, key: detail.key } : null
  };
}

export function restoreGraphViewport(root, snapshot, { requireSameLayout = true } = {}) {
  const viewport = root?.querySelector?.(".graph-map-viewport");
  if (!viewport || !snapshot) return false;
  const detail = clusterDetailViewport(root);
  if (detail && detail.key === snapshot.detail?.key) {
    detail.body.scrollTop = Math.max(0, Number(snapshot.detail.top) || 0);
  }
  if (requireSameLayout && snapshot.key !== viewportLayoutKey(root, viewport)) return false;
  viewport.scrollLeft = Math.max(0, Number(snapshot.left) || 0);
  viewport.scrollTop = Math.max(0, Number(snapshot.top) || 0);
  return true;
}
