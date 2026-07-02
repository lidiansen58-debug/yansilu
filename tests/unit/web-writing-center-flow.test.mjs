import test from "node:test";
import assert from "node:assert/strict";

import {
  describeWritingBatchAppendStatus,
  describeWritingDraftStepState,
  describeWritingMaterialStatus,
  describeWritingMaterialStepState,
  describeWritingNextActionFromState,
  describeWritingProjectEntryState,
  describeWritingProjectPreflight,
  describeWritingProjectStepState,
  describeWritingScaffoldStepState,
  describeWritingStrongModelButtonLabel,
  describeWritingStrongModelIdleSummary,
  describeWritingStrongModelStatus,
  groupWritingPreflightChecks,
  isWritingStrongModelReady,
  planWritingBasketEntry,
  planWritingCandidateFocus,
  resolveWritingEntryTitle,
  resolveWritingSelectedThemeIndexId,
  resolveWritingSourceIndexIds
} from "../../apps/web/src/writing-center-flow.js";

test("writing center next action uses low-jargon four-step writing language", () => {
  assert.deepEqual(
    describeWritingNextActionFromState({ basketCount: 0, hasProject: false, hasScaffold: false, hasDraft: false }),
    {
      title: "选择相关笔记",
      note: "先把 2-5 条能支撑同一主题的永久笔记放到一起。"
    }
  );

  const theme = describeWritingNextActionFromState({ basketCount: 2, hasProject: false, hasScaffold: false, hasDraft: false });
  assert.equal(theme.title, "确定可写主题");
  assert.match(theme.note, /题目|读者|相关笔记/);

  const outline = describeWritingNextActionFromState({ basketCount: 2, hasProject: true, hasScaffold: false, hasDraft: false });
  assert.equal(outline.title, "生成文章提纲");
  assert.match(outline.note, /足够形成一篇文章|文章提纲/);

  const draft = describeWritingNextActionFromState({ basketCount: 2, hasProject: true, hasScaffold: true, hasDraft: false });
  assert.equal(draft.title, "保存草稿");
});

test("writing flow step labels avoid project and scaffold jargon", () => {
  assert.equal(describeWritingMaterialStepState({ basketCount: 0 }).title, "相关笔记");
  assert.match(describeWritingMaterialStepState({ basketCount: 3 }).note, /3 条永久笔记已选为相关笔记/);

  const projectStep = describeWritingProjectStepState({ basketCount: 2, canCreateProject: true });
  assert.equal(projectStep.title, "确定可写主题");
  assert.match(projectStep.note, /题目和读者/);

  const scaffoldStep = describeWritingScaffoldStepState({ hasScaffold: true, blockingCount: 0, warningCount: 0 });
  assert.equal(scaffoldStep.title, "生成文章提纲");
  assert.equal(scaffoldStep.note, "提纲已生成");

  const draftGap = describeWritingDraftStepState({ hasScaffold: true, projectPreflightLevel: "has_gaps" });
  assert.equal(draftGap.title, "先补主题缺口");
  assert.match(draftGap.note, /主题缺口/);

  const draftWaiting = describeWritingDraftStepState({ hasScaffold: false });
  assert.equal(draftWaiting.note, "生成文章提纲后再开始草稿");
});

test("writing basket entry planning still appends and preserves provenance", () => {
  const freshPlan = planWritingBasketEntry({
    existingNoteIds: [],
    incomingNoteIds: ["n2", "n3"]
  });
  assert.equal(freshPlan.entryMode, "replace");
  assert.equal(freshPlan.hasExistingBasket, false);
  assert.deepEqual(freshPlan.basketNoteIds, ["n2", "n3"]);
  assert.deepEqual(freshPlan.addedNoteIds, ["n2", "n3"]);

  const plan = planWritingBasketEntry({
    existingNoteIds: ["n1", "n2"],
    incomingNoteIds: ["n2", "n3"]
  });
  assert.equal(plan.entryMode, "append");
  assert.equal(plan.hasExistingBasket, true);
  assert.deepEqual(plan.basketNoteIds, ["n1", "n2", "n3"]);
  assert.deepEqual(plan.addedNoteIds, ["n3"]);

  assert.equal(
    resolveWritingEntryTitle({
      entryMode: "append",
      requestedTitle: "Second Note 写作主题",
      existingTitle: "Existing Project Context"
    }),
    "Existing Project Context"
  );

  assert.deepEqual(
    resolveWritingSourceIndexIds({
      existingSourceIndexIds: ["idx_existing"],
      incomingSourceIndexIds: ["idx_existing", "idx_new"],
      preserveExisting: true
    }),
    ["idx_existing", "idx_new"]
  );

  assert.equal(
    resolveWritingSelectedThemeIndexId({
      currentSelectedThemeIndexId: "idx_existing",
      nextSourceIndexIds: ["idx_existing", "idx_new"]
    }),
    "idx_existing"
  );
  assert.equal(
    resolveWritingSelectedThemeIndexId({
      currentSelectedThemeIndexId: "",
      nextSourceIndexIds: ["idx_only"]
    }),
    "idx_only"
  );
});

test("writing batch and candidate focus copy uses related-note language", () => {
  assert.equal(
    describeWritingBatchAppendStatus({ scopeLabel: "当前目录观点", addedCount: 2, totalCount: 3 }),
    "已把当前目录观点加入相关笔记：2 条"
  );
  assert.equal(
    describeWritingBatchAppendStatus({ scopeLabel: "当前目录观点", addedCount: 0, totalCount: 3 }),
    "当前目录观点已都在相关笔记中"
  );

  const focused = planWritingCandidateFocus({
    candidateNoteIds: ["n-dir-1", "n-graph-1", "n-dir-2", "n-graph-2"],
    focusedNoteIds: ["n-graph-2", "n-missing", "n-graph-1"],
    focusedScopeLabel: "当前图谱范围"
  });
  assert.deepEqual(focused.noteIds, ["n-graph-2", "n-graph-1"]);
  assert.equal(focused.addActionLabel, "加入当前图谱范围");

  const directory = planWritingCandidateFocus({
    candidateNoteIds: ["n-dir-1", "n-dir-2"],
    focusedNoteIds: [],
    focusedScopeLabel: "当前图谱范围"
  });
  assert.equal(directory.scopeLabel, "当前目录观点");
  assert.equal(directory.addActionLabel, "加入当前目录笔记");
});

test("writing material and AI states guide users through theme, outline, and draft", () => {
  const material = describeWritingMaterialStatus({
    readinessLevel: "strong_model_ready",
    readinessStatus: "可进行 AI 分析",
    readinessHint: "线索完整",
    hasProject: false
  });
  assert.equal(material.status, "先确定可写主题");
  assert.match(material.hint, /足够形成一篇文章/);

  const withTheme = describeWritingMaterialStatus({
    readinessLevel: "strong_model_ready",
    readinessStatus: "可进行 AI 分析",
    readinessHint: "线索完整",
    hasProject: true
  });
  assert.equal(withTheme.status, "相关笔记就绪");
  assert.match(withTheme.hint, /文章提纲|AI/);

  const ai = describeWritingStrongModelStatus({
    hasProject: false,
    relationCountsReady: true,
    readinessLevel: "project_ready"
  });
  assert.equal(ai.status, "先确定可写主题");
  assert.equal(ai.buttonLabel, "先确定可写主题");

  assert.match(describeWritingStrongModelIdleSummary({ basketCount: 0 }), /先选择相关笔记/);
  assert.equal(describeWritingStrongModelButtonLabel({ basketCount: 0 }), "先选择相关笔记");
  assert.equal(describeWritingStrongModelButtonLabel({ basketCount: 2 }), "先补相关笔记");
});

test("writing preflight and project entry use theme wording while preserving gates", () => {
  const groups = groupWritingPreflightChecks({
    checks: [
      { id: "intent", status: "pass" },
      { id: "distillation", status: "warning" },
      { id: "blocking-gap", status: "blocked" }
    ]
  });
  assert.equal(groups.passes.length, 1);
  assert.equal(groups.warnings.length, 1);
  assert.equal(groups.blocking.length, 1);

  const unknown = describeWritingProjectPreflight(null);
  assert.equal(unknown.level, "unknown");
  assert.match(unknown.hint, /主题已确定|这篇文章/);

  const ready = describeWritingProjectPreflight({ status: "ready", checks: [] });
  assert.equal(ready.level, "ready");
  assert.match(ready.hint, /文章提纲/);

  const clarification = describeWritingProjectPreflight({
    status: "needs_clarification",
    checks: [{ severity: "next", message: "先说清这篇文章到底想表达什么。" }]
  });
  assert.equal(clarification.level, "needs_clarification");
  assert.match(clarification.status, /关键问题/);

  const gaps = describeWritingProjectPreflight({
    status: "has_gaps",
    checks: [{ severity: "hint", message: "补一张主题或索引卡。" }]
  });
  assert.equal(gaps.level, "has_gaps");
  assert.match(gaps.status, /主题缺口/);

  const entry = describeWritingProjectEntryState({
    relationCountsReady: true,
    readinessLevel: "project_ready"
  });
  assert.equal(entry.canCreateProject, true);
  assert.equal(entry.status, "先确定可写主题");
  assert.equal(entry.actionLabel, "确定可写主题");

  assert.equal(
    isWritingStrongModelReady({ readinessLevel: "strong_model_ready", projectPreflightLevel: "ready" }),
    true
  );
  assert.equal(
    isWritingStrongModelReady({ readinessLevel: "project_ready", projectPreflightLevel: "ready" }),
    false
  );
}
);

test("writing project entry keeps blocking states explicit without old jargon", () => {
  const loading = describeWritingProjectEntryState({
    relationCountsReady: false,
    relationCountsErrored: false,
    readinessLevel: "project_ready"
  });
  assert.equal(loading.canCreateProject, false);
  assert.equal(loading.status, "读取中");
  assert.match(loading.hint, /可写主题/);

  const errored = describeWritingProjectEntryState({
    relationCountsReady: false,
    relationCountsErrored: true,
    readinessLevel: "project_ready"
  });
  assert.equal(errored.canCreateProject, false);
  assert.equal(errored.status, "读取失败");
  assert.match(errored.hint, /正式关系读取失败/);

  const needsDistillation = describeWritingProjectEntryState({
    relationCountsReady: true,
    readinessLevel: "needs_distillation"
  });
  assert.equal(needsDistillation.canCreateProject, false);
  assert.equal(needsDistillation.status, "先确认判断");
  assert.match(needsDistillation.actionLabel, /三句话/);

  const blockedAuthorship = describeWritingProjectEntryState({
    relationCountsReady: true,
    readinessLevel: "blocked_authorship"
  });
  assert.equal(blockedAuthorship.canCreateProject, false);
  assert.equal(blockedAuthorship.status, "先完成作者/原创确认");

  const needsStructure = describeWritingProjectEntryState({
    relationCountsReady: true,
    readinessLevel: "basket_ready"
  });
  assert.equal(needsStructure.canCreateProject, false);
  assert.equal(needsStructure.status, "先补关系/边界");
});

test("writing AI check states keep every gate readable", () => {
  const relationError = describeWritingStrongModelStatus({
    hasProject: false,
    relationCountsReady: false,
    relationCountsErrored: true,
    readinessLevel: "project_ready"
  });
  assert.equal(relationError.status, "读取失败");
  assert.match(relationError.buttonLabel, /关系读取失败/);

  const needsDistillation = describeWritingStrongModelStatus({
    hasProject: false,
    relationCountsReady: true,
    readinessLevel: "needs_distillation"
  });
  assert.equal(needsDistillation.status, "先确认判断");
  assert.match(needsDistillation.buttonLabel, /三句话/);

  const blockedAuthorship = describeWritingStrongModelStatus({
    hasProject: false,
    relationCountsReady: true,
    readinessLevel: "blocked_authorship"
  });
  assert.equal(blockedAuthorship.status, "先完成作者/原创确认");

  const clarification = describeWritingStrongModelStatus({
    hasProject: true,
    relationCountsReady: true,
    readinessLevel: "strong_model_ready",
    projectPreflightLevel: "needs_clarification",
    projectPreflightChecksLength: 1
  });
  assert.equal(clarification.status, "先澄清主题问题");
  assert.equal(clarification.buttonLabel, "先澄清主题问题");

  const gaps = describeWritingStrongModelStatus({
    hasProject: true,
    relationCountsReady: true,
    readinessLevel: "strong_model_ready",
    projectPreflightLevel: "has_gaps",
    projectPreflightChecksLength: 2
  });
  assert.equal(gaps.status, "先补主题缺口");
  assert.match(gaps.hint, /2 项缺口/);
});
