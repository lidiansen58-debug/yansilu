import assert from "node:assert/strict";
import test from "node:test";

import { PermanentNoteWorkspaceController } from "../../apps/web/src/permanent-note-workspace-controller.js";
import {
  normalizePermanentWorkspaceTab,
  syncPermanentWorkspaceTabElements
} from "../../apps/web/src/permanent-note-workspace-view.js";

function classList() {
  return {
    active: false,
    toggle(name, enabled) {
      if (name === "is-active") this.active = Boolean(enabled);
    }
  };
}

function tabButton(key) {
  const small = { textContent: "" };
  return {
    key,
    attrs: { "data-permanent-workspace-tab": key },
    classList: classList(),
    getAttribute(name) {
      return this.attrs[name] || "";
    },
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    querySelector(selector) {
      return selector === "small" ? small : null;
    },
    small
  };
}

function pane(key) {
  return {
    key,
    attrs: { "data-permanent-workspace-pane": key },
    classList: classList(),
    hidden: false,
    innerHTML: "",
    getAttribute(name) {
      return this.attrs[name] || "";
    }
  };
}

function workspace(noteId = "note-a") {
  const buttons = ["relations", "viewpoint", "writing"].map(tabButton);
  const panes = ["relations", "viewpoint", "writing"].map(pane);
  return {
    attrs: { "data-note-id": noteId },
    buttons,
    panes,
    getAttribute(name) {
      return this.attrs[name] || "";
    },
    querySelectorAll(selector) {
      if (selector === "[data-permanent-workspace-tab]") return buttons;
      if (selector === "[data-permanent-workspace-pane]") return panes;
      return [];
    },
    querySelector(selector) {
      const paneMatch = selector.match(/data-permanent-workspace-pane="([^"]+)"/);
      if (paneMatch) return panes.find((item) => item.key === paneMatch[1]) || null;
      return null;
    }
  };
}

function host(overrides = {}) {
  const app = {
    semanticRelationsState: "loaded",
    currentSemanticRelations: { outgoingLinks: [], backlinks: [] },
    els: {
      result: {
        querySelector: () => null
      }
    },
    activeTab: () => ({ body: "[[Beta]] #theme" }),
    currentExplicitRelationCount: () => 0,
    buildLocalRelationSignals: () => ({ forward: [], backward: [], tagRelated: [] }),
    buildMainPathOverviewV2: (overview) => ({
      ...overview,
      thinExplicitRelationCount: 0,
      wikilinkCount: overview.forward?.length || 0,
      tagRelatedCount: overview.tagRelated?.length || 0
    }),
    renderPermanentNoteMainPathSectionV2: () => '<section data-note-main-path-section></section>',
    renderPermanentNoteDistillationSection: () => '<section data-note-distillation-section></section>',
    renderPermanentNoteRelationAssistSection: () => '<section data-note-relation-assist-section data-note-id="note-a"></section>',
    renderInlineDraftRelationSection: () => '<section data-inline-draft-relation-section></section>',
    renderCurrentRelationSection: () => '<section data-note-relations-section></section>',
    renderPermanentNoteWritingPrepSection: () => '<section data-writing-prep-section></section>',
    refreshMainPathSection: () => {
      app.refreshedMainPath = true;
    },
    ...overrides
  };
  return app;
}

test("permanent note workspace view normalizes and toggles tabs", () => {
  assert.equal(normalizePermanentWorkspaceTab("relations"), "relations");
  assert.equal(normalizePermanentWorkspaceTab("missing"), "viewpoint");

  const mount = workspace("note-a");
  assert.equal(syncPermanentWorkspaceTabElements(mount, "writing"), true);
  assert.equal(mount.buttons.find((button) => button.key === "writing").attrs["aria-selected"], "true");
  assert.equal(mount.buttons.find((button) => button.key === "relations").attrs["aria-selected"], "false");
  assert.equal(mount.panes.find((item) => item.key === "writing").hidden, false);
  assert.equal(mount.panes.find((item) => item.key === "viewpoint").hidden, true);
});

test("permanent note workspace controller preserves tab for the same note and resets on note switch", () => {
  const controller = new PermanentNoteWorkspaceController(host());
  const noteA = { id: "note-a", title: "A", thesis: "", threeLineSummary: [], distillationStatus: "draft" };
  const noteB = { id: "note-b", title: "B", thesis: "", threeLineSummary: [], distillationStatus: "draft" };

  const first = controller.renderDeferredWorkspace(noteA, { body: "" });
  assert.match(first, /aria-selected="true" data-permanent-workspace-tab="viewpoint"/);

  controller.activeWorkspaceTab = "writing";
  const sameNote = controller.renderDeferredWorkspace(noteA, { body: "" });
  assert.match(sameNote, /aria-selected="true" data-permanent-workspace-tab="writing"/);

  const nextNote = controller.renderDeferredWorkspace(noteB, { body: "" });
  assert.match(nextNote, /aria-selected="true" data-permanent-workspace-tab="viewpoint"/);
});

test("permanent note workspace controller guards async refresh by mounted note id", () => {
  const staleWorkspace = workspace("note-b");
  const app = host({
    els: {
      result: {
        querySelector(selector) {
          return selector === "[data-permanent-note-workspace]" ? staleWorkspace : null;
        }
      }
    }
  });
  const controller = new PermanentNoteWorkspaceController(app);

  assert.equal(controller.refreshSnapshot({ id: "note-a" }, { body: "" }), false);
  assert.equal(app.refreshedMainPath, undefined);
});

test("permanent note workspace controller refreshes snapshot sections in place", () => {
  const mountedWorkspace = workspace("note-a");
  const relationAssist = {
    attrs: { "data-note-id": "note-a" },
    outerHTML: "",
    getAttribute(name) {
      return this.attrs[name] || "";
    }
  };
  const app = host({
    currentExplicitRelationCount: () => 2,
    els: {
      result: {
        querySelector(selector) {
          if (selector === "[data-permanent-note-workspace]") return mountedWorkspace;
          if (selector === "[data-note-relation-assist-section]") return relationAssist;
          return null;
        }
      }
    },
    renderPermanentNoteRelationAssistSection: () => '<section data-note-relation-assist-section data-note-id="note-a">updated relation</section>',
    renderPermanentNoteWritingPrepSection: () => '<section data-writing-prep-section>updated writing</section>'
  });
  const controller = new PermanentNoteWorkspaceController(app);

  assert.equal(controller.refreshSnapshot({ id: "note-a", thesis: "T", threeLineSummary: ["1", "2", "3"], distillationStatus: "confirmed" }, { body: "" }), true);
  assert.equal(app.refreshedMainPath, true);
  assert.match(relationAssist.outerHTML, /updated relation/);
  assert.match(mountedWorkspace.panes.find((item) => item.key === "writing").innerHTML, /updated writing/);
  assert.equal(mountedWorkspace.buttons.find((button) => button.key === "relations").small.textContent, "2 条正式关系");
});

test("permanent note workspace names the three right-side actions clearly", () => {
  const controller = new PermanentNoteWorkspaceController(host());
  const note = { id: "note-a", title: "A", thesis: "", threeLineSummary: [], distillationStatus: "draft" };

  const html = controller.renderDeferredWorkspace(note, { body: "" });

  assert.match(html, /整理关系/);
  assert.match(html, /提炼观点/);
  assert.match(html, /进入写作/);
  assert.match(html, /提炼观点、理由、边界、追问和写作主题/);
});
