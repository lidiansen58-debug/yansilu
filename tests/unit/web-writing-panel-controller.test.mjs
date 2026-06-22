import test from "node:test";
import assert from "node:assert/strict";

import {
  renderWritingFlowStepsDom
} from "../../apps/web/src/writing-panel-controller.js";

test("writing panel controller renders flow steps into the panel DOM", () => {
  const nodes = new Map([
    ["writingFlowSteps", { innerHTML: "" }]
  ]);

  renderWritingFlowStepsDom({
    $: (id) => nodes.get(id) || null,
    writingState: {
      project: {
        id: "project-1",
        scaffold_id: "",
        draft_note_id: "",
        preflight: { status: "ready", checks: [] }
      },
      scaffold: null
    },
    escapeHtml: (value) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }, {
    basketCount: 2,
    hasProject: true,
    projectEntry: { canCreateProject: false }
  });

  const html = nodes.get("writingFlowSteps").innerHTML;
  assert.match(html, /writing-flow-step is-done/);
  assert.match(html, /writing-flow-step is-active/);
  assert.match(html, /草稿骨架/);
});
