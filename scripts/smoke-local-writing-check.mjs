import { buildWritingStrongModelRequest, mergeWritingStrongModelResponse } from "../packages/ai-orchestrator/src/writing-analysis.mjs";
import { runWritingStrongModelAnalysis } from "../packages/ai-orchestrator/src/analysis-executor.mjs";
import { createOpenAiCompatibleProviderAdapter } from "../packages/ai-orchestrator/src/openai-compatible-adapter.mjs";
import { getProviderPreset } from "../packages/ai-orchestrator/src/provider-presets.mjs";
import { createOpenAiCompatibleExecutor } from "../packages/ai-orchestrator/src/openai-compatible-executor.mjs";
import { buildComparisonExperiment, comparisonExperimentChecks, isolatedComparisonTasks, isolatedComparisonMessages } from "./writing-comparison-experiment.mjs";
import { buildStructuralFixture, structuralFixtureChecksPassed } from "./writing-structural-fixtures.mjs";

const model = process.env.OLLAMA_MODEL || "qwen2.5:7b";
const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const cleanOutline = process.argv.includes("--clean");
const noThinking = process.argv.includes("--no-thinking");
const transferCase = process.argv.includes("--transfer");
const splitChecks = process.argv.includes("--split");
const focusedChecks = process.argv.includes("--focused");
const auditTrace = process.argv.includes("--audit-trace");
const compactContract = process.argv.includes("--compact-contract");
const comparisonClassifier = process.argv.includes("--comparison-classifier");
const isolatedComparisons = process.argv.includes("--isolated-comparisons");
const structuralKind = process.argv.find(arg => arg.startsWith("--structure="))?.split("=")[1];
const structuralFixture = structuralKind ? buildStructuralFixture(structuralKind, cleanOutline) : null;
if (structuralFixture && (splitChecks || focusedChecks || auditTrace || compactContract || comparisonClassifier || isolatedComparisons || transferCase)) {
  throw new Error("Structural fixtures require the full production diagnostic request");
}
const outputBudgetArg = process.argv.find(arg => arg.startsWith("--output-tokens="));
const outputBudget = outputBudgetArg ? Number(outputBudgetArg.split("=")[1]) : null;
if (outputBudgetArg && (!Number.isInteger(outputBudget) || outputBudget < 700 || outputBudget > 4000)) {
  throw new Error("Output token experiment requires an integer from 700 to 4000");
}
const input = {
  privacyMode: "local_only",
  writingGoal: "如何判断读书后是否真正理解？请检查现有提纲的问题。",
  currentOutline: { title: "如何检验理解", sections: cleanOutline ? [
    { heading: "为什么要检验理解", purpose: "熟悉原文不等于理解，要分别检查解释能力和脱离材料后的回忆。", sourceNoteIds: ["test_explain", "test_recall"] },
    { heading: "用解释检验理解", purpose: "用自己的语言说明概念及因果，解释不清的地方回原文核对。", sourceNoteIds: ["test_explain"] },
    { heading: "主动回忆找漏洞", purpose: "合上书检查能否回忆内容，找出遗漏；这是与解释能力互补的检查方法。", sourceNoteIds: ["test_recall"] }
  ] : [
    { heading: "背得流畅就说明理解", purpose: "只要完整背出原文，就不需要解释原因。", sourceNoteIds: ["test_explain"] },
    { heading: "主动回忆找漏洞", purpose: "合上书用自己的话解释，卡住时回原文核对。", sourceNoteIds: ["test_recall"] },
    { heading: "主动回忆找漏洞", purpose: "再次介绍主动回忆发现理解缺口。", sourceNoteIds: ["test_recall"] }
  ], openQuestions: [] },
  notes: [
    { noteId: "test_explain", title: "用解释检验理解", body: "能够用自己的语言解释概念，才说明真正理解。合上书解释时的卡顿会暴露理解漏洞。流畅背诵不代表理解因果。" },
    { noteId: "test_recall", title: "主动回忆发现漏洞", body: "合上书主动回忆，能发现理解中的缺口。解释不清的地方需要核对材料。初学者仍需要先阅读，回忆不能替代阅读。" }
  ]
};
if (transferCase) {
  input.writingGoal = "怎样提高工作质量？请检查现有提纲。";
  input.notes = [
    { noteId: "test_hours", title: "工时与质量", body: "更长的工时不保证更好的质量。检查错误和获得反馈能改善成果，但不能保证消除所有错误。" },
    { noteId: "test_feedback", title: "反馈改进", body: "把草稿交给同事检查，记录错误并修改，可以改善工作质量。自我检查和同事反馈是互补的方式。" }
  ];
  input.currentOutline = { title: "改善工作质量", sections: cleanOutline ? [
    { heading: "质量不只靠工时", purpose: "不能仅靠延长工时，要检查错误并取得反馈。", sourceNoteIds: ["test_hours"] },
    { heading: "自己检查", purpose: "独立核对成果，找出不符合要求的地方。", sourceNoteIds: ["test_feedback"] },
    { heading: "请同事反馈", purpose: "同事提供不同视角，再据此修改成果。", sourceNoteIds: ["test_feedback"] }
  ] : [
    { heading: "长工时保证高质量", purpose: "只要延长工时就一定能获得高质量成果。", sourceNoteIds: ["test_hours"] },
    { heading: "同事检查草稿", purpose: "请同事检查草稿，记录错误并修改。", sourceNoteIds: ["test_feedback"] },
    { heading: "请同事核对草稿", purpose: "把草稿交给同事检查，发现错误后修改，没有额外步骤。", sourceNoteIds: ["test_feedback"] }
  ], openQuestions: [] };
}
if (structuralFixture) Object.assign(input, structuralFixture.input);
const request = buildWritingStrongModelRequest(input, { model: { provider: "ollama_local_gateway", model: `ollama_local_gateway:${model}`, tier: "local_private" } });
if (outputBudget !== null) request.executionDefaults = { ...request.executionDefaults, maxOutputTokens: outputBudget };
if (auditTrace) {
  const payload = JSON.parse(request.messages[1].content);
  payload.instructions = [
    "先逐节核对章节的具体判断与其 sourceNoteIds 对应的 notes.excerpt；在 sourceComparisons 中写明是否存在方向相反的判断及原句。措辞不同不是矛盾。",
    "再逐对比较章节实际做什么；在 pairComparisons 中写明两节是否重复同一判断或操作、是否有新增作用。总览与展开、不同方法、相反判断不是重复。",
    "最后只将明确的问题放入 checks；不要为凑数量给建议。没有问题返回 checks:[]。",
    "contradiction 必须指向错误的章节并引用来源原句；repetition 必须定位至少两节并分别引用其 heading 或 purpose 原句。",
    "只输出一个 JSON 对象，包含 sourceComparisons、pairComparisons、checks。比较过程不是修改建议，不放入 checks。"
  ];
  request.messages = [
    { role: "system", content: "你是提纲核对员。先记录逐节来源核对和逐对章节比较，再据此给出明确错误。不可混淆待检查的章节与来源笔记。只输出 JSON。" },
    { role: "user", content: JSON.stringify(payload) }
  ];
}
if (compactContract) {
  const original = JSON.parse(buildWritingStrongModelRequest(input).messages[1].content);
  request.messages = [
    { role: "system", content: "检查提纲中的明确错误，不写文章。待检查章节不是来源。先独立核对每节与来源的冲突，再比较章节是否重复同一判断或步骤。只输出 JSON 对象，顶层 checks 是数组。没有明确问题返回 {\"checks\":[]}。" },
    { role: "user", content: JSON.stringify({
      writingGoal: input.writingGoal,
      outlineSectionsToReview: original.currentOutline.sections,
      sourceNotesForVerification: original.notes.map(note => ({ noteId: note.noteId, excerpt: note.excerpt })),
      rules: [
        "只报告确定错误，最多4项。不同方法、总览与展开、相反观点不算重复。",
        "每项必填 kind、sectionNumbers、problem、action、sourceNoteIds。kind 只能是 contradiction、repetition、transition、evidence_gap、unclear。sectionNumbers 是待检查章节的编号数组。problem 具体解释哪里错，action 给修改方向。",
        "contradiction 指章节判断与来源明确相反。sourceNoteIds 填来源 noteId，evidenceQuote 复制该来源 excerpt 的连续原句。定位错误章节，不是后面正确的章节。",
        "repetition 指至少两节重复同一判断或步骤且无新增作用。sourceNoteIds 可为空数组，repeatedClaim 写共同的完整判断或步骤，sectionEvidence 为每一节提供 sectionNumber 和 quote；quote 必须复制那一节 heading 或 purpose 中的连续原文，不可复制来源。",
        "不要省略 action，不要复制字段说明作为答案，不要编造 ID 或引文。"
      ]
    }) }
  ];
}
const executor = createOpenAiCompatibleExecutor({ networkEnabled: true });
const adapter = createOpenAiCompatibleProviderAdapter({
  descriptor: { ...getProviderPreset("ollama_local_gateway"), endpointUrl: `${baseUrl}/v1/chat/completions` },
  networkEnabled: true, createExecutor: true,
  ...(noThinking ? { executor: (compatible, original) => executor({ ...compatible, body: { ...compatible.body, reasoning_effort: "none" } }, original) } : {})
});
const started = Date.now();
let providerOutput;
let providerUsage;
const observedAdapter = { ...adapter, complete: async (...args) => {
  const response = await adapter.complete(...args);
  const sent = adapter.lastCompatibleRequest?.body;
  if (JSON.stringify(sent?.messages) !== JSON.stringify(args[0]?.messages)) {
    throw new Error("Smoke transport changed diagnostic messages");
  }
  providerOutput = response.output;
  providerUsage = response.usage;
  return response;
} };
try {
  let result;
  if (isolatedComparisons) {
    const tasks = isolatedComparisonTasks(buildComparisonExperiment(request));
    const judgments = [];
    for (const task of tasks) {
      const response = await observedAdapter.complete({ modelRef: request.model.model, messages: isolatedComparisonMessages(task),
        output: { mode: "json" }, settings: { temperature: 0, maxOutputTokens: 500 },
        policy: { privacyMode: "local_only", allowCloud: false, allowFallback: false } });
      if (response.status !== "succeeded") throw new Error(response.error?.message || "Isolated comparison failed");
      const judgment = { ...response.output?.json, id: task.id, ...(task.type === "source" ? { sourceNoteId: task.sources[0].noteId } : {}) };
      console.log(JSON.stringify({ taskId: task.id, judgment, usage: response.usage }));
      comparisonExperimentChecks({ tasks: [task] }, { judgments: [judgment] });
      judgments.push(judgment);
    }
    result = mergeWritingStrongModelResponse(request, comparisonExperimentChecks({ tasks }, { judgments }));
  } else if (comparisonClassifier) {
    const experiment = buildComparisonExperiment(request);
    const response = await observedAdapter.complete({ modelRef: request.model.model, messages: experiment.messages,
      output: { mode: "json" }, settings: { temperature: 0, maxOutputTokens: request.executionDefaults.maxOutputTokens },
      policy: { privacyMode: "local_only", allowCloud: false, allowFallback: false } });
    if (response.status !== "succeeded") throw new Error(response.error?.message || "Comparison provider failed");
    result = mergeWritingStrongModelResponse(request, comparisonExperimentChecks(experiment, response.output?.json));
  } else if (focusedChecks) {
    const original = JSON.parse(request.messages[1].content);
    const checks = [];
    for (const focus of ["source", "pair"]) {
      const sections = focus === "source" ? original.currentOutline.sections.slice(0, 1) : original.currentOutline.sections.slice(1);
      const noteIds = new Set(sections.flatMap(section => section.sourceNoteIds));
      const phaseRequest = { ...request, messages: [
        { role: "system", content: focus === "source"
          ? "逐句核对这一节的判断与来源。明确相反的判断是 contradiction；不能因为措辞不同就当成矛盾。必须引用来源原句。只输出指定 JSON。"
          : "比较这两节是否重复同一判断或步骤而没有新增作用。相同主题、不同方法不是重复。重复时定位两节，并分别复制两节的 heading 或 purpose 原文。只输出指定 JSON。" },
        { role: "user", content: JSON.stringify({
          task: focus === "source" ? "source_conflict_check" : "section_pair_check",
          writingGoal: input.writingGoal, sections,
          ...(focus === "source" ? { notes: original.notes.filter(note => noteIds.has(note.noteId)) } : {}),
          requiredOutputShape: { checks: [focus === "source" ? {
            kind: "contradiction", sectionNumbers: [sections[0].sectionNumber],
            problem: "与来源相反的具体判断", action: "简短修改建议",
            sourceNoteIds: ["所提供的来源笔记 ID"], evidenceQuote: "来源中的原文"
          } : {
            kind: "repetition", sectionNumbers: sections.map(section => section.sectionNumber),
            problem: "两节为何重复而没有新增作用", action: "简短修改建议", sourceNoteIds: [],
            repeatedClaim: "两节共同的完整判断或操作",
            sectionEvidence: sections.map(section => ({ sectionNumber: section.sectionNumber, quote: "该节 heading 或 purpose 的原文" }))
          }] },
          allowedKinds: focus === "source" ? ["contradiction"] : ["repetition"],
          noProblem: { checks: [] }
        }) }
      ] };
      const phaseResult = await runWritingStrongModelAnalysis(phaseRequest, observedAdapter);
      const allowed = focus === "source" ? "contradiction" : "repetition";
      if (phaseResult.raw.checks.some(check => check.kind !== allowed)) throw new Error("Focused check returned a different task");
      checks.push(...phaseResult.raw.checks);
    }
    result = mergeWritingStrongModelResponse(request, { checks });
  } else if (splitChecks) {
    const checks = [];
    for (const focus of ["source", "structure"]) {
      const payload = JSON.parse(request.messages[1].content);
      payload.checkFocus = focus;
      payload.instructions = payload.instructions.filter(instruction => !instruction.startsWith("先逐节") && !instruction.startsWith("最后检查"));
      payload.instructions.unshift(focus === "source"
        ? "本轮只逐节核对来源冲突，输出 contradiction 或 evidence_gap；不要检查章节重复。不要把提纲本身当成来源。明确矛盾不能忽略。"
        : "本轮只比较章节结构，输出 repetition、transition 或 unclear。不要检查与来源的冲突。逐对比较章节判断和作用。重复依据必须复制 heading 或 purpose，不能复制来源。" );
      const phaseRequest = { ...request, messages: [
        { role: "system", content: focus === "source" ? "你是来源核对员。只核对章节与来源的明确冲突或依据缺口。只输出 JSON。" : "你是提纲结构检查员。只检查章节重复、逻辑跳跃和表达不清。只输出 JSON。" },
        { role: "user", content: JSON.stringify(payload) }
      ], executionDefaults: { ...request.executionDefaults, maxOutputTokens: Math.floor(request.executionDefaults.maxOutputTokens / 2) } };
      const phaseResult = await runWritingStrongModelAnalysis(phaseRequest, observedAdapter);
      const kinds = focus === "source" ? ["contradiction", "evidence_gap"] : ["repetition", "transition", "unclear"];
      checks.push(...phaseResult.raw.checks.filter(check => kinds.includes(check.kind)));
    }
    result = mergeWritingStrongModelResponse(request, { checks });
  } else {
    result = await runWritingStrongModelAnalysis(request, observedAdapter);
  }
  const fixtureChecksPassed = structuralFixture ? structuralFixtureChecksPassed(result.raw.checks, structuralFixture.expected) : cleanOutline ? result.raw.checks.length === 0 :
    result.raw.checks.some(check => check.kind === "contradiction" && JSON.stringify(check.sectionNumbers) === "[1]") &&
    result.raw.checks.some(check => check.kind === "repetition" && JSON.stringify([...check.sectionNumbers].sort()) === "[2,3]") &&
    result.raw.checks.length === 2;
  console.log(JSON.stringify({ model, noThinking, splitChecks, focusedChecks, auditTrace, compactContract, comparisonClassifier, isolatedComparisons, maxOutputTokens: request.executionDefaults.maxOutputTokens, domain: structuralFixture ? "quality-workflow" : transferCase ? "work-quality" : "reading", case: structuralFixture ? (cleanOutline ? "clean-structure" : structuralKind) : cleanOutline ? "complementary-sections" : "contradiction-and-repetition", latencyMs: Date.now() - started, fixtureChecksPassed, manualSemanticReviewRequired: true,
    structuralKind, promptCharacters: request.messages[1].content.length, summary: result.summary,
    checks: result.raw.checks, providerUsage, ...(auditTrace ? { sourceComparisons: result.raw.sourceComparisons, pairComparisons: result.raw.pairComparisons } : {}), provenance: result.provenance }, null, 2));
  if (!fixtureChecksPassed) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ model, latencyMs: Date.now() - started, message: error.message, code: error.code, providerOutput, providerUsage }));
  process.exitCode = 1;
}
