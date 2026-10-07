import test from "node:test";
import assert from "node:assert/strict";
import { createAssetPreviewFocus } from "../../apps/web/src/asset-preview-focus.js";

function harness() {
  const doc = { activeElement: null };
  const node = () => ({ isConnected: true, visible: true, getClientRects() { return this.visible ? [{}] : []; }, focus() { doc.activeElement = this; } });
  const editor = node(), closeButton = node(), retry = node(), link = node();
  retry.visible = false;
  let hidden = true, currentEditor = editor, closed = 0;
  const modal = { ownerDocument: doc, classList: { contains: () => hidden }, querySelectorAll: () => [closeButton, retry, link] };
  let handle;
  const focus = createAssetPreviewFocus({ getModal: () => modal, getCloseButton: () => closeButton, getReturnFocus: () => currentEditor,
    eventTarget: { addEventListener(_type, callback) { handle = callback; } },
    close() { closed++; hidden = true; focus.close(); }
  });
  const event = extra => ({ key: "", prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...extra });
  return { doc, editor, closeButton, retry, link, event, handle: e => handle(e), focus, closed: () => closed,
    open() { hidden = false; focus.open(); }, replaceEditor(next) { currentEditor = next; } };
}

test("preview focuses close, cycles visible controls and restores editor focus on Escape", () => {
  const h = harness();
  h.open();
  assert.equal(h.doc.activeElement, h.closeButton);
  h.handle(h.event({ key: "Tab", shiftKey: true }));
  assert.equal(h.doc.activeElement, h.link);
  h.handle(h.event({ key: "Tab" }));
  assert.equal(h.doc.activeElement, h.closeButton);
  h.retry.visible = true;
  h.retry.focus();
  h.retry.visible = false;
  h.handle(h.event({ key: "Tab" }));
  assert.equal(h.doc.activeElement, h.closeButton);
  h.handle(h.event({ key: "Escape" }));
  assert.equal(h.closed(), 1);
  assert.equal(h.doc.activeElement, h.editor);
});

test("preview isolates app shortcuts but leaves composition and handled keys alone", () => {
  const h = harness();
  const inactive = h.event({ key: "F2" });
  h.handle(inactive);
  assert.equal(inactive.stopped, false);
  h.open();
  for (const key of ["F2", "Delete", "s", "ArrowLeft"]) {
    const event = h.event({ key, ctrlKey: true });
    h.handle(event);
    assert.equal(event.stopped, true);
    if (["s", "ArrowLeft"].includes(key)) assert.equal(event.prevented, true);
  }
  for (const extra of [{ isComposing: true }, { defaultPrevented: true }]) {
    const event = h.event({ key: "Escape", ...extra });
    h.handle(event);
    assert.equal(event.stopped, false);
  }
  assert.equal(h.closed(), 0);
});

test("preview returns to a replacement editor when its original node disappeared", () => {
  const h = harness();
  h.open();
  h.editor.isConnected = false;
  const replacement = { getClientRects: () => [{}], focus() { h.doc.activeElement = this; } };
  h.replaceEditor(replacement);
  h.focus.close();
  assert.equal(h.doc.activeElement, replacement);
});
