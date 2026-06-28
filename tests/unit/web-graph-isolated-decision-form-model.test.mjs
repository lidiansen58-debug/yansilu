import test from "node:test";
import assert from "node:assert/strict";

import {
  graphIsolatedDecisionCssEscape,
  graphIsolatedDecisionFormInput
} from "../../apps/web/src/graph-isolated-decision-form-model.js";

test("graph isolated decision form input reads note id mode and trimmed text", () => {
  const panel = {
    querySelector(selector) {
      if (selector === 'input[name="graph-isolated-decision-note-a"]:checked') return { value: "rewrite" };
      if (selector === '[data-graph-isolated-decision-text="note-a"]') return { value: "  rewrite this  " };
      return null;
    }
  };
  const button = {
    getAttribute(name) {
      return name === "data-graph-isolated-decision-save" ? " note-a " : "";
    },
    closest(selector) {
      return selector === ".graph-isolated-decision-form" ? panel : null;
    }
  };

  assert.deepEqual(graphIsolatedDecisionFormInput(button, {
    graphIsolatedDecisionMode: (value) => String(value || "keep").trim().toLowerCase()
  }), {
    noteId: "note-a",
    panel,
    escapedNoteId: "note-a",
    mode: "rewrite",
    text: "rewrite this"
  });
});

test("graph isolated decision form input handles missing note id", () => {
  const input = graphIsolatedDecisionFormInput(null, {
    graphIsolatedDecisionMode: () => "keep"
  });

  assert.equal(input.noteId, "");
  assert.equal(input.panel, null);
  assert.equal(input.mode, "keep");
  assert.equal(input.text, "");
});

test("graph isolated decision css escape covers selector quote and slash characters", () => {
  assert.equal(graphIsolatedDecisionCssEscape('a"b\\c'), 'a\\"b\\\\c');
});
