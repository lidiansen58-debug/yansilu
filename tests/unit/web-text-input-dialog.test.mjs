import test from "node:test";
import assert from "node:assert/strict";
import { createTextInputDialog } from "../../apps/web/src/components-text-input-dialog.js";

function fixture() {
  const elements = new Map();
  const element = () => ({ textContent: "", value: "", hidden: false, handlers: {}, parentElement: { hidden: false },
    addEventListener(name, fn) { this.handlers[name] = fn; }, focus() {}, select() {}, setAttribute() {} });
  for (const key of ["title", "note", "label", "field", "error", "confirm", "cancel"]) elements.set(`[data-text-input-${key}]`, element());
  const root = { ...element(), classList: { add() {}, remove() {} }, querySelector: key => elements.get(key) };
  const documentRef = { body: { appendChild() {} }, createElement: () => root, activeElement: null };
  return { request: createTextInputDialog({ documentRef }), root, elements };
}

test("confirmation-only mode keeps cancel and confirm explicit without a hidden required field", async () => {
  const s = fixture();
  const result = s.request({ title: "移出章节", note: "正文文件保留", confirmOnly: true, confirmLabel: "移出目录" });
  assert.equal(s.elements.get("[data-text-input-label]").parentElement.hidden, true);
  assert.equal(s.elements.get("[data-text-input-confirm]").textContent, "移出目录");
  s.elements.get("[data-text-input-confirm]").handlers.click();
  assert.equal(await result, "confirmed");
  const cancelled = s.request({ confirmOnly: true });
  s.root.handlers.keydown({ key: "Enter", target: s.elements.get("[data-text-input-cancel]"), preventDefault() { throw new Error("Cancel Enter must not confirm"); } });
  s.elements.get("[data-text-input-cancel]").handlers.click();
  assert.equal(await cancelled, "");
});

test("normal text input restores its field, save label and blank-name validation after confirmation", async () => {
  const s = fixture();
  const confirmation = s.request({ confirmOnly: true, confirmLabel: "移出目录" });
  s.elements.get("[data-text-input-cancel]").handlers.click(); await confirmation;
  const input = s.request({ title: "新增章节" });
  assert.equal(s.elements.get("[data-text-input-label]").parentElement.hidden, false);
  assert.equal(s.elements.get("[data-text-input-confirm]").textContent, "保存");
  s.elements.get("[data-text-input-confirm]").handlers.click();
  assert.equal(s.elements.get("[data-text-input-error]").hidden, false);
  s.elements.get("[data-text-input-field]").value = " Chapter ";
  s.elements.get("[data-text-input-confirm]").handlers.click();
  assert.equal(await input, "Chapter");
});
