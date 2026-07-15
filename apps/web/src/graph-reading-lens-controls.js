export const GRAPH_READING_LENS_META = {
  insight: {
    key: "insight",
    label: "结构",
    hint: "看清当前笔记和周围笔记的主要连接。"
  },
  bridge: {
    key: "bridge",
    label: "补关系",
    hint: "突出还没连起来、关系不清或需要补说明的地方。"
  },
  argument: {
    key: "argument",
    label: "论证",
    hint: "突出证据、反方和边界，判断想法是否站得住。"
  }
};

export function graphReadingLensMeta(value = "insight") {
  const key = String(value || "insight").trim().toLowerCase();
  return GRAPH_READING_LENS_META[key] || GRAPH_READING_LENS_META.insight;
}

export function renderGraphReadingLensControls() {
  return "";
}
