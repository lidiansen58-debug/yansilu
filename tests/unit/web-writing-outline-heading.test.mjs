import test from "node:test";
import assert from "node:assert/strict";
import { resizeWritingOutlineHeading } from "../../apps/web/src/writing-scaffold-preview-panel.js";
import { observeWritingOutlineSize, stopObservingWritingOutlineSize } from "../../apps/web/src/writing-outline-layout.js";

test("outline titles grow and shrink to their full content without moving focus", () => {
  const field = {
    matches: () => true, clientWidth: 180, style: {}, scrollHeight: 132, offsetHeight: 44, clientHeight: 42,
    focus: () => assert.fail("Resizing must not steal focus")
  };
  resizeWritingOutlineHeading(field);
  assert.equal(field.style.height, "134px");
  field.scrollHeight = 42;
  resizeWritingOutlineHeading(field);
  assert.equal(field.style.height, "44px");
});

test("hidden headings and non-heading fields are not measured", () => {
  for (const options of [{ matches: () => false, clientWidth: 180 }, { matches: () => true, clientWidth: 0 }]) {
    const field = { ...options, style: {}, get scrollHeight() { assert.fail("Must not measure"); } };
    resizeWritingOutlineHeading(field);
    assert.deepEqual(field.style, {});
  }
  resizeWritingOutlineHeading(null);
});

function layoutFixture({ fallback = false } = {}) {
  const frames = new Map(), listeners = new Map(), instances = [];
  let nextFrame = 0;
  const field = { matches: () => true, clientWidth: 150, style: {}, scrollHeight: 120, offsetHeight: 44, clientHeight: 42,
    focus: () => assert.fail("Resizing must preserve the active input") };
  const view = {
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name, callback) => { assert.equal(listeners.get(name), callback); listeners.delete(name); }
  };
  if (!fallback) view.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.disconnected = false; instances.push(this); }
    observe(root) { this.root = root; }
    disconnect() { this.disconnected = true; }
  };
  const root = { ownerDocument: { defaultView: view }, isConnected: true, clientWidth: 600,
    querySelectorAll: selector => { assert.equal(selector, ".writing-outline-heading"); return [field]; } };
  const flush = () => { const current = [...frames.values()]; frames.clear(); current.forEach(callback => callback()); };
  return { root, field, frames, listeners, instances, flush };
}

test("outline observer measures width changes once per frame and does not loop on height changes", () => {
  const h = layoutFixture();
  observeWritingOutlineSize(h.root);
  observeWritingOutlineSize(h.root);
  assert.equal(h.instances.length, 1);
  const observer = h.instances[0];
  assert.equal(observer.root, h.root);
  observer.callback(); observer.callback();
  assert.equal(h.frames.size, 1);
  h.flush();
  assert.equal(h.field.style.height, "122px");
  observer.callback();
  assert.equal(h.frames.size, 0);
  h.root.clientWidth = 260;
  h.field.scrollHeight = 260;
  observer.callback();
  h.flush();
  assert.equal(h.field.style.height, "262px");
  stopObservingWritingOutlineSize(h.root);
  assert.equal(observer.disconnected, true);
});

test("outline hidden and revealed by a layout change is measured on its new width", () => {
  const h = layoutFixture();
  h.root.clientWidth = 0;
  observeWritingOutlineSize(h.root);
  h.instances[0].callback(); h.flush();
  assert.deepEqual(h.field.style, {});
  h.root.clientWidth = 260;
  h.instances[0].callback(); h.flush();
  assert.equal(h.field.style.height, "122px");
  stopObservingWritingOutlineSize(h.root);
});

test("outline resize fallback retains one listener and can be cleaned up and mounted again", () => {
  const h = layoutFixture({ fallback: true });
  observeWritingOutlineSize(h.root); observeWritingOutlineSize(h.root);
  assert.equal(h.listeners.size, 1);
  h.listeners.get("resize")(); h.listeners.get("resize")();
  assert.equal(h.frames.size, 1);
  h.flush();
  assert.equal(h.field.style.height, "122px");
  h.listeners.get("resize")();
  stopObservingWritingOutlineSize(h.root);
  assert.equal(h.frames.size, 0);
  assert.equal(h.listeners.size, 0);
  observeWritingOutlineSize(h.root);
  assert.equal(h.listeners.size, 1);
  stopObservingWritingOutlineSize(h.root);
});

test("outline observer cancels pending frames and ignores detached roots", () => {
  const h = layoutFixture();
  observeWritingOutlineSize(h.root);
  h.root.isConnected = false;
  h.instances[0].callback(); h.flush();
  assert.deepEqual(h.field.style, {});
  h.root.clientWidth = 280;
  h.instances[0].callback();
  stopObservingWritingOutlineSize(h.root);
  assert.equal(h.frames.size, 0);
  assert.equal(h.instances[0].disconnected, true);
  observeWritingOutlineSize(null);
  stopObservingWritingOutlineSize(null);
});
