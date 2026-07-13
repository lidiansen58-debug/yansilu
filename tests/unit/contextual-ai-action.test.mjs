import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTEXTUAL_AI_ACTION_STATUS,
  CONTEXTUAL_AI_ACTIONS,
  CONTEXTUAL_AI_TASK_LABELS,
  contextualAiAvailability,
  hasForbiddenContextualAiTerm,
  normalizeContextualAiResult
} from "../../apps/web/src/contextual-ai-action-model.js";
import { createContextualAiActionController } from "../../apps/web/src/contextual-ai-action-controller.js";
import {
  contextualAiActionIdFromElement,
  contextualAiResultInputValues,
  renderContextualAiResultPanel
} from "../../apps/web/src/contextual-ai-result-panel.js";

test("未配置 AI 时保留原上下文并进入启用状态", async () => {
  let enableRequest;
  const controller = createContextualAiActionController({
    ensureAvailable: async () => ({ ready: false, mode: "local" }),
    openEnableFlow: async (request) => { enableRequest = request; }
  });

  const state = await controller.run("check_outline", { returnContext: { projectId: "p-1", view: "writing" } });

  assert.equal(state.status, CONTEXTUAL_AI_ACTION_STATUS.needs_setup);
  assert.deepEqual(enableRequest.returnContext, { projectId: "p-1", view: "writing" });
});

test("AI 结果不会在运行时自动写入", async () => {
  let accepted = 0;
  const controller = createContextualAiActionController({
    ensureAvailable: async () => ({ ready: true, mode: "local" }),
    onAccept: async () => { accepted += 1; }
  });

  const state = await controller.run("check_outline", {}, async () => ({
    title: "主题草稿",
    suggestions: [{ title: "中心问题", text: "如何形成主题？" }]
  }));

  assert.equal(state.status, CONTEXTUAL_AI_ACTION_STATUS.awaiting_confirmation);
  assert.equal(accepted, 0);
  await controller.adopt("check_outline");
  assert.equal(accepted, 1);
});

test("远程 AI 首次发送内容前必须确认", async () => {
  let runCount = 0;
  const controller = createContextualAiActionController({
    ensureAvailable: async () => ({ ready: true, mode: "remote" }),
    confirmRemoteContent: async () => false
  });

  const state = await controller.run("check_outline", { noteIds: ["n-1"] }, async () => {
    runCount += 1;
    return {};
  });

  assert.equal(state.status, CONTEXTUAL_AI_ACTION_STATUS.needs_remote_confirmation);
  assert.equal(runCount, 0);
});

test("远程 AI 同一动作确认后不会重复确认", async () => {
  let confirmCount = 0;
  let runCount = 0;
  const controller = createContextualAiActionController({
    ensureAvailable: async () => ({ ready: true, mode: "remote" }),
    confirmRemoteContent: async () => {
      confirmCount += 1;
      return true;
    }
  });

  await controller.run("check_outline", { noteIds: ["n-1"] }, async () => {
    runCount += 1;
    return {};
  });
  await controller.run("check_outline", { noteIds: ["n-1"] }, async () => {
    runCount += 1;
    return {};
  });

  assert.equal(confirmCount, 1);
  assert.equal(runCount, 2);
});

test("结果最多保留三条建议并明确禁止自动写入", () => {
  const result = normalizeContextualAiResult({
    suggestions: [1, 2, 3, 4].map((n) => ({ text: String(n) })),
    recommendations: [1, 2, 3, 4, 5, 6].map((n) => ({ reason: String(n), target: { type: "permanent", id: `p${n}` } }))
  });
  assert.equal(result.suggestions.length, 3);
  assert.equal(result.recommendations.length, 5);
  assert.equal(result.requiresConfirmation, true);
  assert.equal(result.autoWrite, false);
});

test("写作分析 artifacts 会转为可见检查建议", () => {
  const result = normalizeContextualAiResult({
    result: {
      summary: { artifactCount: 3 },
      artifacts: [
        { type: "WritingMove", title: "补充过渡", summary: "段落之间缺少过渡。" },
        { type: "OutlineDraft", title: "调整提纲", payload: { sections: ["问题", "边界"], gaps: ["缺少例子"] } },
        { type: "SourceGap", title: "补证据", payload: { gap: "example_missing", claim: "需要一个案例。", suggestedAction: "find_supporting_note" } },
        { type: "WritingMove", title: "第四条", summary: "不应超过三条。" }
      ]
    }
  }, { kind: "suggestions" });

  assert.equal(result.suggestions.length, 3);
  assert.equal(result.suggestions[0].title, "补充过渡");
  assert.match(result.suggestions[1].value, /提纲/);
  assert.match(result.suggestions[2].value, /需要一个案例/);
  assert.doesNotMatch(result.suggestions[2].value, /find_supporting_note/);
});

test("推荐关联 artifacts 会转为只读推荐", () => {
  const result = normalizeContextualAiResult({
    artifacts: [
      {
        type: "LinkSuggestion",
        title: "目标笔记",
        summary: "讨论同一个中心问题。",
        payload: { rationale: "可以作为补充关系。", to: { id: "note_b", title: "目标笔记", kind: "note" } }
      },
      {
        type: "InsightCard",
        title: "不应显示",
        summary: "不是关系推荐。"
      },
      {
        type: "LinkSuggestion",
        title: "材料笔记",
        summary: "不是永久笔记。",
        payload: { target: { id: "m1", title: "材料笔记", type: "material" } }
      }
    ]
  }, { kind: "recommendations", context: { permanentNoteIds: ["note_b"] } });

  assert.equal(result.suggestions.length, 0);
  assert.equal(result.recommendations.length, 1);
  assert.equal(result.recommendations[0].title, "目标笔记");
  assert.match(result.recommendations[0].text, /补充关系/);
  assert.equal(result.recommendations[0].noteId, "note_b");
});

test("推荐关联混合返回不会保留可采用建议", () => {
  const result = normalizeContextualAiResult({
    suggestions: [{ title: "不应显示为建议", text: "不要采用" }],
    recommendations: [
      { title: "目标笔记", reason: "讨论同一问题。", note_id: "note_b" },
      { title: "材料笔记", reason: "不是永久笔记。", target: { id: "m1", type: "material" } },
      { title: "无目标", reason: "没有 noteId。", type: "permanent" }
    ]
  }, { kind: "recommendations", context: { permanent_note_ids: ["note_b"] } });
  const html = renderContextualAiResultPanel({
    actionId: "recommend_relation",
    status: CONTEXTUAL_AI_ACTION_STATUS.awaiting_confirmation,
    result: {
      ...result,
      suggestions: [{ title: "直接传入也不应可编辑", text: "不要采用" }]
    }
  });

  assert.equal(result.suggestions.length, 0);
  assert.equal(result.recommendations.length, 1);
  assert.match(html, /目标笔记/);
  assert.doesNotMatch(html, /不应显示为建议/);
  assert.doesNotMatch(html, /data-contextual-ai-value/);
  assert.doesNotMatch(html, /采用/);
});

test("推荐关联根据当前笔记选择另一端", () => {
  const result = normalizeContextualAiResult({
    artifacts: [
      {
        type: "LinkSuggestion",
        title: "关系建议",
        summary: "两条笔记讨论同一问题。",
        payload: {
          from: { id: "note_a", title: "另一条笔记", kind: "note" },
          to: { id: "note_current", title: "当前笔记", kind: "note" }
        }
      }
    ]
  }, { kind: "recommendations", context: { source_id: "note_current", permanentNoteIds: ["note_a", "note_current"] } });

  assert.equal(result.recommendations.length, 1);
  assert.equal(result.recommendations[0].noteId, "note_a");
  assert.equal(result.recommendations[0].title, "另一条笔记");
});

test("结构化 summary 不会显示为 object 字符串", () => {
  const result = normalizeContextualAiResult({
    summary: { artifactCount: 3 },
    suggestions: [{ text: "补证据" }]
  }, { kind: "suggestions" });

  assert.equal(result.summary, "");
});

test("非建议类顶层字段会归入对应结果", () => {
  const theme = normalizeContextualAiResult({
    title: "研究笔记流程",
    centralQuestion: "如何从材料形成主题？",
    reason: "都围绕同一问题。"
  }, { kind: "theme" });
  const outline = normalizeContextualAiResult({
    title: "文章提纲",
    sections: ["问题", "方法"]
  }, { kind: "outline" });
  const gap = normalizeContextualAiResult({
    title: "缺口",
    text: "缺少反例。"
  }, { kind: "gap" });

  assert.equal(theme.theme.centralQuestion, "如何从材料形成主题？");
  assert.deepEqual(outline.outline.sections, ["问题", "方法"]);
  assert.equal(gap.gap.text, "缺少反例。");
});

test("用户可见动作使用任务语言", () => {
  assert.deepEqual(contextualAiAvailability({ runtimeMode: "cloud_only", ready: true }), { ready: true, mode: "remote" });
  assert.deepEqual(Object.keys(CONTEXTUAL_AI_ACTIONS), [
    "distill_material",
    "check_note",
    "recommend_relation",
    "suggest_theme",
    "generate_outline",
    "check_outline",
    "find_gap"
  ]);
  assert.equal(CONTEXTUAL_AI_TASK_LABELS.distill_material, "帮我提炼");
  assert.equal(hasForbiddenContextualAiTerm(CONTEXTUAL_AI_TASK_LABELS.distill_material), false);
  assert.equal(hasForbiddenContextualAiTerm("artifact"), true);
});

test("统一边界识别所有主流程 AI 动作", async () => {
  const controller = createContextualAiActionController({
    ensureAvailable: async () => ({ ready: true, mode: "local" })
  });

  const state = await controller.run("suggest_theme", {}, async () => ({ title: "主题建议" }));

  assert.equal(state.actionId, "suggest_theme");
  assert.equal(state.status, CONTEXTUAL_AI_ACTION_STATUS.awaiting_confirmation);
  assert.equal(state.result.kind, "theme");
});

test("检查结果面板只展示建议和关闭按钮，不提供假确认动作", () => {
  const html = renderContextualAiResultPanel({
    actionId: "check_outline",
    status: CONTEXTUAL_AI_ACTION_STATUS.awaiting_confirmation,
    result: { suggestions: [{ title: "观点", text: "补充边界", editable: true }] }
  });
  assert.doesNotMatch(html, /data-contextual-ai-value/);
  assert.doesNotMatch(html, /<textarea/);
  assert.match(html, /补充边界/);
  assert.match(html, /关闭/);
  assert.doesNotMatch(html, /保留建议/);
  assert.doesNotMatch(html, /data-contextual-ai-adopt/);
});

test("远程确认在结果面板内完成，不依赖阻塞弹窗", () => {
  const html = renderContextualAiResultPanel({
    actionId: "check_outline",
    status: CONTEXTUAL_AI_ACTION_STATUS.needs_remote_confirmation
  });

  assert.match(html, /在线 AI 会发送当前选中的笔记内容/);
  assert.match(html, /data-contextual-ai-confirm-remote/);
  assert.match(html, /继续/);
  assert.match(html, /取消/);
});

test("结果面板没有可用内容时只允许关闭", () => {
  const html = renderContextualAiResultPanel({
    actionId: "check_outline",
    status: CONTEXTUAL_AI_ACTION_STATUS.awaiting_confirmation,
    result: { kind: "suggestions" }
  });

  assert.match(html, /没有生成可用建议/);
  assert.match(html, /关闭/);
  assert.doesNotMatch(html, /data-contextual-ai-adopt/);
});

test("结果面板展示非建议类内容供确认", () => {
  const draftHtml = renderContextualAiResultPanel({
    actionId: "distill_material",
    status: CONTEXTUAL_AI_ACTION_STATUS.awaiting_confirmation,
    result: {
      kind: "draft",
      draft: {
        title: "永久笔记草稿",
        coreArgument: "先记录问题，再整理结论。",
        questions: ["反例是什么？"]
      }
    }
  });
  const themeHtml = renderContextualAiResultPanel({
    actionId: "suggest_theme",
    status: CONTEXTUAL_AI_ACTION_STATUS.awaiting_confirmation,
    result: {
      kind: "theme",
      theme: {
        title: "研究笔记流程",
        centralQuestion: "如何从材料形成主题？",
        membershipReason: "这些笔记都围绕同一问题。"
      }
    }
  });
  const relationHtml = renderContextualAiResultPanel({
    actionId: "recommend_relation",
    status: CONTEXTUAL_AI_ACTION_STATUS.awaiting_confirmation,
    result: {
      kind: "recommendations",
      recommendations: [{ title: "目标笔记", text: "讨论同一个中心问题。" }]
    }
  });

  assert.match(draftHtml, /永久笔记草稿/);
  assert.match(draftHtml, /核心观点/);
  assert.match(draftHtml, /创建永久笔记/);
  assert.match(themeHtml, /中心问题/);
  assert.match(themeHtml, /如何从材料形成主题/);
  assert.match(themeHtml, /创建主题/);
  assert.match(relationHtml, /目标笔记/);
  assert.match(relationHtml, /关闭/);
  assert.doesNotMatch(relationHtml, /采用/);
  assert.doesNotMatch(relationHtml, /data-contextual-ai-value/);
  assert.match(renderContextualAiResultPanel({
    actionId: "recommend_relation",
    status: CONTEXTUAL_AI_ACTION_STATUS.ignored
  }), /已关闭/);
});

test("推荐结果摘要保持只读", () => {
  const html = renderContextualAiResultPanel({
    actionId: "recommend_relation",
    status: CONTEXTUAL_AI_ACTION_STATUS.awaiting_confirmation,
    result: { kind: "recommendations", summary: "暂时没有可推荐的关联。" }
  });

  assert.match(html, /暂时没有可推荐的关联/);
  assert.match(html, /关闭/);
  assert.doesNotMatch(html, /data-contextual-ai-value/);
  assert.doesNotMatch(html, /采用/);
});

test("summary-only 结果不会重复显示", () => {
  const html = renderContextualAiResultPanel({
    actionId: "check_outline",
    status: CONTEXTUAL_AI_ACTION_STATUS.awaiting_confirmation,
    result: { kind: "suggestions", summary: "暂无明确问题。" }
  });

  assert.equal((html.match(/暂无明确问题/g) || []).length, 1);
});

test("结果面板会收集编辑后的采用内容", () => {
  const values = contextualAiResultInputValues({
    querySelectorAll: () => [
      { getAttribute: (name) => name === "data-contextual-ai-field" ? "title" : "0", value: "  标题  " },
      { getAttribute: (name) => name === "data-contextual-ai-field" ? "content" : "1", value: "正文" }
    ]
  });

  assert.deepEqual(values, [
    { index: 0, field: "title", value: "标题" },
    { index: 1, field: "content", value: "正文" }
  ]);
});

test("结果面板会携带动作 id 供事件层分发", () => {
  const html = renderContextualAiResultPanel({
    actionId: "suggest_theme",
    status: CONTEXTUAL_AI_ACTION_STATUS.awaiting_confirmation,
    result: { kind: "theme", theme: { title: "主题" } }
  });
  const actionId = contextualAiActionIdFromElement({
    closest: (selector) => selector === "[data-contextual-ai-action-id]"
      ? { getAttribute: () => "suggest_theme" }
      : null
  });

  assert.match(html, /data-contextual-ai-action-id="suggest_theme"/);
  assert.equal(actionId, "suggest_theme");
});
