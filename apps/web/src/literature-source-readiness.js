const text = value => String(value || "").trim();

export function literatureCitationReadiness(citation = {}) {
  const fields = Object.fromEntries(Object.entries(citation).map(([key, value]) => [key, text(value)]));
  const missingKeys = [];
  if (!fields.sourceTitle) missingKeys.push("sourceTitle");
  if (!fields.locator && !fields.identifier) missingKeys.push("locator");
  return {
    fields,
    complete: missingKeys.length === 0,
    missingKeys,
    missingLabels: missingKeys.map(key => key === "sourceTitle" ? "来源标题" : "页码、章节或链接")
  };
}

export function literatureSourceCompletion(fields = {}, { generatedOriginal = false, status = "draft" } = {}) {
  const citation = literatureCitationReadiness(fields.citation);
  const hasOriginalText = Boolean(text(fields.originalText));
  const hasParaphrase = Boolean(text(fields.paraphrase));
  const readyForOriginal = hasOriginalText && hasParaphrase && citation.complete;
  let label = "可转永久笔记";
  let hint = "现在创建永久笔记，写出自己的判断；原文和出处会保留在来源笔记。";
  let lane = "ready";
  if (generatedOriginal) {
    label = "已转永久笔记";
    hint = "打开已生成的永久笔记，继续完善自己的判断。";
  } else if (!citation.complete || !hasOriginalText) {
    lane = "refine";
    label = "待补来源";
    hint = !citation.complete ? `补充${citation.missingLabels.join("、")}。` : "先保留一段原文，方便以后核对。";
  } else if (!hasParaphrase) {
    lane = "pending";
    label = "待转述";
    hint = "在“我的理解”中用自己的话说明这段原文的意思。";
  }
  return {
    status: readyForOriginal && status === "active" ? "active" : "draft",
    hasParaphrase,
    hasOriginalText,
    hasJudgmentSeed: Boolean(text(fields.supportsJudgment)),
    hasQuestion: Boolean(text(fields.question)),
    readyForOriginal,
    hasCitationMetadata: citation.complete,
    missingCitationFields: citation.missingLabels,
    label,
    lane,
    tone: lane === "ready" ? "active" : "draft",
    hint
  };
}
