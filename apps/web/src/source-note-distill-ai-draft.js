function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripMarkdownTitle(body = "") {
  return String(body || "").replace(/^#\s+[^\n]*\n?/m, "").trim();
}

function firstUsefulLine(body = "") {
  return String(body || "")
    .split(/\r?\n/)
    .map((line) => cleanText(line.replace(/^[-*>\s#]+/u, "")))
    .find((line) => line && !/^来源笔记 ID[:：]/u.test(line)) || "";
}

function compactExcerpt(body = "", limit = 180) {
  const text = cleanText(stripMarkdownTitle(body));
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
}

function supportingExcerpt(input = {}) {
  const excerpt = compactExcerpt(input.sourceBody, 220);
  return excerpt ? `参考材料：${excerpt}` : "";
}

function draftTitle(sourceTitle = "", body = "") {
  const title = cleanText(sourceTitle).replace(/^未命名/u, "").trim();
  if (title) return title;
  const seed = firstUsefulLine(body);
  return seed ? seed.slice(0, 28) : "未命名永久笔记";
}

export function buildSourceNoteDistillDraft(input = {}) {
  const sourceType = cleanText(input.sourceType).toLowerCase();
  const title = draftTitle(input.sourceTitle, input.sourceBody);
  const excerpt = compactExcerpt(input.sourceBody);
  const isLiterature = sourceType === "literature";
  return {
    kind: "draft",
    title: "帮我提炼",
    draft: {
      title,
      coreArgument: isLiterature ? "把文献中的判断改写成一句自己的观点。" : "把材料中的想法改写成一句清楚的判断。",
      content: excerpt || "补上一段可长期保留的论述。",
      questions: isLiterature ? "这条判断的证据和边界是什么？" : "这条判断在哪些条件下不成立？"
    },
    autoWrite: false,
    requiresConfirmation: true
  };
}

function artifactPayload(artifact = {}) {
  return artifact?.payload && typeof artifact.payload === "object" ? artifact.payload : {};
}

function artifactText(artifact = {}) {
  const payload = artifactPayload(artifact);
  return cleanText(
    artifact.body ||
      artifact.summary ||
      payload.text ||
      payload.claim ||
      payload.gap ||
      payload.whyItMatters ||
      payload.why_it_matters
  );
}

function sourceNoteArtifacts(result = {}) {
  return [
    ...(Array.isArray(result?.result?.artifacts) ? result.result.artifacts : []),
    ...(Array.isArray(result?.artifacts) ? result.artifacts : [])
  ];
}

function rawWritingMoves(result = {}) {
  const raw = result?.result?.raw || result?.raw || {};
  return Array.isArray(raw.writingMoves || raw.writing_moves) ? raw.writingMoves || raw.writing_moves : [];
}

function rawOutlineDrafts(result = {}) {
  const raw = result?.result?.raw || result?.raw || {};
  return Array.isArray(raw.outlineDrafts || raw.outline_drafts) ? raw.outlineDrafts || raw.outline_drafts : [];
}

function rawSourceGaps(result = {}) {
  const raw = result?.result?.raw || result?.raw || {};
  return Array.isArray(raw.sourceGaps || raw.source_gaps) ? raw.sourceGaps || raw.source_gaps : [];
}

export function buildSourceNoteDistillDraftFromAiResult(result = {}, input = {}) {
  const artifacts = sourceNoteArtifacts(result);
  const writingMoves = artifacts.filter((artifact) => String(artifact?.type || "") === "WritingMove");
  const outlineDrafts = artifacts.filter((artifact) => String(artifact?.type || "") === "OutlineDraft");
  const sourceGaps = artifacts.filter((artifact) => String(artifact?.type || "") === "SourceGap");

  const rawMoves = rawWritingMoves(result);
  const rawOutlines = rawOutlineDrafts(result);
  const rawGaps = rawSourceGaps(result);
  const coreArgument =
    artifactText(writingMoves[0]) ||
    cleanText(rawMoves[0]?.text || rawMoves[0]?.body || rawMoves[0]?.summary);
  const outlineText =
    artifactText(outlineDrafts[0]) ||
    (Array.isArray(rawOutlines[0]?.sections) ? rawOutlines[0].sections.map(cleanText).filter(Boolean).join("\n") : "");
  const gapText =
    sourceGaps.map(artifactText).filter(Boolean).join("\n") ||
    rawGaps.map((gap) => cleanText(gap.gap || gap.claim || gap.summary)).filter(Boolean).join("\n");

  if (!coreArgument && !outlineText && !gapText) return null;
  const fallback = buildSourceNoteDistillDraft(input);
  const generatedContent = [
    outlineText,
    !outlineText && coreArgument ? `说明：${coreArgument}` : "",
    supportingExcerpt(input)
  ].filter(Boolean).join("\n\n");
  return {
    kind: "draft",
    title: "帮我提炼",
    draft: {
      title: cleanText(outlineDrafts[0]?.title || rawOutlines[0]?.title) || fallback.draft.title,
      coreArgument: coreArgument || fallback.draft.coreArgument,
      content: generatedContent || fallback.draft.content,
      questions: gapText || fallback.draft.questions
    },
    autoWrite: false,
    requiresConfirmation: true,
    modelUsed: true
  };
}
