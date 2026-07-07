export const GRAPH_FOCUS_DEPTH_KEY = "yansilu:graph:focus-depth";
export const GRAPH_FOCUS_CONTEXT_MODE_KEY = "yansilu:graph:focus-context-mode";

export function normalizeGraphFocusDepth(value = "", fallback = "1") {
  const key = String(value || "").trim().toLowerCase();
  if (key === "1" || key === "2" || key === "all") return key;
  return fallback;
}

export function graphFocusDepthMeta(value = "") {
  const key = normalizeGraphFocusDepth(value, "1");
  if (key === "2") return { key, label: "周边一层", note: "再显示相邻笔记继续连到的笔记。" };
  if (key === "all") return { key, label: "整组网络", note: "显示这组互相关联的笔记。" };
  return { key: "1", label: "当前关联", note: "只显示选中笔记直接相连的笔记。" };
}

export function setGraphFocusDepthForRuntime(graphState = {}, value = "", deps = {}) {
  const next = normalizeGraphFocusDepth(value, "1");
  graphState.focusDepth = next;
  if (deps.persist !== false) {
    const writeStoredText = deps.writeStoredText || (() => {});
    writeStoredText(GRAPH_FOCUS_DEPTH_KEY, next);
  }
  return next;
}

export function normalizeGraphFocusContextMode(value = "", fallback = "argument") {
  const key = String(value || "").trim().toLowerCase();
  if (key === "argument" || key === "writing") return key;
  return fallback;
}

export function graphFocusContextModeMeta(value = "") {
  const key = normalizeGraphFocusContextMode(value, "argument");
  if (key === "writing") {
    return {
      key,
      label: "写作怎么用",
      note: "优先看桥接、前后顺序和草稿入口，判断这条笔记能放进哪一段。"
    };
  }
  return {
    key: "argument",
    label: "观点怎么连",
    note: "优先看谁支持、谁反对、哪里需要限定，判断这条笔记在观点网络里的位置。"
  };
}

export function setGraphFocusContextModeForRuntime(graphState = {}, value = "", deps = {}) {
  const next = normalizeGraphFocusContextMode(value, "argument");
  graphState.focusContextMode = next;
  if (deps.persist !== false) {
    const writeStoredText = deps.writeStoredText || (() => {});
    writeStoredText(GRAPH_FOCUS_CONTEXT_MODE_KEY, next);
  }
  return next;
}
