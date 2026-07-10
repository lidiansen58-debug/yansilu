import assert from "node:assert/strict";
import test from "node:test";

import { PermanentNoteWorkspaceController } from "../../apps/web/src/permanent-note-workspace-controller.js";
import {
  renderPermanentNoteWorkspace
} from "../../apps/web/src/permanent-note-workspace-view.js";

function workspace(noteId = "note-a") {
  return {
    attrs: { "data-note-id": noteId },
    getAttribute(name) {
      return this.attrs[name] || "";
    },
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    }
  };
}

function host(overrides = {}) {
  const app = {
    els: {
      result: {
        querySelector: () => null
      }
    },
    activeTab: () => ({ body: "[[Beta]] #theme" }),
    renderPermanentNoteDistillationSection: () => '<section data-note-distillation-section></section>',
    refreshMainPathSection: () => {
      app.refreshedMainPath = true;
    },
    ...overrides
  };
  return app;
}

test("permanent note workspace renders a single viewpoint distillation pane", () => {
  const html = renderPermanentNoteWorkspace({
    note: { id: "note-a" },
    viewpointHtml: '<section data-note-distillation-section></section>'
  });

  assert.match(html, /data-permanent-note-workspace data-note-id="note-a"/);
  assert.match(html, /data-note-distillation-section/);
  assert.doesNotMatch(html, /data-permanent-workspace-tab/);
  assert.doesNotMatch(html, /data-permanent-workspace-pane="relations"/);
  assert.doesNotMatch(html, /data-permanent-workspace-pane="writing"/);
});

test("permanent note workspace controller keeps the mounted note guard", () => {
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

test("permanent note workspace controller refreshes only the current mounted note", () => {
  const mountedWorkspace = workspace("note-a");
  const app = host({
    els: {
      result: {
        querySelector(selector) {
          return selector === "[data-permanent-note-workspace]" ? mountedWorkspace : null;
        }
      }
    }
  });
  const controller = new PermanentNoteWorkspaceController(app);

  assert.equal(controller.renderDeferredWorkspace({ id: "note-a" }, { body: "" }).includes("data-note-distillation-section"), true);
  assert.equal(controller.refreshSnapshot({ id: "note-a" }, { body: "" }), true);
  assert.equal(app.refreshedMainPath, true);
  assert.equal(controller.currentTab(), "viewpoint");
  assert.equal(controller.activateTab("writing"), true);
});
