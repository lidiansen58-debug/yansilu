export const GRAPH_VISUAL_ZOOM_OPTIONS = {
  fit: { label: "全览", scale: 1, note: "看整体结构", icon: "fit" },
  read: { label: "放大", scale: 1.35, note: "读笔记标题", icon: "read" },
  detail: { label: "细节", scale: 1.75, note: "检查关系线", icon: "detail" }
};

export function graphZoomOption(value = "", zoomOptions = GRAPH_VISUAL_ZOOM_OPTIONS) {
  const key = String(value || "fit").trim().toLowerCase();
  return zoomOptions[key] ? { key, ...zoomOptions[key] } : { key: "fit", ...zoomOptions.fit };
}

export function graphZoomStep(value = "", direction = 0, zoomOptions = GRAPH_VISUAL_ZOOM_OPTIONS) {
  const zoomKeys = Object.keys(zoomOptions || {});
  const currentIndex = Math.max(0, zoomKeys.indexOf(graphZoomOption(value, zoomOptions).key));
  const nextIndex = Math.max(0, Math.min(zoomKeys.length - 1, currentIndex + Number(direction || 0)));
  const nextKey = zoomKeys[nextIndex] || "fit";
  return graphZoomOption(nextKey, zoomOptions);
}
