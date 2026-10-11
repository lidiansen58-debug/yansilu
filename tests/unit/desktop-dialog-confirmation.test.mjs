import test from "node:test";
import assert from "node:assert/strict";
import { installDesktopDialogConfirmation } from "../../apps/web/src/desktop-dialog-confirmation.js";

for (const location of ["nested", "global"]) {
  test(`desktop ${location} SDK replaces obsolete polyfill and awaits the actual decision`, async () => {
    let decide;
    const calls = [];
    const dialog = { confirm(message, options) {
      assert.equal(this, dialog);
      calls.push({ message, options });
      return new Promise((resolve) => { decide = resolve; });
    } };
    const windowRef = { confirm: () => { throw new Error("Obsolete polyfill must not run"); } };
    if (location === "nested") windowRef.__TAURI__ = { dialog };
    else windowRef.__TAURI_PLUGIN_DIALOG__ = dialog;
    assert.equal(installDesktopDialogConfirmation(windowRef), true);
    let completed = false;
    const result = windowRef.confirm("恢复上次未完成的编辑？").then((value) => { completed = true; return value; });
    await Promise.resolve();
    assert.equal(completed, false);
    assert.deepEqual(calls, [{ message: "恢复上次未完成的编辑？", options: { title: "研思录", okLabel: "确认", cancelLabel: "取消" } }]);
    decide(false);
    assert.equal(await result, false);
    const approved = windowRef.confirm("确认保存？");
    decide(true);
    assert.equal(await approved, true);
  });
}

test("desktop SDK errors propagate to the caller's existing confirmation guard", async () => {
  const error = new Error("Native dialog unavailable");
  const windowRef = { __TAURI__: { dialog: { confirm: async () => { throw error; } } } };
  installDesktopDialogConfirmation(windowRef);
  await assert.rejects(windowRef.confirm("确认？"), (actual) => actual === error);
});

test("core fallback uses the allowed message protocol and accepts only the confirm button", async () => {
  const calls = [];
  let result = "取消";
  const core = { async invoke(command, payload) { assert.equal(this, core); calls.push({ command, payload }); return result; } };
  const windowRef = { __TAURI__: { core }, confirm: () => { throw new Error("Obsolete command"); } };
  assert.equal(installDesktopDialogConfirmation(windowRef), true);
  assert.equal(await windowRef.confirm("是否恢复？"), false);
  result = "确认";
  assert.equal(await windowRef.confirm("是否恢复？"), true);
  assert.deepEqual(calls[0], { command: "plugin:dialog|message", payload: { message: "是否恢复？", title: "研思录", buttons: { ok: "确认", cancel: "取消" } } });
  for (result of [true, null, "Ok", ""]) assert.equal(await windowRef.confirm("是否恢复？"), false);
});

test("browser confirmation remains unchanged and retry does not wrap the old confirmation", async () => {
  const original = () => false, browser = { confirm: original };
  assert.equal(installDesktopDialogConfirmation(browser), false);
  assert.equal(browser.confirm, original);
  assert.equal(installDesktopDialogConfirmation(undefined), false);
  let calls = 0;
  const desktop = { __TAURI_PLUGIN_DIALOG__: { confirm: async () => { calls++; return true; } } };
  installDesktopDialogConfirmation(desktop);
  installDesktopDialogConfirmation(desktop);
  assert.equal(await desktop.confirm("确认？"), true);
  assert.equal(calls, 1);
});
