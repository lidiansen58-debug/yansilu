const text = value => typeof value === "string" ? value.trim() : "";
const compact = value => text(value).replace(/\s+/g, " ");

export function sourceDistillationContract() {
  return { draft: {
    title: "short viewpoint title",
    coreArgument: "one clear, provisional claim in own words",
    content: "brief explanation grounded in the supplied source, not an outline",
    questions: "uncertainty or boundary to confirm; empty if none",
    sourceNoteIds: ["provided source note id"],
    evidenceQuote: "short exact excerpt supporting the claim"
  } };
}

export function sourceDistillationInstructions() {
  return [
    "只根据提供的材料，提出一条供用户修改和确认的观点草稿。只输出符合 draft 约定的 JSON。",
    "coreArgument 用自己的语言写一句清楚的判断；content 简短说明为什么，不写目录或操作建议。",
    "不要假装这是用户已认可的观点。保留材料中的条件与不确定性，不把个别经历推广成普遍事实。",
    "不得编造事实、例子或来源。sourceNoteIds 只能使用提供的 ID，evidenceQuote 必须逐字引用所提供的 excerpt。",
    "材料不足以形成观点时返回 {\"draft\":null}，不要用套话填充。标题、观点、说明和问题使用写作目标的语言。"
  ];
}

export function normalizeSourceDistillationResponse(request, parsed) {
  const draft = parsed?.draft;
  if (!draft || !text(draft.title) || !text(draft.coreArgument) || !text(draft.content) || typeof draft.questions !== "string") {
    throw new Error("AI 没有生成完整的观点草稿，原笔记未修改。请补充材料后重试。");
  }
  const excerpts = request.sourceDistillContext?.sourceExcerpts || {};
  if (!Array.isArray(draft.sourceNoteIds) || draft.sourceNoteIds.length !== 1 || typeof draft.sourceNoteIds[0] !== "string" || !Object.hasOwn(excerpts, draft.sourceNoteIds[0]) ||
    !compact(draft.evidenceQuote) || !compact(excerpts[draft.sourceNoteIds[0]]).includes(compact(draft.evidenceQuote))) {
    throw new Error("AI 观点草稿的依据不在来源材料中，结果未采用，原笔记未修改。");
  }
  const normalizedDraft = Object.fromEntries(["title", "coreArgument", "content", "questions", "evidenceQuote"].map(key => [key, text(draft[key])]));
  normalizedDraft.sourceNoteIds = [...draft.sourceNoteIds];
  return {
    draft: normalizedDraft,
    writingMoves: [{ title: normalizedDraft.title, moveType: "claim", text: normalizedDraft.coreArgument,
      sourceNoteIds: normalizedDraft.sourceNoteIds, whyItMatters: `依据原文：${normalizedDraft.evidenceQuote}` }],
    outlineDrafts: [], sourceGaps: []
  };
}
