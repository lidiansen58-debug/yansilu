import test from "node:test";
import assert from "node:assert/strict";

import {
  renderDraftVersionCardView,
  renderWritingFlowStepsView,
  renderScaffoldVersionCardView,
  renderWritingProjectCardView,
  renderWritingStatusCardView,
  renderWritingToplineMetricView,
  writingFlowStepItems
} from "../../apps/web/src/writing-workspace-view.js";

test("writing workspace view renders status and topline metrics through stable markup", () => {
  const status = renderWritingStatusCardView("Material", "<ready>", "Use 3 notes", "good");
  const metric = renderWritingToplineMetricView("Draft", "Saved", "<current>", "warn");

  assert.match(status, /class="writing-status-card"/);
  assert.match(status, /data-tone="good"/);
  assert.match(status, /&lt;ready&gt;/);
  assert.match(metric, /class="writing-topline-metric"/);
  assert.match(metric, /data-tone="warn"/);
  assert.match(metric, /title="&lt;current&gt;"/);
});

test("writing flow steps mark the first incomplete step active", () => {
  const html = renderWritingFlowStepsView([
    { done: true, title: "Basket", note: "Ready" },
    { done: false, title: "Project", note: "Create next" },
    { done: false, title: "Draft", note: "Later" }
  ]);

  assert.match(html, /writing-flow-step is-done/);
  assert.match(html, /writing-flow-step is-active/);
  assert.match(html, /<strong>Project<\/strong>/);
});

test("writing flow step model derives project scaffold and draft state", () => {
  const steps = writingFlowStepItems({
    basketCount: 2,
    hasProject: true,
    projectEntry: { canCreateProject: false },
    writingState: {
      project: {
        id: "project-1",
        scaffold_id: "scaffold-1",
        draft_note_id: "",
        preflight: { status: "ready", checks: [] }
      },
      scaffold: {
        id: "scaffold-1",
        preflight: { checks: [] }
      }
    }
  });

  assert.equal(steps.length, 4);
  assert.equal(steps[0].done, true);
  assert.equal(steps[1].done, true);
  assert.equal(steps[2].done, true);
  assert.equal(steps[3].done, false);
});

test("writing project card exposes continuation and scaffold actions", () => {
  const html = renderWritingProjectCardView(
    {
      id: "project-1",
      title: "Project <one>",
      status: "active",
      scaffold_id: "scaffold-1",
      draft_note_id: "",
      basket_count: 2,
      basket_notes: [
        { id: "note-a", title: "Writing UI claim" },
        { id: "note-b", title: "Evidence UI map" }
      ],
      related_index_ids: ["theme-1"],
      goal: "Write clearly"
    },
    {
      renderThinkingStatusBadge: () => "<b>status</b>",
      writingProjectStatusLabel: (value) => `status:${value}`
    }
  );

  assert.match(html, /data-writing-project-id="project-1"/);
  assert.match(html, /项目：Project &lt;one&gt;/);
  assert.match(html, /Writing UI claim/);
  assert.match(html, /Evidence UI map/);
  assert.match(html, /data-writing-project-action="resume-scaffold"/);
  assert.match(html, /data-writing-project-action="copy-scaffold"/);
  assert.match(html, /<b>status<\/b>/);
});

test("writing scaffold and draft version cards keep action routing attributes", () => {
  const scaffold = renderScaffoldVersionCardView(
    { id: "scaffold-1", generated_by: "local", section_count: 4, version_note: "v1" },
    { activeScaffoldId: "scaffold-1" }
  );
  const draft = renderDraftVersionCardView(
    {
      id: "draft-version-1",
      version_no: 2,
      draft_note_id: "draft-1",
      source_scaffold_id: "scaffold-1",
      is_current: false,
      note: { title: "Draft", status: "draft" }
    },
    { writingProjectStatusLabel: (value) => `status:${value}` }
  );

  assert.match(scaffold, /writing-note-card selected/);
  assert.match(scaffold, /data-writing-scaffold-action="open"/);
  assert.match(scaffold, /data-writing-scaffold-action="edit-note"/);
  assert.match(draft, /data-writing-draft-version-id="draft-version-1"/);
  assert.match(draft, /data-writing-draft-action="set-current"/);
  assert.match(draft, /status:draft/);
});
