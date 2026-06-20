import assert from "node:assert/strict";
import test from "node:test";

import {
  aiCandidateDraftFromSelect,
  captureGraphIsolatedRelationDraftForState,
  clearGraphIsolatedRelationDraftForState,
  graphIsolatedRelationDraftForState,
  normalizeGraphRelationSourceMode
} from "../../apps/web/src/graph-relation-drafts.js";

function makeInput(value = "", attrs = {}) {
  const attrMap = new Map(Object.entries(attrs));
  return {
    value,
    getAttribute(name) {
      return attrMap.get(name) || "";
    },
    setAttribute(name, nextValue) {
      attrMap.set(name, String(nextValue));
    }
  };
}

function makeForm(noteId, controls = {}) {
  return {
    getAttribute(name) {
      return name === "data-source-note" ? noteId : "";
    },
    querySelector(selector) {
      return controls[selector] || null;
    }
  };
}

test("graph relation source mode falls back to AI", () => {
  assert.equal(normalizeGraphRelationSourceMode("manual"), "manual");
  assert.equal(normalizeGraphRelationSourceMode("AI"), "ai");
  assert.equal(normalizeGraphRelationSourceMode("unexpected"), "ai");
});

test("graph isolated relation draft keeps AI and manual work separate", () => {
  const graphState = { isolatedRelationDraftByNoteId: {} };
  const modeInput = makeInput("manual");
  const aiSelect = makeInput("ai-target");
  const manualTarget = makeInput("manual-target");
  const manualSearch = makeInput("Manual Target");
  const relationSelect = makeInput("bridges");
  const rationaleInput = makeInput("User-written relation reason.", { "data-graph-rationale-source": "user" });
  const questionInput = makeInput("manual question");
  const form = makeForm("current", {
    "[data-graph-relation-source-mode]": modeInput,
    "[data-graph-ai-candidate-select]": aiSelect,
    "[data-graph-manual-target-id]": manualTarget,
    "[data-graph-manual-target-search]": manualSearch,
    "[data-graph-isolated-rationale]": rationaleInput,
    "[data-graph-isolated-relation-type]": relationSelect,
    "[data-graph-isolated-insight-question]": questionInput
  });

  assert.equal(captureGraphIsolatedRelationDraftForState(graphState, form), true);
  assert.deepEqual(graphState.isolatedRelationDraftByNoteId.current, {
    mode: "manual",
    targetNoteId: "manual-target",
    aiTargetNoteId: "",
    manualTargetNoteId: "manual-target",
    manualSearchText: "Manual Target",
    relationType: "bridges",
    rationale: "User-written relation reason.",
    rationaleSource: "user",
    insightQuestion: "manual question",
    aiRelationType: "",
    aiRationale: "",
    aiRationaleSource: "",
    aiInsightQuestion: "",
    manualRelationType: "bridges",
    manualRationale: "User-written relation reason.",
    manualRationaleSource: "user",
    manualInsightQuestion: "manual question"
  });

  modeInput.value = "ai";
  relationSelect.value = "supports";
  rationaleInput.value = "AI-generated reason.";
  rationaleInput.setAttribute("data-graph-rationale-source", "ai");
  questionInput.value = "AI question";
  assert.equal(captureGraphIsolatedRelationDraftForState(graphState, form), true);

  assert.equal(graphState.isolatedRelationDraftByNoteId.current.manualTargetNoteId, "manual-target");
  assert.equal(graphState.isolatedRelationDraftByNoteId.current.manualRationale, "User-written relation reason.");
  assert.equal(graphState.isolatedRelationDraftByNoteId.current.aiTargetNoteId, "ai-target");
  assert.equal(graphState.isolatedRelationDraftByNoteId.current.aiRationale, "AI-generated reason.");
});

test("AI candidate select restores an edited draft for the same target", () => {
  const option = {
    getAttribute(name) {
      const attrs = {
        "data-graph-relation-type": "supports",
        "data-graph-rationale-draft": "Fallback AI reason.",
        "data-graph-insight-question-draft": "Fallback question"
      };
      return attrs[name] || "";
    }
  };
  const select = { value: "target-a", selectedOptions: [option] };

  assert.deepEqual(aiCandidateDraftFromSelect(select, {
    aiTargetNoteId: "target-a",
    aiRelationType: "bridges",
    aiRationale: "",
    aiRationaleSource: "user",
    aiInsightQuestion: "Edited question"
  }), {
    option,
    relationType: "bridges",
    rationale: "",
    rationaleSource: "user",
    insightQuestion: "Edited question"
  });
});

test("graph isolated relation draft clear removes only the requested note", () => {
  const graphState = {
    isolatedRelationDraftByNoteId: {
      one: { targetNoteId: "a" },
      two: { targetNoteId: "b" }
    }
  };
  assert.deepEqual(graphIsolatedRelationDraftForState(graphState, "one"), { targetNoteId: "a" });
  assert.equal(clearGraphIsolatedRelationDraftForState(graphState, "one"), true);
  assert.deepEqual(graphIsolatedRelationDraftForState(graphState, "one"), {});
  assert.deepEqual(graphIsolatedRelationDraftForState(graphState, "two"), { targetNoteId: "b" });
});
