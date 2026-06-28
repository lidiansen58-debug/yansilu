export function graphVisualMapEmptyCopy({
  filterActive = false,
  modeLabel = "",
  relationType = "meaningful",
  graphViewModeForRelationType = (value) => value
} = {}) {
  if (filterActive) {
    return {
      title: "这条笔记周围暂时没有可见关系",
      message: "可能是这条笔记还没有建立正式关系，也可能是当前显示范围太窄。可以先补一条支持、限定或连接关系。"
    };
  }
  if (graphViewModeForRelationType(relationType) === "structure") {
    return {
      title: `${modeLabel}当前没有可见笔记`,
      message: "主题分布只看主题归属和知识分区。如果这里为空，可以切回看观点关系，或先为笔记补充主题归属。"
    };
  }
  return {
    title: `${modeLabel}当前没有可见笔记`,
    message: "当前筛选没有留下可读的观点关系。可以切到全部关系，或先从右侧待处理内容里判断潜在关联。"
  };
}

