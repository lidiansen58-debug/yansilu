const ISSUE_LABELS = Object.freeze({
  contradiction: "观点矛盾",
  repetition: "章节重复",
  transition: "衔接跳跃",
  evidence_gap: "证据缺口",
  unclear: "表达不清"
});

const text = (value) => String(value || "").trim();
const quoteText = (value) => text(value).replace(/\s+/g, " ");
const sectionEvidenceText = (section = {}) => [text(section.heading), text(section.purpose)].filter(Boolean).join(" — ");
const repeatedClaimForSection = (section = {}) => quoteText(section.purpose || section.heading);

export function outlineCheckContract() {
  return { checks: [{
    kind: "contradiction|repetition|transition|evidence_gap|unclear",
    sectionNumbers: [1],
    problem: "brief diagnosis, not new prose",
    action: "brief suggested edit",
    sourceNoteIds: ["provided note id; empty for structural issues"],
    evidenceQuote: "verbatim excerpt for contradictions; otherwise empty",
    repeatedClaim: "same complete claim made by both sections; only for repetition",
    sectionEvidence: [{ sectionNumber: 1, quote: "entire exact heading and purpose; only for repetition" }]
  }] };
}

export function outlineCheckInstructions() {
  return [
    "Only return JSON matching checks. Check the currentOutline as written, not a new outline.",
    "First check for contradictions with the supplied notes and repeated sections; then check transitions and missing evidence.",
    "Use 1-based sectionNumbers to locate each issue in the supplied section array. Repetition must cite at least two sections.",
    "Repetition means the same claim or step is needlessly made twice, not merely the same subject or shared keywords. Related claims, principle versus method, complementary methods, objections and replies are NOT repetition.",
    "For repetition, report only when the complete purpose is identical across all cited sections (or the full heading when a purpose is empty). Copy each cited section's entire heading and purpose into sectionEvidence, not a short excerpt. repeatedClaim must exactly match that shared purpose or heading. If only the topic is shared, or the purposes differ, do not report repetition.",
    "重复不是主题相同：解释概念与检验记忆、定义与应用、支持与反驳，可以各自成节。只有重复同一判断或同一步骤且没有新增作用时才报重复。不要为凑建议数量挑毛病。",
    "总览/引入与正文展开、正文与结尾回顾，作用不同，不算重复。例：开头说明要改善睡眠，正文分别介绍运动和作息，不报重复；两个正文小节都只说同一项运动改善睡眠，才可能重复。",
    "Prioritize precision. Only report definite faults, not optional improvements. Compare the role AND claim of each section before reporting repetition. Introducing the scope versus explaining a method is not duplication.",
    "Do not report transition problems merely because an outline has no full prose or transition sentences. Require a concrete missing logical step between its stated purposes.",
    "For contradictions, sectionNumbers must point to the incorrect heading or purpose, not a later section that states the correct idea.",
    "Report each underlying problem once. Do not repeat one contradiction as an evidence gap or transition issue.",
    "Do not invent examples, facts, or evidence. Do not generate replacement prose or a replacement outline.",
    "For contradiction, cite a supplied sourceNoteId and copy the shortest exact evidenceQuote needed from that note's excerpt. Never invent note ids or quotes.",
    "For structure-only issues, sourceNoteIds may be empty. Evidence gaps describe what is missing, never fabricate it.",
    "Reply in the language of the writing goal. Return at most 4 checks, with short problem and action fields. Use checks:[] when no concrete issue is found."
  ];
}

export function normalizeOutlineCheckResponse(request, parsed) {
  const fail = (message) => { throw new Error(message); };
  if (!parsed || !Array.isArray(parsed.checks) || parsed.checks.length > 4) fail("AI 未返回有效的提纲检查结果，请重试。");
  const sections = request.outlineCheckContext?.sections || [];
  const excerpts = request.outlineCheckContext?.sourceExcerpts || {};
  const allowedIds = new Set(request.sourceNoteIds || []);
  const writingMoves = [];
  const sourceGaps = [];
  for (const check of parsed.checks) {
    const structural = ["repetition", "transition", "unclear"].includes(check?.kind);
    const sourceIds = check?.sourceNoteIds === undefined && structural ? [] : check?.sourceNoteIds;
    if (!check || !Object.hasOwn(ISSUE_LABELS, check.kind) || typeof check.problem !== "string" || !text(check.problem) || typeof check.action !== "string" || !text(check.action) ||
      !Array.isArray(check.sectionNumbers) || !check.sectionNumbers.length ||
      check.sectionNumbers.some((number) => !Number.isInteger(number) || number < 1 || number > sections.length) ||
      !Array.isArray(sourceIds) || sourceIds.some((id) => !allowedIds.has(id))) {
      fail("AI 提纲检查缺少有效位置或来源，结果未采用，请重试。");
    }
    const numbers = [...new Set(check.sectionNumbers)];
    if (check.kind === "repetition" && numbers.length < 2) fail("AI 未说明哪些章节重复，请重试。");
    let repetitionEvidence = "";
    if (check.kind === "repetition") {
      if (typeof check.repeatedClaim !== "string" || !text(check.repeatedClaim) || !Array.isArray(check.sectionEvidence) ||
        check.sectionEvidence.length !== numbers.length) fail("AI 未提供章节重复的具体依据，结果未采用，请重试。");
      const repeatedClaim = quoteText(check.repeatedClaim);
      if (numbers.some(number => repeatedClaim !== repeatedClaimForSection(sections[number - 1]))) {
        fail("AI 的重复判断没有与每个章节的完整要点一致，结果未采用，请重试。");
      }
      const cited = new Set();
      for (const evidence of check.sectionEvidence) {
        const number = evidence?.sectionNumber;
        const excerpt = typeof evidence?.quote === "string" ? quoteText(evidence.quote) : "";
        const section = sections[number - 1];
        if (!numbers.includes(number) || cited.has(number) || !excerpt || !section ||
          excerpt !== quoteText(sectionEvidenceText(section))) {
          fail("AI 的重复依据不在对应章节中，结果未采用，请重试。");
        }
        cited.add(number);
      }
      repetitionEvidence = `共同判断：${text(check.repeatedClaim)}\n${check.sectionEvidence.map(evidence => `第 ${evidence.sectionNumber} 节原文：${text(evidence.quote)}`).join("\n")}`;
    }
    const quote = quoteText(check.evidenceQuote);
    if ((check.kind === "contradiction" && !quote) || (quote && !sourceIds.some((id) => quoteText(excerpts[id]).includes(quote)))) {
      fail("AI 引用的依据不在来源笔记中，结果未采用，请重试。");
    }
    const location = numbers.map((number) => `第 ${number} 节「${sections[number - 1].heading}」`).join("、");
    const diagnosis = `${location}\n${text(check.problem)}\n建议：${text(check.action)}`;
    if (check.kind === "evidence_gap") {
      sourceGaps.push({ title: ISSUE_LABELS[check.kind], gap: text(check.problem), claim: diagnosis,
        relatedNoteIds: sourceIds, suggestedAction: text(check.action), requiredSourceType: "source" });
    } else {
      writingMoves.push({ title: ISSUE_LABELS[check.kind], moveType: "section_move", text: diagnosis,
        sourceNoteIds: sourceIds, whyItMatters: repetitionEvidence || (quote ? `依据原文：${text(check.evidenceQuote)}` : ""), suggestedLocation: "" });
    }
  }
  return { writingMoves, outlineDrafts: [], sourceGaps };
}
