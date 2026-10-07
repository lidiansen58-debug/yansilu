import test from "node:test";
import assert from "node:assert/strict";
import { createTemplatePreviewFocus } from "../../apps/web/src/settings-template-preview-focus.js";

function harness() {
  const doc = { activeElement: null };
  const button = extra => ({ isConnected: true, getClientRects: () => [{}], focus() { doc.activeElement = this; }, ...extra });
  const preview = button({ dataset: { settingsTemplateAction: "preview" }, closest: () => ({ dataset: { settingsTemplateKind: "permanent" } }) });
  const replacement = button({});
  const close = button({});
  const handlers = new Map();
  doc.querySelector = () => replacement;
  const modal = {
    ownerDocument: doc, classList: { contains: () => true }, contains: node => node === close,
    querySelectorAll: () => [close], addEventListener: (type, handler) => handlers.set(type, handler), removeEventListener() {}
  };
  doc.activeElement = preview;
  let closed = 0;
  const focus = createTemplatePreviewFocus({ getModal: () => modal, getCloseButton: () => close, close: () => { closed++; focus.close(); } });
  const event = extra => ({ prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...extra });
  return { focus, doc, preview, replacement, close, handlers, event, closed: () => closed };
}

test("template preview focuses Close, traps Tab, and returns to its current invoking button", () => {
  const h = harness();
  h.focus.open();
  assert.equal(h.doc.activeElement, h.close);
  for (const shiftKey of [false, true]) {
    const event = h.event({ key: "Tab", shiftKey });
    h.handlers.get("keydown")(event);
    assert.equal(event.prevented, true);
    assert.equal(h.doc.activeElement, h.close);
  }
  h.preview.isConnected = false;
  const event = h.event({ key: "Escape" });
  h.handlers.get("keydown")(event);
  assert.equal(h.closed(), 1);
  assert.equal(event.stopped, true);
  assert.equal(h.doc.activeElement, h.replacement);
});

test("template preview leaves composition and handled or modified keyboard events alone", () => {
  const h = harness();
  h.focus.open();
  for (const extra of [{ key: "Escape", isComposing: true }, { key: "Escape", defaultPrevented: true }, { key: "Tab", ctrlKey: true }]) {
    const event = h.event(extra);
    h.handlers.get("keydown")(event);
    assert.equal(event.prevented, false);
  }
  assert.equal(h.closed(), 0);
});
