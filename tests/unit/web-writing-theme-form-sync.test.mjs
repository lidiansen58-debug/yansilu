import test from "node:test";
import assert from "node:assert/strict";

import {
  isGeneratedWritingTitle,
  resolveWritingProjectFormTitle,
  syncWritingThemeFormFields
} from "../../apps/web/src/writing-theme-form-sync.js";

function createLookup(initialValues = {}) {
  const nodes = new Map(Object.entries(initialValues).map(([id, value]) => [id, { value }]));
  return {
    nodes,
    $: (id) => nodes.get(id) || null
  };
}

test("writing theme form sync replaces stale title and goal when switching themes", () => {
  const { $, nodes } = createLookup({
    writingTitle: "主题 A",
    writingGoal: "问题 A"
  });

  const result = syncWritingThemeFormFields({
    $,
    previousSelectedThemeIndexId: "theme-a",
    selectedThemeIndexId: "theme-b",
    indexCard: {
      title: "主题 B",
      central_question: "问题 B"
    },
    normalizeWritingProjectTitleSeed: (value) => String(value || "").trim(),
    suggestedWritingProjectTitle: () => "兜底标题"
  });

  assert.equal(result.themeChanged, true);
  assert.equal(nodes.get("writingTitle").value, "主题 B");
  assert.equal(nodes.get("writingGoal").value, "问题 B");
});

test("writing theme form sync preserves manual edits for the same selected theme", () => {
  const { $, nodes } = createLookup({
    writingTitle: "我手动改过的标题",
    writingGoal: "我手动改过的问题"
  });

  syncWritingThemeFormFields({
    $,
    previousSelectedThemeIndexId: "theme-b",
    selectedThemeIndexId: "theme-b",
    indexCard: {
      title: "主题 B",
      centralQuestion: "问题 B"
    },
    normalizeWritingProjectTitleSeed: (value) => String(value || "").trim()
  });

  assert.equal(nodes.get("writingTitle").value, "我手动改过的标题");
  assert.equal(nodes.get("writingGoal").value, "我手动改过的问题");
});

test("writing theme form sync fills empty fields for the first selected theme", () => {
  const { $, nodes } = createLookup({
    writingTitle: "",
    writingGoal: ""
  });

  syncWritingThemeFormFields({
    $,
    previousSelectedThemeIndexId: "",
    selectedThemeIndexId: "",
    indexCard: {
      title: "",
      summary: "用摘要作为中心问题"
    },
    noteIds: ["n1", "n2"],
    normalizeWritingProjectTitleSeed: (value) => String(value || "").trim(),
    suggestedWritingProjectTitle: (noteIds) => `来自 ${noteIds.length} 条笔记`
  });

  assert.equal(nodes.get("writingTitle").value, "来自 2 条笔记");
  assert.equal(nodes.get("writingGoal").value, "用摘要作为中心问题");
});

test("writing theme form sync uses the readable theme title without adding an internal suffix", () => {
  const { $, nodes } = createLookup({ writingTitle: "缺失笔记 等 11 条笔记 主题", writingGoal: "" });

  syncWritingThemeFormFields({
    $,
    previousSelectedThemeIndexId: "old-theme",
    selectedThemeIndexId: "theme-yijing",
    indexCard: { title: "卦象与变化模型", central_question: "变化如何帮助判断？" },
    normalizeWritingProjectTitleSeed: (value) => `${value} 主题`
  });

  assert.equal(nodes.get("writingTitle").value, "卦象与变化模型");
});

test("writing project form title replaces missing-note placeholders with its theme title", () => {
  assert.equal(isGeneratedWritingTitle("缺失笔记 等 11 条笔记 主题"), true);
  assert.equal(resolveWritingProjectFormTitle({
    project: { title: "缺失笔记 等 11 条笔记 主题" },
    indexCard: { title: "卦象与变化模型" }
  }), "卦象与变化模型");
  assert.equal(resolveWritingProjectFormTitle({
    project: { title: "我自己的文章题目" },
    indexCard: { title: "卦象与变化模型" }
  }), "我自己的文章题目");
});
