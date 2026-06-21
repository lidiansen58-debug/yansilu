import assert from "node:assert/strict";
import test from "node:test";

import {
  createGraphIsolatedRelationController
} from "../../apps/web/src/graph-isolated-relation-controller.js";
import {
  graphRelationRationaleIsActionable
} from "../../apps/web/src/graph-ai-candidates.js";

const confirmableRelationTypes = new Set(["supports", "contradicts", "qualifies", "bridges", "same_topic", "associated_with"]);
const normalizeMode = (value = "") => String(value || "").trim().toLowerCase() === "manual" ? "manual" : "ai";

function createElement({ value = "", textContent = "", attrs = {} } = {}) {
  const classes = new Set();
  return {
    value,
    textContent,
    hidden: false,
    attrs: new Map(Object.entries(attrs)),
    classList: {
      add(name) {
        classes.add(name);
      },
      remove(name) {
        classes.delete(name);
      },
      toggle(name, force) {
        const active = Boolean(force);
        if (active) classes.add(name);
        else classes.delete(name);
        return active;
      },
      contains(name) {
        return classes.has(name);
      }
    },
    getAttribute(name) {
      return this.attrs.get(name) || "";
    },
    setAttribute(name, nextValue) {
      this.attrs.set(name, String(nextValue));
    },
    removeAttribute(name) {
      this.attrs.delete(name);
    }
  };
}

function createForm({ noteId = "source-note", controls = {}, all = {} } = {}) {
  const error = createElement();
  const controlMap = new Map(Object.entries(controls));
  const allMap = new Map(Object.entries(all));
  const form = {
    getAttribute(name) {
      return name === "data-source-note" ? noteId : "";
    },
    querySelector(selector) {
      if (selector === "[data-graph-isolated-form-error]") return error;
      return controlMap.get(selector) || null;
    },
    querySelectorAll(selector) {
      return allMap.get(selector) || [];
    },
    closest() {
      return null;
    },
    error
  };
  for (const control of controlMap.values()) {
    control.closest = (selector) => selector === "[data-graph-isolated-relation-form]" ? form : null;
  }
  for (const items of allMap.values()) {
    for (const item of items) {
      item.closest = (selector) => selector === "[data-graph-isolated-relation-form]" ? form : null;
    }
  }
  return form;
}

function baseController({ graphState = { isolatedRelationDraftByNoteId: {} }, saveConfirmedRelation = async () => true, setWorkflowActiveTab = null } = {}) {
  return createGraphIsolatedRelationController({
    graphState,
    normalizeMode,
    setWorkflowActiveTab: setWorkflowActiveTab || ((_noteId, tabKey) => normalizeMode(tabKey)),
    confirmableRelationTypes,
    rationaleIsActionable: graphRelationRationaleIsActionable,
    saveConfirmedRelation
  });
}

test("graph isolated relation controller keeps validation errors inside the overlay", async () => {
  let confirmed = false;
  const controller = baseController({
    saveConfirmedRelation: async () => {
      confirmed = true;
      return true;
    }
  });
  const form = createForm({
    controls: {
      "[data-graph-relation-source-mode]": createElement({ value: "manual" }),
      "[data-graph-ai-candidate-select]": createElement(),
      "[data-graph-manual-target-id]": createElement({ value: "target-note" }),
      "[data-graph-isolated-relation-type]": createElement({ value: "associated_with" }),
      "[data-graph-isolated-rationale]": createElement({ value: "我确认“甲”和“乙”应该关联，因为：________。" }),
      "[data-graph-isolated-insight-question]": createElement()
    }
  });
  const button = { closest: (selector) => selector === "[data-graph-isolated-relation-form]" ? form : null };

  const saved = await controller.saveRelationForm(button);

  assert.equal(saved, false);
  assert.equal(confirmed, false);
  assert.match(form.error.textContent, /请把关联理由写完整/);
});

test("graph isolated relation controller rejects invalid relation types before saving", async () => {
  let confirmed = false;
  const controller = baseController({
    saveConfirmedRelation: async () => {
      confirmed = true;
      return true;
    }
  });
  const form = createForm({
    controls: {
      "[data-graph-relation-source-mode]": createElement({ value: "manual" }),
      "[data-graph-ai-candidate-select]": createElement(),
      "[data-graph-manual-target-id]": createElement({ value: "target-note" }),
      "[data-graph-isolated-relation-type]": createElement({ value: "no_relation" }),
      "[data-graph-isolated-rationale]": createElement({ value: "甲能作为乙的边界条件，因为它说明了适用范围。" }),
      "[data-graph-isolated-insight-question]": createElement()
    }
  });
  const button = { closest: (selector) => selector === "[data-graph-isolated-relation-form]" ? form : null };

  const saved = await controller.saveRelationForm(button);

  assert.equal(saved, false);
  assert.equal(confirmed, false);
  assert.match(form.error.textContent, /请选择一种可以保存为正式关系的类型/);
});

test("graph isolated relation controller does not overwrite user rationale when picking a manual target", () => {
  const graphState = { isolatedRelationDraftByNoteId: {} };
  const controller = baseController({ graphState });
  const rationaleInput = createElement({
    value: "用户自己写好的关系理由。",
    attrs: { "data-graph-rationale-source": "manual" }
  });
  const button = createElement({
    textContent: "目标笔记",
    attrs: {
      "data-graph-pick-manual-target": "target-note",
      "data-graph-manual-title": "目标笔记",
      "data-graph-manual-rationale": "系统模板理由，不应该覆盖。"
    }
  });
  const form = createForm({
    noteId: "current",
    controls: {
      "[data-graph-relation-source-mode]": createElement({ value: "manual" }),
      "[data-graph-ai-candidate-select]": createElement(),
      "[data-graph-manual-target-id]": createElement(),
      "[data-graph-manual-target-search]": createElement(),
      "[data-graph-manual-target-status]": createElement(),
      "[data-graph-isolated-rationale]": rationaleInput,
      "[data-graph-isolated-relation-type]": createElement({ value: "associated_with", attrs: { "data-graph-default-relation-type": "associated_with" } }),
      "[data-graph-isolated-insight-question]": createElement({ value: "old question" })
    },
    all: {
      "[data-graph-pick-manual-target]": [button]
    }
  });
  rationaleInput.closest = (selector) => selector === "[data-graph-isolated-relation-form]" ? form : null;
  button.closest = (selector) => selector === "[data-graph-isolated-relation-form]" ? form : null;

  controller.markRationaleUserEdited(rationaleInput);
  controller.pickManualRelationTarget(button);

  assert.equal(rationaleInput.value, "用户自己写好的关系理由。");
  assert.equal(rationaleInput.getAttribute("data-graph-rationale-source"), "user");
});

test("graph isolated relation controller keeps AI and manual drafts separate", () => {
  const graphState = { isolatedRelationDraftByNoteId: {} };
  const controller = baseController({ graphState });
  const modeInput = createElement({ value: "manual" });
  const aiOption = createElement({
    attrs: {
      "data-graph-relation-type": "supports",
      "data-graph-rationale-draft": "AI 生成的理由，不应该覆盖用户输入。",
      "data-graph-insight-question-draft": "AI question"
    }
  });
  const aiSelect = createElement({ value: "ai-target" });
  aiSelect.selectedOptions = [aiOption];
  const relationSelect = createElement({ value: "bridges" });
  const rationaleInput = createElement({
    value: "用户已经写好的关联理由，不应该被 AI 覆盖。",
    attrs: { "data-graph-rationale-source": "user" }
  });
  const form = createForm({
    noteId: "current",
    controls: {
      "[data-graph-relation-source-mode]": modeInput,
      "[data-graph-ai-candidate-select]": aiSelect,
      "[data-graph-manual-target-id]": createElement({ value: "manual-target" }),
      "[data-graph-manual-target-search]": createElement({ value: "Manual Target" }),
      "[data-graph-isolated-rationale]": rationaleInput,
      "[data-graph-isolated-relation-type]": relationSelect,
      "[data-graph-isolated-insight-question]": createElement({ value: "manual question" })
    }
  });

  controller.captureDraftFromForm(form);
  modeInput.value = "ai";
  controller.syncAiCandidateForm(aiSelect);

  assert.equal(relationSelect.value, "supports");
  assert.equal(rationaleInput.value, "AI 生成的理由，不应该覆盖用户输入。");
  assert.equal(rationaleInput.getAttribute("data-graph-rationale-source"), "ai");
  assert.deepEqual(graphState.isolatedRelationDraftByNoteId.current, {
    mode: "ai",
    targetNoteId: "ai-target",
    aiTargetNoteId: "ai-target",
    manualTargetNoteId: "manual-target",
    manualSearchText: "Manual Target",
    relationType: "supports",
    rationale: "AI 生成的理由，不应该覆盖用户输入。",
    rationaleSource: "ai",
    insightQuestion: "AI question",
    aiRelationType: "supports",
    aiRationale: "AI 生成的理由，不应该覆盖用户输入。",
    aiRationaleSource: "ai",
    aiInsightQuestion: "AI question",
    manualRelationType: "bridges",
    manualRationale: "用户已经写好的关联理由，不应该被 AI 覆盖。",
    manualRationaleSource: "user",
    manualInsightQuestion: "manual question"
  });
});

test("graph isolated relation controller clears stale manual target when search text changes", () => {
  const graphState = { isolatedRelationDraftByNoteId: {} };
  const controller = baseController({ graphState });
  const searchInput = createElement({ value: "new", attrs: { "data-selected-title": "Old Target" } });
  const hiddenTarget = createElement({ value: "old-target" });
  const rationaleInput = createElement({ value: "Manual template", attrs: { "data-graph-rationale-source": "manual" } });
  const status = createElement();
  const button = createElement({ attrs: { "data-graph-manual-search-text": "old target" } });
  const form = createForm({
    noteId: "current",
    controls: {
      "[data-graph-relation-source-mode]": createElement({ value: "manual" }),
      "[data-graph-ai-candidate-select]": createElement(),
      "[data-graph-manual-target-id]": hiddenTarget,
      "[data-graph-manual-target-search]": searchInput,
      "[data-graph-manual-target-list]": { querySelectorAll: () => [button] },
      "[data-graph-manual-target-status]": status,
      "[data-graph-isolated-rationale]": rationaleInput,
      "[data-graph-isolated-relation-type]": createElement({ value: "associated_with" }),
      "[data-graph-isolated-insight-question]": createElement()
    },
    all: {
      "[data-graph-pick-manual-target]": [button]
    }
  });
  searchInput.closest = (selector) => selector === "[data-graph-isolated-relation-form]" ? form : null;

  controller.filterManualRelationTargets(searchInput);

  assert.equal(hiddenTarget.value, "");
  assert.equal(rationaleInput.value, "");
  assert.equal(rationaleInput.getAttribute("data-graph-rationale-source"), "");
  assert.equal(searchInput.getAttribute("data-selected-title"), "");
  assert.equal(button.hidden, true);
  assert.match(status.textContent, /没有找到匹配/);
});
