import test from "node:test";
import assert from "node:assert/strict";

import {
  renderWritingFlowStepsDom,
  renderWritingScaffoldPreviewDom
} from "../../apps/web/src/writing-panel-controller.js";

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

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
    escapeHtml
  }, {
    basketCount: 2,
    hasProject: true,
    projectEntry: { canCreateProject: false }
  });

  const html = nodes.get("writingFlowSteps").innerHTML;
  assert.match(html, /writing-flow-step is-done/);
  assert.match(html, /writing-flow-step is-active/);
});

test("writing panel controller renders scaffold preview empty continuity guidance", () => {
  const nodes = new Map([
    ["writingScaffoldPreview", { innerHTML: "" }]
  ]);

  renderWritingScaffoldPreviewDom({
    $: (id) => nodes.get(id) || null,
    state: {},
    writingState: {
      project: null,
      scaffold: null
    },
    currentWritingContinuationEntry: () => ({
      projectId: "project-1",
      status: "Existing project",
      actionLabel: "Continue project"
    }),
    describeWritingProjectPreflight: () => ({ level: "ready", status: "Ready", hint: "" }),
    escapeHtml
  });

  const html = nodes.get("writingScaffoldPreview").innerHTML;
  assert.match(html, /writing-empty/);
  assert.match(html, /Existing project/);
  assert.match(html, /Continue project/);
});

test("writing panel controller renders scaffold sections preflight and markdown", () => {
  const nodes = new Map([
    ["writingScaffoldPreview", { innerHTML: "" }]
  ]);

  renderWritingScaffoldPreviewDom({
    $: (id) => nodes.get(id) || null,
    state: {},
    writingState: {
      project: {
        id: "project-1",
        draft_note_id: "",
        preflight: { checks: [{ status: "pass", label: "Project", message: "OK" }] }
      },
      scaffold: {
        id: "scaffold-1",
        sections: [
          {
            heading: "Opening <claim>",
            purpose: "Set direction",
            gaps: ["case"],
            counterpoints: ["risk"],
            open_questions: ["why now"]
          }
        ],
        open_questions: ["larger question"],
        preflight: {
          checks: [
            { status: "pass", label: "Structure", message: "OK" },
            { status: "warn", label: "Gap", message: "Add case" }
          ]
        }
      },
      scaffoldMarkdown: "# Draft"
    },
    currentWritingContinuationEntry: () => null,
    describeWritingProjectPreflight: () => ({ level: "ready", status: "Project ready", hint: "" }),
    describeProjectPreflight: () => ({ level: "has_gaps", status: "Needs work", hint: "Has gaps" }),
    groupWritingPreflightChecks: (preflight) => ({
      checks: preflight.checks,
      blocking: [],
      warnings: preflight.checks.filter((check) => check.status !== "pass"),
      passes: preflight.checks.filter((check) => check.status === "pass")
    }),
    writingDraftDirectoryId: () => "drafts",
    folderById: () => ({ name: "Draft Folder" }),
    parseWritingBasketIds: () => ["n1", "n2"],
    describeWritingNextActionFromState: () => ({ title: "Save draft", note: "Ready to write." }),
    escapeHtml
  });

  const html = nodes.get("writingScaffoldPreview").innerHTML;
  assert.match(html, /scaffold-1/);
  assert.match(html, /Draft Folder/);
  assert.match(html, /Save draft/);
  assert.match(html, /Opening &lt;claim&gt;/);
  assert.match(html, /case/);
  assert.match(html, /larger question/);
  assert.match(html, /# Draft/);
});
