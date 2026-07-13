import { renderContextualAiResultPanel } from "./contextual-ai-result-panel.js";

export function renderWritingStrongModelSummaryDom({
  writingState = {},
  panelState = {},
  strongModelState = {},
  basketIds = [],
  strongModelButton = null,
  strongModelSummary = null,
  contextualAiState = null,
  describeWritingStrongModelIdleSummary = () => ""
} = {}) {
  const strongModelBasketIds = basketIds;
  if (strongModelButton) {
    strongModelButton.disabled = panelState.strongModelButtonState.disabled;
    strongModelButton.textContent = panelState.strongModelButtonState.text;
  }
  if (strongModelSummary) {
    if (contextualAiState?.actionId === "check_outline" && contextualAiState.status !== "idle") {
      strongModelSummary.innerHTML = renderContextualAiResultPanel(contextualAiState);
      return strongModelBasketIds;
    }
    const result = writingState.strongModelResult;
    const request = result?.request;
    const artifactCount = Number(result?.result?.summary?.artifactCount || result?.result?.artifacts?.length || 0);
    if (writingState.strongModelError) {
      strongModelSummary.textContent = `检查提纲失败：${writingState.strongModelError}`;
    } else if (writingState.strongModelLoading) {
      strongModelSummary.textContent = "正在检查提纲…";
    } else if (request) {
      strongModelSummary.textContent = result?.result
        ? `已整理 ${artifactCount} 条写作建议，请确认后再修改提纲。`
        : "检查结果已准备好，请确认后再修改提纲。";
    } else {
      strongModelSummary.textContent = describeWritingStrongModelIdleSummary({
        basketCount: strongModelBasketIds.length,
        strongModelStateHint: strongModelState.hint
      });
    }
  }
  return strongModelBasketIds;
}
