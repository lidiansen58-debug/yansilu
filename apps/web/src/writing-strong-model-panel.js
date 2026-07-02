export function renderWritingStrongModelSummaryDom({
  writingState = {},
  panelState = {},
  strongModelState = {},
  basketIds = [],
  strongModelButton = null,
  strongModelSummary = null,
  describeWritingStrongModelIdleSummary = () => ""
} = {}) {
  const strongModelBasketIds = basketIds;
  if (strongModelButton) {
    strongModelButton.disabled = panelState.strongModelButtonState.disabled;
    strongModelButton.textContent = panelState.strongModelButtonState.text;
  }
  if (strongModelSummary) {
    const result = writingState.strongModelResult;
    const request = result?.request;
    const artifactCount = Number(result?.result?.summary?.artifactCount || result?.result?.artifacts?.length || 0);
    if (writingState.strongModelError) {
      strongModelSummary.textContent = `AI 写作检查准备失败：${writingState.strongModelError}`;
    } else if (writingState.strongModelLoading) {
      strongModelSummary.textContent = "正在准备 AI 写作检查请求...";
    } else if (request) {
      strongModelSummary.textContent = result?.result
        ? `已整理 ${artifactCount} 条写作建议，全部进入系统消息，等你决定是否采用。`
        : `已准备 ${request.model?.model || "strong_model"} 请求包；当前没有直接调用远程模型。`;
    } else {
      strongModelSummary.textContent = describeWritingStrongModelIdleSummary({
        basketCount: strongModelBasketIds.length,
        strongModelStateHint: strongModelState.hint
      });
    }
  }
  return strongModelBasketIds;
}
