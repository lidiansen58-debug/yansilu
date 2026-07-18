import test from "node:test";
import assert from "node:assert/strict";

import { initMarketingTabs } from "../../apps/web/src/marketing-tabs.js";

function createFixture(selectedIndex = 1) {
  const buttons = ["note", "network", "writing"].map((name, index) => {
    const attributes = new Map([
      ["aria-controls", `panel-${name}`],
      ["aria-selected", index === selectedIndex ? "true" : "false"]
    ]);
    const listeners = new Map();
    return {
      focused: false,
      listeners,
      tabIndex: index === selectedIndex ? 0 : -1,
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      focus() {
        this.focused = true;
      },
      getAttribute(name) {
        return attributes.get(name) ?? null;
      },
      setAttribute(name, value) {
        attributes.set(name, value);
      }
    };
  });
  const panels = ["note", "network", "writing"].map((name) => ({
    hidden: false,
    id: `panel-${name}`
  }));
  const tabs = {
    querySelectorAll(selector) {
      return selector === '[role="tab"]' ? buttons : panels;
    }
  };
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, "[data-marketing-tabs]");
      return [tabs];
    }
  };
  return { buttons, panels, root };
}

function dispatchKey(button, key) {
  let prevented = false;
  button.listeners.get("keydown")({
    key,
    preventDefault() {
      prevented = true;
    }
  });
  return prevented;
}

function assertSelected(buttons, panels, selectedIndex) {
  buttons.forEach((button, index) => {
    assert.equal(button.getAttribute("aria-selected"), index === selectedIndex ? "true" : "false");
    assert.equal(button.tabIndex, index === selectedIndex ? 0 : -1);
    assert.equal(panels[index].hidden, index !== selectedIndex);
  });
}

test("marketing tabs initialize the selected panel and switch on click", () => {
  const { buttons, panels, root } = createFixture();

  initMarketingTabs(root);
  assertSelected(buttons, panels, 1);

  buttons[0].listeners.get("click")();
  assertSelected(buttons, panels, 0);
});

test("marketing tabs support arrow, home, and end keyboard navigation", () => {
  const { buttons, panels, root } = createFixture();
  initMarketingTabs(root);

  assert.equal(dispatchKey(buttons[1], "ArrowRight"), true);
  assertSelected(buttons, panels, 2);
  assert.equal(buttons[2].focused, true);

  assert.equal(dispatchKey(buttons[2], "Home"), true);
  assertSelected(buttons, panels, 0);

  assert.equal(dispatchKey(buttons[0], "ArrowLeft"), true);
  assertSelected(buttons, panels, 2);

  assert.equal(dispatchKey(buttons[2], "End"), true);
  assertSelected(buttons, panels, 2);

  assert.equal(dispatchKey(buttons[2], "Enter"), false);
  assertSelected(buttons, panels, 2);
});
