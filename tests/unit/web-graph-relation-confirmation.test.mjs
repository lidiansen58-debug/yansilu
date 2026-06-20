import assert from "node:assert/strict";
import test from "node:test";

import {
  readGraphIsolatedRelationFormValues,
  validateGraphIsolatedRelationFormValues
} from "../../apps/web/src/graph-relation-confirmation.js";

function control(value = "") {
  return { value };
}

function formWith(controls = {}, noteId = "source") {
  return {
    getAttribute(name) {
      return name === "data-source-note" ? noteId : "";
    },
    querySelector(selector) {
      return controls[selector] || null;
    }
  };
}

const confirmable = new Set(["supports", "contradicts", "qualifies", "bridges", "same_topic", "associated_with"]);

test("isolated relation confirmation reads manual target values", () => {
  const values = readGraphIsolatedRelationFormValues(formWith({
    "[data-graph-relation-source-mode]": control("manual"),
    "[data-graph-ai-candidate-select]": control("ai-target"),
    "[data-graph-manual-target-id]": control("manual-target"),
    "[data-graph-isolated-relation-type]": control("bridges"),
    "[data-graph-isolated-rationale]": control("A bridges B because it explains the missing transition."),
    "[data-graph-isolated-insight-question]": control("What transition is missing?")
  }), {
    normalizeMode: (value) => String(value || "").trim().toLowerCase() === "manual" ? "manual" : "ai"
  });

  assert.deepEqual(values, {
    noteId: "source",
    mode: "manual",
    targetNoteId: "manual-target",
    relationType: "bridges",
    rationale: "A bridges B because it explains the missing transition.",
    insightQuestion: "What transition is missing?"
  });
});

test("isolated relation confirmation rejects invalid or missing targets", () => {
  assert.deepEqual(validateGraphIsolatedRelationFormValues({
    noteId: "source",
    mode: "manual",
    targetNoteId: "",
    relationType: "associated_with",
    rationale: "Valid reason."
  }, { confirmableRelationTypes: confirmable }), {
    ok: false,
    errorKey: "missing_manual_target"
  });

  assert.deepEqual(validateGraphIsolatedRelationFormValues({
    noteId: "source",
    mode: "ai",
    targetNoteId: "source",
    relationType: "associated_with",
    rationale: "Valid reason."
  }, { confirmableRelationTypes: confirmable }), {
    ok: false,
    errorKey: "self_relation"
  });
});

test("isolated relation confirmation rejects non-confirmable type and placeholder rationale", () => {
  assert.deepEqual(validateGraphIsolatedRelationFormValues({
    noteId: "source",
    mode: "ai",
    targetNoteId: "target",
    relationType: "no_relation",
    rationale: "Valid reason."
  }, { confirmableRelationTypes: confirmable }), {
    ok: false,
    errorKey: "invalid_relation_type"
  });

  assert.deepEqual(validateGraphIsolatedRelationFormValues({
    noteId: "source",
    mode: "ai",
    targetNoteId: "target",
    relationType: "associated_with",
    rationale: "because: ______"
  }, {
    confirmableRelationTypes: confirmable,
    rationaleIsActionable: (value) => !String(value || "").includes("______")
  }), {
    ok: false,
    errorKey: "placeholder_rationale"
  });
});

test("isolated relation confirmation accepts a complete relation", () => {
  assert.deepEqual(validateGraphIsolatedRelationFormValues({
    noteId: "source",
    mode: "ai",
    targetNoteId: "target",
    relationType: "supports",
    rationale: "The target supplies evidence for the source claim."
  }, { confirmableRelationTypes: confirmable }), {
    ok: true,
    errorKey: ""
  });
});
