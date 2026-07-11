import test from "node:test";
import assert from "node:assert/strict";

import {
  renderWritingProjectHistoryDom
} from "../../apps/web/src/writing-project-history-panel.js";

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function nodes() {
  return {
    projectsHint: { textContent: "" },
    projectsList: { innerHTML: "" },
    scaffoldVersionsHint: { textContent: "" },
    scaffoldVersionsList: { innerHTML: "" },
    draftVersionsHint: { textContent: "" },
    draftVersionsList: { innerHTML: "" }
  };
}

test("writing project history renders project and version lists", () => {
  const dom = nodes();

  renderWritingProjectHistoryDom({
    ...dom,
    writingState: {
      project: { id: "project-1" },
      projectFilters: { q: "", status: "all", hasDraft: "all" },
      loadingProjects: false,
      projects: [{ id: "project-1" }],
      loadingScaffoldVersions: false,
      scaffoldVersions: [{ id: "scaffold-v1" }],
      loadingDraftVersions: false,
      draftVersions: [{ id: "draft-v1" }]
    },
    projectEntry: { status: "Ready", hint: "Continue" },
    hasProject: true,
    renderWritingProjectCard: (project) => `<project>${project.id}</project>`,
    renderScaffoldVersionCard: (version) => `<scaffold>${version.id}</scaffold>`,
    renderDraftVersionCard: (version) => `<draft>${version.id}</draft>`,
    escapeHtml
  });

  assert.match(dom.projectsHint.textContent, /1/);
  assert.equal(dom.projectsList.innerHTML, "<project>project-1</project>");
  assert.match(dom.scaffoldVersionsHint.textContent, /1/);
  assert.equal(dom.scaffoldVersionsList.innerHTML, "<scaffold>scaffold-v1</scaffold>");
  assert.match(dom.draftVersionsHint.textContent, /1/);
  assert.equal(dom.draftVersionsList.innerHTML, "<draft>draft-v1</draft>");
});

test("writing project history keeps projected continuation copy when no project is open", () => {
  const dom = nodes();

  renderWritingProjectHistoryDom({
    ...dom,
    writingState: {
      project: null,
      projectFilters: { q: "", status: "all", hasDraft: "all" },
      loadingProjects: false,
      projects: [],
      loadingScaffoldVersions: false,
      scaffoldVersions: [],
      loadingDraftVersions: false,
      draftVersions: []
    },
    projectEntry: {
      projectId: "project-1",
      status: "Existing <project>",
      hint: "Continue from current basket",
      actionLabel: "Resume"
    },
    hasProject: false,
    escapeHtml
  });

  assert.match(dom.projectsHint.textContent, /Existing <project>/);
  assert.match(dom.projectsList.innerHTML, /Existing &lt;project&gt;/);
  assert.match(dom.scaffoldVersionsHint.textContent, /Existing <project>/);
  assert.match(dom.scaffoldVersionsList.innerHTML, /Resume/);
  assert.match(dom.draftVersionsHint.textContent, /Existing <project>/);
  assert.match(dom.draftVersionsList.innerHTML, /Resume/);
});
