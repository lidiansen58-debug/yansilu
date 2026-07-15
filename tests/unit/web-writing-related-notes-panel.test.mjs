import test from "node:test";
import assert from "node:assert/strict";

import {
  installWritingRelatedPanelEvents,
  setWritingRelatedPanelOpen,
  updateWritingRelatedNoteCounters
} from "../../apps/web/src/writing-related-notes-panel.js";

function fakeClassList() {
  const names = new Set();
  return {
    toggle: (name, force) => {
      if (force) names.add(name);
      else names.delete(name);
    },
    contains: (name) => names.has(name)
  };
}

test("writing related notes panel opens as an overlay without changing layout", () => {
  const overlay = {
    classList: fakeClassList(),
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    }
  };
  const counters = [{ textContent: "" }, { textContent: "" }, { textContent: "" }];
  const sidebarButton = { classList: fakeClassList(), attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } };
  const documentRef = { querySelector: (selector) => selector.includes("related") ? sidebarButton : null };
  const shell = {
    querySelector: (selector) => selector === "#writingRelatedOverlay" ? overlay : null,
    querySelectorAll: () => counters
  };

  assert.equal(setWritingRelatedPanelOpen(true, { root: shell, documentRef }), true);
  assert.equal(overlay.classList.contains("is-open"), true);
  assert.equal(overlay.attrs["aria-hidden"], "false");
  assert.equal(sidebarButton.classList.contains("is-active"), true);

  assert.equal(updateWritingRelatedNoteCounters(3, { root: shell }), true);
  assert.deepEqual(counters.map((counter) => counter.textContent), ["3", "3", "3"]);

  setWritingRelatedPanelOpen(false, { root: shell, documentRef });
  assert.equal(overlay.classList.contains("is-open"), false);
  assert.equal(overlay.attrs["aria-hidden"], "true");
  assert.equal(sidebarButton.classList.contains("is-active"), false);
});

test("writing related notes panel installer routes open and close clicks", () => {
  const overlay = {
    classList: fakeClassList(),
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    }
  };
  let clickHandler = null;
  const shell = {
    contains: () => true,
    querySelector: (selector) => selector === "#writingRelatedOverlay" ? overlay : null,
    addEventListener: (_eventName, handler) => {
      clickHandler = handler;
    }
  };

  const installed = installWritingRelatedPanelEvents({ root: shell });
  assert.equal(installed.installed, true);

  clickHandler({
    target: {
      closest: (selector) => selector === "[data-writing-related-open]" ? {} : null
    }
  });
  assert.equal(overlay.classList.contains("is-open"), true);

  clickHandler({
    target: {
      closest: (selector) => selector === "[data-writing-related-close]" ? {} : null
    }
  });
  assert.equal(overlay.classList.contains("is-open"), false);
});
