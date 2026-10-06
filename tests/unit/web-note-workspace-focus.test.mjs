import test from "node:test";
import assert from "node:assert/strict";
import { captureWorkspaceFocus, restoreWorkspaceFocus } from "../../apps/web/src/note-workspace-focus.js";

function fixture() {
  const document = { activeElement: null };
  const scroller = { scrollTop: 180 };
  const control = (tagName, attributes) => ({
    tagName, disabled: false,
    getAttribute: name => attributes[name] ?? null,
    getClientRects: () => [{}],
    focus: () => { document.activeElement = document.controlFocused = attributes; }
  });
  const workspace = controls => ({
    ownerDocument: document,
    contains: el => controls.includes(el),
    querySelectorAll: () => controls,
    querySelector: () => controls.find(el => el.getAttribute("aria-selected") === "true"),
    getClientRects: () => [{}],
    closest: () => scroller
  });
  return { document, scroller, control, workspace };
}

test("a removed focused field falls back to the selected pane without scrolling", () => {
  const { document, control, workspace, scroller } = fixture();
  const field = control("TEXTAREA", { name: "thesis" });
  document.activeElement = field;
  const captured = captureWorkspaceFocus(workspace([field]));
  const selected = control("BUTTON", { "data-permanent-workspace-tab": "viewpoint", "aria-selected": "true" });
  restoreWorkspaceFocus(workspace([selected]), captured);
  assert.equal(document.controlFocused["data-permanent-workspace-tab"], "viewpoint");
  assert.equal(scroller.scrollTop, 180);
});

test("refreshing the background workspace cannot steal focus from a second dialog", () => {
  const { document, control, workspace } = fixture();
  const field = control("TEXTAREA", { name: "thesis" });
  const outside = control("INPUT", { name: "relation-search" });
  document.activeElement = outside;
  const captured = captureWorkspaceFocus(workspace([field]));
  assert.equal(captured, null);
  restoreWorkspaceFocus(workspace([field]), captured);
  assert.equal(document.activeElement, outside);
});
