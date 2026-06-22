export const GRAPH_VISUAL_ZOOM_OPTIONS = {
  fit: { label: "鍏ㄨ", scale: 1, note: "鐪嬫暣浣撶粨鏋?", icon: "fit" },
  read: { label: "鏀惧ぇ", scale: 1.35, note: "璇荤瑪璁版爣棰?", icon: "read" },
  detail: { label: "缁嗚妭", scale: 1.75, note: "妫€鏌ュ叧绯荤嚎", icon: "detail" }
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
