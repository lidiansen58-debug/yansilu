export function graphVisualMapEmptyCopy({
  filterActive = false,
  modeLabel = "",
  relationType = "meaningful",
  graphViewModeForRelationType = (value) => value
} = {}) {
  if (filterActive) {
    return {
      title: "这条笔记周围暂时没有可见关系",
      message: "可以先关联一条真正相关的笔记，或切到全部关系看看更完整的上下文。"
    };
  }
  if (graphViewModeForRelationType(relationType) === "structure") {
    return {
      title: `${modeLabel}当前没有可见笔记`,
      message: "这里主要看主题分布：笔记属于哪些主题。如果暂时为空，可以切到关系图，或先给笔记补充主题归属。"
    };
  }
  return {
    title: `${modeLabel}当前没有可见笔记`,
    message: "当前筛选下没有可读的观点关系。可以切到全部关系，或先处理右侧的待关联笔记。"
  };
}
