export function buildGraphIsolatedDecisionNoteUpdate(input = {}, deps = {}) {
  const {
    note = {},
    mode = "keep",
    text = ""
  } = input;
  const {
    ensureEditableNoteBody = (body = "") => String(body || ""),
    graphUpsertMarkdownSection = (body = "") => String(body || ""),
    graphIsolatedDecisionTitle = (value = "") => String(value || ""),
    fallbackTitle = "未命名笔记",
    thesisHeading = "一句话论点",
    relationNoteHeading = "关联整理备注",
    rewriteRelationNote = "已重写中心判断。下一步：根据新的判断再寻找一条能说明理由的关系。"
  } = deps;
  const originalBody = ensureEditableNoteBody(note.body || `# ${note.title || fallbackTitle}\n`);
  const decisionTitle = graphIsolatedDecisionTitle(mode);
  const nextBody = mode === "rewrite"
    ? graphUpsertMarkdownSection(
        graphUpsertMarkdownSection(originalBody, thesisHeading, text),
        relationNoteHeading,
        rewriteRelationNote
      )
    : graphUpsertMarkdownSection(originalBody, relationNoteHeading, `${decisionTitle}：${text}`);

  return {
    originalBody,
    nextBody,
    decisionTitle,
    nextThesis: mode === "rewrite" ? text : note.thesis || ""
  };
}
