import test from "node:test";
import assert from "node:assert/strict";

import {
  applyWritingTab
} from "../../apps/web/src/writing-tabs.js";

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

function fakeButton(tab) {
  return {
    dataset: { writingTab: tab },
    classList: fakeClassList(),
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    }
  };
}

test("writing tabs select one functional area and fall back to write", () => {
  const buttons = ["write", "notes", "themes", "tools"].map(fakeButton);
  const shell = {
    dataset: {},
    querySelectorAll: (selector) => selector === "[data-writing-tab]" ? buttons : []
  };

  assert.equal(applyWritingTab("themes", { root: shell }), "themes");
  assert.equal(shell.dataset.writingActiveTab, "themes");
  assert.equal(buttons[2].classList.contains("is-active"), true);
  assert.equal(buttons[2].attrs["aria-selected"], "true");
  assert.equal(buttons[0].attrs["aria-selected"], "false");

  assert.equal(applyWritingTab("unknown", { root: shell }), "write");
  assert.equal(shell.dataset.writingActiveTab, "write");
  assert.equal(buttons[0].classList.contains("is-active"), true);
});
