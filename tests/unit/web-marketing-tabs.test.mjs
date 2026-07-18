import test from "node:test";
import assert from "node:assert/strict";

import { initMarketingTabs } from "../../apps/web/src/marketing-tabs.js";

function createFixture(selectedIndex = 1, options = {}) {
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
  const tabListeners = new Map();
  const intervalCallbacks = [];
  const toggleAttributes = new Map();
  const toggleListeners = new Map();
  const autoplayToggle = {
    hidden: false,
    listeners: toggleListeners,
    textContent: "Ⅱ",
    addEventListener(type, listener) {
      toggleListeners.set(type, listener);
    },
    getAttribute(name) {
      return toggleAttributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      toggleAttributes.set(name, value);
    }
  };
  const tabs = {
    attributes: new Map(),
    addEventListener(type, listener) {
      tabListeners.set(type, listener);
    },
    contains() {
      return false;
    },
    getAttribute(name) {
      if (name === "data-tab-autoplay") return String(options.autoplayDelay || "");
      return this.attributes.get(name) ?? null;
    },
    removeAttribute(name) {
      this.attributes.delete(name);
    },
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
    parentElement: {
      querySelector(selector) {
        return options.withToggle && selector === "[data-tab-autoplay-toggle]" ? autoplayToggle : null;
      }
    },
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      return selector === '[role="tab"]' ? buttons : panels;
    }
  };
  const root = {
    defaultView: {
      clearInterval() {},
      matchMedia() {
        return { matches: Boolean(options.reducedMotion) };
      },
      setInterval(callback) {
        intervalCallbacks.push(callback);
        return intervalCallbacks.length;
      }
    },
    hidden: false,
    querySelectorAll(selector) {
      assert.equal(selector, "[data-marketing-tabs]");
      return [tabs];
    }
  };
  return { autoplayToggle, buttons, intervalCallbacks, panels, root, tabListeners, toggleListeners };
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

test("marketing tabs autoplay in order and respect reduced motion", () => {
  const fixture = createFixture(0, { autoplayDelay: 1500, withToggle: true });
  initMarketingTabs(fixture.root);
  assert.equal(fixture.intervalCallbacks.length, 1);
  assert.equal(fixture.autoplayToggle.hidden, false);
  assert.equal(fixture.autoplayToggle.getAttribute("aria-label"), "自动播放");
  assert.equal(fixture.autoplayToggle.getAttribute("aria-pressed"), "true");
  assert.equal(fixture.autoplayToggle.getAttribute("title"), "暂停自动播放");
  assert.equal(fixture.root.querySelectorAll("[data-marketing-tabs]")[0].getAttribute("data-autoplay-paused"), null);

  fixture.intervalCallbacks[0]();
  assertSelected(fixture.buttons, fixture.panels, 1);
  fixture.intervalCallbacks[0]();
  assertSelected(fixture.buttons, fixture.panels, 2);

  fixture.buttons[0].listeners.get("click")();
  assertSelected(fixture.buttons, fixture.panels, 0);
  assert.equal(fixture.autoplayToggle.textContent, "▶");
  assert.equal(fixture.autoplayToggle.getAttribute("aria-pressed"), "false");
  assert.equal(fixture.autoplayToggle.getAttribute("title"), "继续自动播放");
  assert.equal(fixture.root.querySelectorAll("[data-marketing-tabs]")[0].getAttribute("data-autoplay-paused"), "");

  fixture.toggleListeners.get("click")();
  assert.equal(fixture.intervalCallbacks.length, 2);
  assert.equal(fixture.autoplayToggle.textContent, "Ⅱ");
  assert.equal(fixture.autoplayToggle.getAttribute("aria-pressed"), "true");
  assert.equal(fixture.root.querySelectorAll("[data-marketing-tabs]")[0].getAttribute("data-autoplay-paused"), null);

  const reduced = createFixture(0, { autoplayDelay: 1500, reducedMotion: true, withToggle: true });
  initMarketingTabs(reduced.root);
  assert.equal(reduced.intervalCallbacks.length, 0);
  assert.equal(reduced.autoplayToggle.hidden, true);
});

test("marketing tabs keep autoplay paused until pointer and focus both leave", () => {
  const fixture = createFixture(0, { autoplayDelay: 1500, withToggle: true });
  initMarketingTabs(fixture.root);
  assert.equal(fixture.intervalCallbacks.length, 1);

  fixture.tabListeners.get("pointerenter")();
  fixture.tabListeners.get("focusin")();
  fixture.tabListeners.get("pointerleave")();
  assert.equal(fixture.intervalCallbacks.length, 1);

  fixture.tabListeners.get("focusout")({ relatedTarget: null });
  assert.equal(fixture.intervalCallbacks.length, 2);

  fixture.tabListeners.get("pointerenter")();
  fixture.tabListeners.get("focusin")();
  fixture.tabListeners.get("focusout")({ relatedTarget: null });
  assert.equal(fixture.intervalCallbacks.length, 2);

  fixture.tabListeners.get("pointerleave")();
  assert.equal(fixture.intervalCallbacks.length, 3);
});
