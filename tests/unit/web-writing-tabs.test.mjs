import test from "node:test";
import assert from "node:assert/strict";

import {
  applyWritingTab,
  installWritingTabEvents
} from "../../apps/web/src/writing-tabs.js";

function fakeClassList() {
  const names = new Set();
  return {
    add: (name) => names.add(name),
    remove: (name) => names.delete(name),
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

test("writing tabs select one workbench step and keep legacy aliases stable", () => {
  const buttons = ["theme", "outline", "draft"].map(fakeButton);
  const shell = {
    dataset: {},
    querySelectorAll: (selector) => selector === "[data-writing-tab]" ? buttons : []
  };

  assert.equal(applyWritingTab("outline", { root: shell }), "outline");
  assert.equal(shell.dataset.writingActiveTab, "outline");
  assert.equal(buttons[1].classList.contains("is-active"), true);
  assert.equal(buttons[1].attrs["aria-selected"], "true");
  assert.equal(buttons[0].attrs["aria-selected"], "false");

  assert.equal(applyWritingTab("themes", { root: shell }), "theme");
  assert.equal(shell.dataset.writingActiveTab, "theme");
  assert.equal(buttons[0].classList.contains("is-active"), true);

  assert.equal(applyWritingTab("unknown", { root: shell }), "theme");
  assert.equal(shell.dataset.writingActiveTab, "theme");
  assert.equal(buttons[0].classList.contains("is-active"), true);
});

test("writing theme picker returns to the theme tab after choosing a topic", () => {
  const buttons = ["theme", "outline", "draft"].map(fakeButton);
  const shell = {
    dataset: { writingActiveTab: "draft", writingView: "topic-picker" },
    contains: () => true,
    querySelectorAll(selector) {
      if (selector === "[data-writing-tab]") return buttons;
      return [];
    },
    addEventListener(eventName, handler) {
      if (eventName === "click") this.clickHandler = handler;
    }
  };
  const documentRef = {
    querySelector(selector) {
      if (selector === ".writing-shell") return shell;
      return null;
    }
  };

  installWritingTabEvents({ root: shell, documentRef });
  applyWritingTab("draft", { root: shell, documentRef });
  shell.dataset.writingView = "topic-picker";
  shell.clickHandler({
    target: {
      closest: (selector) => selector === "[data-writing-index-action]"
        ? { dataset: {}, getAttribute: () => "use" }
        : null
    }
  });

  assert.equal(shell.dataset.writingView, undefined);
  assert.equal(shell.dataset.writingActiveTab, "theme");
  assert.equal(buttons[0].classList.contains("is-active"), true);
});

test("writing mobile topic picker exposes the same theme-library route", () => {
  const buttons = ["theme", "outline", "draft"].map(fakeButton);
  const mobilePicker = { dataset: {}, classList: fakeClassList(), attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } };
  const shell = {
    dataset: {},
    contains: () => true,
    querySelectorAll: (selector) => selector === "[data-writing-tab]" ? buttons : [] ,
    addEventListener(eventName, handler) { if (eventName === "click") this.clickHandler = handler; }
  };
  const documentRef = {
    querySelector(selector) {
      if (selector === ".writing-shell") return shell;
      if (selector.includes("topics")) return mobilePicker;
      return null;
    }
  };

  installWritingTabEvents({ root: shell, documentRef });
  shell.clickHandler({ target: { closest: (selector) => selector === "[data-writing-topic-picker]" ? mobilePicker : null } });

  assert.equal(shell.dataset.writingView, "topic-picker");
  assert.equal(shell.dataset.writingActiveTab, "theme");
});
