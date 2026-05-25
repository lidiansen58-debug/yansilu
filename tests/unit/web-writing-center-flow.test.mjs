import test from "node:test";
import assert from "node:assert/strict";

import {
  describeWritingMaterialStatus,
  describeWritingMaterialStepState,
  describeWritingScaffoldStepState,
  describeWritingDraftStepState,
  describeWritingStrongModelButtonLabel,
  describeWritingStrongModelIdleSummary,
  describeWritingStrongModelStatus,
  describeWritingBatchAppendStatus,
  planWritingCandidateFocus,
  describeWritingProjectEntryState,
  describeWritingProjectPreflight,
  describeWritingProjectStepState,
  describeWritingNextActionFromState,
  planWritingBasketEntry,
  resolveWritingSelectedThemeIndexId,
  resolveWritingSourceIndexIds,
  resolveWritingEntryTitle,
  groupWritingPreflightChecks,
  isWritingStrongModelReady
} from "../../apps/web/src/writing-center-flow.js";

test("writing center next action starts with material selection when basket is empty", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 0,
    hasProject: false,
    hasScaffold: false,
    hasDraft: false
  });

  assert.equal(action.title, "先选材料");
  assert.match(action.note, /写作篮/);
});

test("writing center next action moves to scaffold generation after project creation", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 2,
    hasProject: true,
    hasScaffold: false,
    hasDraft: false
  });

  assert.equal(action.title, "生成草稿骨架");
  assert.match(action.note, /生成草稿骨架/);
  assert.match(action.note, /章节|缺口|反方/);
});

test("writing center next action uses 创建项目 wording before a project exists", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 2,
    hasProject: false,
    hasScaffold: false,
    hasDraft: false
  });

  assert.equal(action.title, "创建项目");
  assert.match(action.note, /先创建项目再往下走/);
});

test("writing center next action prefers saving draft after scaffold is ready", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 2,
    hasProject: true,
    hasScaffold: true,
    hasDraft: false
  });

  assert.equal(action.title, "保存草稿");
  assert.match(action.note, /保存成草稿|保存草稿/);
});

test("writing center next action reflects warning preflight items before saving draft", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 2,
    hasProject: true,
    hasScaffold: true,
    hasDraft: false,
    warningCount: 2
  });

  assert.equal(action.title, "保存草稿");
  assert.match(action.note, /2/);
  assert.match(action.note, /提醒/);
});

test("writing center next action points to opening current draft once it exists", () => {
  const action = describeWritingNextActionFromState({
    basketCount: 2,
    hasProject: true,
    hasScaffold: true,
    hasDraft: true
  });

  assert.equal(action.title, "打开当前草稿");
  assert.match(action.note, /继续写作/);
});

test("writing material step explicitly mentions 写作篮 when no basket exists yet", () => {
  const step = describeWritingMaterialStepState({ basketCount: 0 });

  assert.equal(step.title, "选材料");
  assert.match(step.note, /写作篮/);
  assert.match(step.note, /2-5/);
});

test("writing material step reports how many notes are already in 写作篮", () => {
  const step = describeWritingMaterialStepState({ basketCount: 3 });

  assert.equal(step.title, "选材料");
  assert.equal(step.note, "3 条永久笔记已在写作篮");
});

test("writing center project step stays on missing structure when basket cannot create a project yet", () => {
  const step = describeWritingProjectStepState({
    basketCount: 1,
    hasProject: false,
    projectEntryStatus: "待创建",
    projectEntryHint: "还没到建项目时机；先补边界或关系。",
    canCreateProject: false
  });

  assert.equal(step.title, "创建项目");
  assert.match(step.note, /边界|关系/);
});

test("writing center project step returns to normal project framing once project creation is unlocked", () => {
  const step = describeWritingProjectStepState({
    basketCount: 2,
    hasProject: false,
    projectEntryStatus: "先创建项目",
    projectEntryHint: "当前材料已经到建项目阶段。",
    canCreateProject: true
  });

  assert.equal(step.title, "创建项目");
  assert.equal(step.note, "先明确题目和读者，再创建项目");
});

test("writing center project step shows 已创建项目 once a project already exists", () => {
  const step = describeWritingProjectStepState({
    basketCount: 2,
    hasProject: true,
    projectId: ""
  });

  assert.equal(step.title, "创建项目");
  assert.equal(step.note, "已创建项目");
});

test("writing scaffold step says 骨架已生成 once scaffold exists without blockers", () => {
  const step = describeWritingScaffoldStepState({
    hasScaffold: true,
    blockingCount: 0,
    warningCount: 0
  });

  assert.equal(step.title, "生成草稿骨架");
  assert.equal(step.note, "骨架已生成");
});

test("writing draft step says 可继续保存草稿 after scaffold exists but before a draft is saved", () => {
  const step = describeWritingDraftStepState({
    hasDraft: false,
    hasScaffold: true
  });

  assert.equal(step.title, "保存草稿");
  assert.equal(step.note, "可继续保存草稿");
});

test("writing draft step says 生成草稿骨架后再保存 before any scaffold exists", () => {
  const step = describeWritingDraftStepState({
    hasDraft: false,
    hasScaffold: false
  });

  assert.equal(step.title, "保存草稿");
  assert.equal(step.note, "生成草稿骨架后再保存");
});

test("writing basket entry appends incoming note ids instead of replacing an existing basket", () => {
  const plan = planWritingBasketEntry({
    existingNoteIds: ["n1", "n2"],
    incomingNoteIds: ["n2", "n3"]
  });

  assert.equal(plan.entryMode, "append");
  assert.equal(plan.hasExistingBasket, true);
  assert.deepEqual(plan.basketNoteIds, ["n1", "n2", "n3"]);
  assert.deepEqual(plan.addedNoteIds, ["n3"]);
});

test("writing basket entry starts a fresh basket when nothing exists yet", () => {
  const plan = planWritingBasketEntry({
    existingNoteIds: [],
    incomingNoteIds: ["n2", "n3"]
  });

  assert.equal(plan.entryMode, "replace");
  assert.equal(plan.hasExistingBasket, false);
  assert.deepEqual(plan.basketNoteIds, ["n2", "n3"]);
  assert.deepEqual(plan.addedNoteIds, ["n2", "n3"]);
});

test("writing entry title keeps existing context when appending into a non-empty basket", () => {
  const title = resolveWritingEntryTitle({
    entryMode: "append",
    requestedTitle: "Second Note 写作项目",
    existingTitle: "Existing Project Context"
  });

  assert.equal(title, "Existing Project Context");
});

test("writing entry title still uses requested title when starting a fresh basket", () => {
  const title = resolveWritingEntryTitle({
    entryMode: "replace",
    requestedTitle: "Fresh Note 写作项目",
    existingTitle: "Existing Project Context"
  });

  assert.equal(title, "Fresh Note 写作项目");
});

test("writing source index ids preserve existing theme provenance on append", () => {
  const sourceIndexIds = resolveWritingSourceIndexIds({
    existingSourceIndexIds: ["idx_existing"],
    incomingSourceIndexIds: [],
    preserveExisting: true
  });

  assert.deepEqual(sourceIndexIds, ["idx_existing"]);
});

test("writing source index ids merge incoming theme provenance without duplicates", () => {
  const sourceIndexIds = resolveWritingSourceIndexIds({
    existingSourceIndexIds: ["idx_existing"],
    incomingSourceIndexIds: ["idx_existing", "idx_new"],
    preserveExisting: true
  });

  assert.deepEqual(sourceIndexIds, ["idx_existing", "idx_new"]);
});

test("writing selected theme index stays on the current theme when merged provenance still includes it", () => {
  const selectedThemeIndexId = resolveWritingSelectedThemeIndexId({
    currentSelectedThemeIndexId: "idx_existing",
    nextSourceIndexIds: ["idx_existing", "idx_new"]
  });

  assert.equal(selectedThemeIndexId, "idx_existing");
});

test("writing selected theme index falls back to the only source theme when there is no current selection", () => {
  const selectedThemeIndexId = resolveWritingSelectedThemeIndexId({
    currentSelectedThemeIndexId: "",
    nextSourceIndexIds: ["idx_only"]
  });

  assert.equal(selectedThemeIndexId, "idx_only");
});

test("writing batch append status reports how many notes were newly added", () => {
  const message = describeWritingBatchAppendStatus({
    scopeLabel: "当前目录观点",
    addedCount: 2,
    totalCount: 3
  });

  assert.equal(message, "已把当前目录观点加入写作篮：2 条");
});

test("writing batch append status clearly reports when the whole scope is already in basket", () => {
  const message = describeWritingBatchAppendStatus({
    scopeLabel: "当前目录观点",
    addedCount: 0,
    totalCount: 3
  });

  assert.equal(message, "当前目录观点已都在写作篮中");
});

test("writing material status reframes strong-model-ready material to create-project before a project exists", () => {
  const material = describeWritingMaterialStatus({
    readinessLevel: "strong_model_ready",
    readinessStatus: "可进行强模型分析",
    readinessHint: "判断、边界、关系和主题线索都较完整，可以继续做项目和强模型分析。",
    hasProject: false
  });

  assert.equal(material.status, "先创建项目");
  assert.match(material.hint, /强模型分析前|先创建项目/);
});

test("writing material status keeps strong-model wording once a project already exists", () => {
  const material = describeWritingMaterialStatus({
    readinessLevel: "strong_model_ready",
    readinessStatus: "可进行强模型分析",
    readinessHint: "判断、边界、关系和主题线索都较完整，可以继续做项目和强模型分析。",
    hasProject: true
  });

  assert.equal(material.status, "可进行强模型分析");
  assert.match(material.hint, /强模型分析/);
});

test("writing strong-model status asks to create a project first when material is ready but project is missing", () => {
  const strongModel = describeWritingStrongModelStatus({
    hasProject: false,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "strong_model_ready",
    readinessHint: "判断、边界、关系和主题线索都较完整，可以继续做项目和强模型分析。",
    projectPreflightLevel: "unknown",
    projectPreflightChecksLength: 0,
    strongModelReady: false
  });

  assert.equal(strongModel.status, "先创建项目");
  assert.equal(strongModel.buttonLabel, "先创建项目");
  assert.match(strongModel.hint, /强模型分析前|先创建项目/);
});

test("writing strong-model status also creates a project first once material reaches project-ready", () => {
  const strongModel = describeWritingStrongModelStatus({
    hasProject: false,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "project_ready",
    readinessHint: "判断、边界、关系和主题线索已经够用，可以先创建项目。",
    projectPreflightLevel: "unknown",
    projectPreflightChecksLength: 0,
    strongModelReady: false
  });

  assert.equal(strongModel.status, "先创建项目");
  assert.equal(strongModel.buttonLabel, "先创建项目");
  assert.match(strongModel.hint, /创建项目阶段|先创建项目/);
});

test("writing strong-model status spells out distillation before project creation", () => {
  const strongModel = describeWritingStrongModelStatus({
    hasProject: false,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "needs_distillation",
    readinessHint: "先把 thesis 和三句话确认下来。",
    projectPreflightLevel: "unknown",
    projectPreflightChecksLength: 0,
    strongModelReady: false
  });

  assert.equal(strongModel.status, "先确认判断");
  assert.equal(strongModel.buttonLabel, "先确认判断/三句话");
  assert.match(strongModel.hint, /thesis|三句话/);
});

test("writing strong-model status blocks on authorship confirmation before project creation", () => {
  const strongModel = describeWritingStrongModelStatus({
    hasProject: false,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "blocked_authorship",
    readinessHint: "先完成作者/原创确认。",
    projectPreflightLevel: "unknown",
    projectPreflightChecksLength: 0,
    strongModelReady: false
  });

  assert.equal(strongModel.status, "先完成作者/原创确认");
  assert.equal(strongModel.buttonLabel, "先完成作者/原创确认");
  assert.match(strongModel.hint, /作者\/原创确认/);
});

test("writing strong-model status falls back to project-preflight gaps after a project exists", () => {
  const strongModel = describeWritingStrongModelStatus({
    hasProject: true,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "strong_model_ready",
    readinessHint: "判断、边界、关系和主题线索都较完整，可以继续做项目和强模型分析。",
    projectPreflightLevel: "needs_clarification",
    projectPreflightChecksLength: 2,
    strongModelReady: false
  });

  assert.equal(strongModel.status, "先澄清项目问题");
  assert.equal(strongModel.buttonLabel, "先澄清项目问题");
  assert.match(strongModel.hint, /先澄清项目关键问题/);
});

test("writing strong-model status distinguishes project gaps after a project exists", () => {
  const strongModel = describeWritingStrongModelStatus({
    hasProject: true,
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "strong_model_ready",
    readinessHint: "判断、边界、关系和主题线索都比较完整，可以继续做项目和强模型分析。",
    projectPreflightLevel: "has_gaps",
    projectPreflightChecksLength: 2,
    strongModelReady: false
  });

  assert.equal(strongModel.status, "先补项目缺口");
  assert.equal(strongModel.buttonLabel, "先补项目缺口");
  assert.match(strongModel.hint, /2 项缺口/);
});

test("writing strong-model idle summary reuses the current strong-model state hint when basket exists", () => {
  const summary = describeWritingStrongModelIdleSummary({
    basketCount: 2,
    strongModelStateHint: "当前材料已经到强模型分析前的就绪阶段；先创建项目，再继续后续分析。"
  });

  assert.match(summary, /先创建项目/);
});

test("writing strong-model idle summary falls back to basket guidance when basket is empty", () => {
  const summary = describeWritingStrongModelIdleSummary({
    basketCount: 0,
    strongModelStateHint: ""
  });

  assert.match(summary, /先把永久笔记加入写作篮/);
});

test("writing strong-model button label says 写作篮 when basket is empty", () => {
  const label = describeWritingStrongModelButtonLabel({
    basketCount: 0,
    loading: false,
    stateButtonLabel: ""
  });

  assert.equal(label, "先加入写作篮");
});

test("writing strong-model button label reuses state label once basket exists", () => {
  const label = describeWritingStrongModelButtonLabel({
    basketCount: 2,
    loading: false,
    stateButtonLabel: "先创建项目"
  });

  assert.equal(label, "先创建项目");
});

test("writing center preflight grouping separates blocking warning and pass checks", () => {
  const groups = groupWritingPreflightChecks({
    checks: [
      { id: "intent", status: "pass", label: "Writing intent" },
      { id: "distillation", status: "warning", label: "Confirmed distillation" },
      { id: "blocking-gap", status: "blocked", label: "Critical gap" }
    ]
  });

  assert.equal(groups.passes.length, 1);
  assert.equal(groups.warnings.length, 1);
  assert.equal(groups.blocking.length, 1);
});

test("writing center project preflight summary distinguishes needs_clarification from has_gaps", () => {
  const unknown = describeWritingProjectPreflight(null);
  const ready = describeWritingProjectPreflight({
    status: "ready",
    checks: []
  });
  const clarification = describeWritingProjectPreflight({
    status: "needs_clarification",
    checks: [{ code: "missing_intent", severity: "next", message: "Clarify what this writing project is trying to say." }]
  });
  const gaps = describeWritingProjectPreflight({
    status: "has_gaps",
    checks: [{ code: "missing_central_question", severity: "hint", message: "Add or choose a topic with a central question." }]
  });

  assert.equal(unknown.level, "unknown");
  assert.match(unknown.hint, /项目已创建；系统正在判断这个项目还缺什么/);
  assert.equal(ready.level, "ready");
  assert.match(ready.hint, /生成草稿骨架/);
  assert.equal(clarification.level, "needs_clarification");
  assert.match(clarification.hint, /Clarify what this writing project is trying to say/);
  assert.equal(gaps.level, "has_gaps");
  assert.match(gaps.hint, /central question/);
});

test("writing center strong-model gate requires both strong_model_ready basket state and ready project preflight", () => {
  assert.equal(
    isWritingStrongModelReady({ readinessLevel: "strong_model_ready", projectPreflightLevel: "ready" }),
    true
  );
  assert.equal(
    isWritingStrongModelReady({ readinessLevel: "strong_model_ready", projectPreflightLevel: "needs_clarification" }),
    false
  );
  assert.equal(
    isWritingStrongModelReady({ readinessLevel: "project_ready", projectPreflightLevel: "ready" }),
    false
  );
});

test("writing center project entry stays loading until relation counts are ready", () => {
  const entry = describeWritingProjectEntryState({
    relationCountsReady: false,
    relationCountsErrored: false,
    readinessLevel: "project_ready"
  });

  assert.equal(entry.canCreateProject, false);
  assert.equal(entry.status, "读取中");
  assert.match(entry.hint, /正在读取显式关系/);
});

test("writing center project entry reports relation fetch failures separately", () => {
  const entry = describeWritingProjectEntryState({
    relationCountsReady: false,
    relationCountsErrored: true,
    readinessLevel: "project_ready"
  });

  assert.equal(entry.canCreateProject, false);
  assert.equal(entry.status, "读取失败");
  assert.match(entry.hint, /显式关系读取失败/);
});

test("writing center project entry only opens creation once basket readiness reaches project stage", () => {
  const ready = describeWritingProjectEntryState({
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "project_ready"
  });
  const blocked = describeWritingProjectEntryState({
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "basket_ready"
  });

  assert.equal(ready.canCreateProject, true);
  assert.equal(ready.status, "先创建项目");
  assert.equal(ready.actionLabel, "创建项目");
  assert.match(ready.hint, /创建项目阶段/);
  assert.equal(blocked.canCreateProject, false);
  assert.equal(blocked.status, "先补关系/边界");
  assert.equal(blocked.actionLabel, "先补关系/边界");
  assert.match(blocked.hint, /边界|关系/);
});

test("writing center project entry spells out distillation before project creation", () => {
  const entry = describeWritingProjectEntryState({
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "needs_distillation"
  });

  assert.equal(entry.canCreateProject, false);
  assert.equal(entry.status, "先确认判断");
  assert.equal(entry.actionLabel, "先确认判断/三句话");
  assert.match(entry.hint, /thesis|三句话/);
});

test("writing center project entry blocks on authorship confirmation before project creation", () => {
  const entry = describeWritingProjectEntryState({
    relationCountsReady: true,
    relationCountsErrored: false,
    readinessLevel: "blocked_authorship"
  });

  assert.equal(entry.canCreateProject, false);
  assert.equal(entry.status, "先完成作者/原创确认");
  assert.equal(entry.actionLabel, "先完成作者/原创确认");
  assert.match(entry.hint, /作者\/原创确认/);
});
test("writing candidate focus prefers the current graph slice when focused ids are present", () => {
  const plan = planWritingCandidateFocus({
    candidateNoteIds: ["n-dir-1", "n-graph-1", "n-dir-2", "n-graph-2"],
    focusedNoteIds: ["n-graph-2", "n-missing", "n-graph-1"],
    focusedScopeLabel: "当前图谱切片"
  });

  assert.deepEqual(plan.noteIds, ["n-graph-2", "n-graph-1"]);
  assert.equal(plan.usingFocusedScope, true);
  assert.equal(plan.scopeLabel, "当前图谱切片");
  assert.equal(plan.addActionLabel, "把当前图谱切片加入写作篮");
});

test("writing candidate focus falls back to current directory when no graph slice is focused", () => {
  const plan = planWritingCandidateFocus({
    candidateNoteIds: ["n-dir-1", "n-dir-2"],
    focusedNoteIds: [],
    focusedScopeLabel: "当前图谱切片"
  });

  assert.deepEqual(plan.noteIds, ["n-dir-1", "n-dir-2"]);
  assert.equal(plan.usingFocusedScope, false);
  assert.equal(plan.scopeLabel, "当前目录观点");
  assert.equal(plan.addActionLabel, "把当前目录观点加入写作篮");
});
