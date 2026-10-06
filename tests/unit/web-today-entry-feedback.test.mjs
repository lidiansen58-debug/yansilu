import test from "node:test";
import assert from "node:assert/strict";
import { installTodayOrganizingEvents } from "../../apps/web/src/today-organizing-events.js";

function entry(action, deps = {}) {
  let handler;
  const hint = { hidden: true, textContent: "" };
  const button = {
    disabled: false, textContent: "原按钮", attrs: { "data-today-action": action },
    getAttribute(name) { return this.attrs[name]; },
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; }
  };
  installTodayOrganizingEvents({
    addEventListener: (_name, callback) => { handler = callback; },
    querySelector: selector => selector === "[data-today-entry-status]" ? hint : null
  }, () => deps);
  return { button, hint, click: () => handler({ preventDefault() {}, target: { closest: selector => selector === "[data-today-action]" ? button : null } }) };
}

test("import entry shows busy state, blocks repeat clicks and restores after navigation", async () => {
  let resolve, calls = 0;
  const pending = new Promise(done => { resolve = done; });
  const ui = entry("open-import", { handleStateChange: () => { calls += 1; return pending; } });
  const action = ui.click();
  assert.equal(ui.button.disabled, true);
  assert.equal(ui.button.attrs["aria-busy"], "true");
  assert.equal(ui.button.textContent, "正在打开...");
  assert.equal(ui.hint.hidden, false);
  await ui.click();
  assert.equal(calls, 1);
  resolve(true);
  await action;
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.button.textContent, "原按钮");
  assert.equal(ui.hint.hidden, true);
});

test("entry failures keep the actual reason visible and allow retry", async () => {
  for (const [action, deps, reason] of [
    ["open-import", { handleStateChange: async () => { throw new Error("目录无法读取"); } }, "目录无法读取"],
    ["open-import", { handleStateChange: async () => false }, "导入页面未能打开"],
    ["open-import", {}, "导入入口尚未就绪"],
    ["start-first-note", { openStartupUntitledNote: async () => ({ error: new Error("磁盘已满") }) }, "磁盘已满"]
  ]) {
    const statuses = [];
    const ui = entry(action, { ...deps, setStatus: (...args) => statuses.push(args) });
    await ui.click();
    assert.equal(ui.hint.hidden, false);
    assert.ok(ui.hint.textContent.includes(reason));
    assert.equal(statuses.at(-1)[1], "bad");
    assert.equal(ui.button.disabled, false);
    assert.equal(ui.button.attrs["aria-busy"], undefined);
    assert.equal(ui.button.textContent, "原按钮");
  }
});

test("uncertain creation is shown as pending verification, not failed creation", async () => {
  const statuses = [];
  const error = Object.assign(new Error("创建结果尚未确认。再次点击新建会核查同一条笔记，不会重复创建。"), { code: "creation_pending" });
  const ui = entry("start-first-note", {
    openStartupUntitledNote: async () => ({ error }),
    setStatus: (...args) => statuses.push(args)
  });
  await ui.click();
  assert.deepEqual(statuses, [[error.message, "warn"]]);
  assert.equal(ui.hint.hidden, false);
  assert.equal(ui.hint.textContent, error.message);
  assert.equal(ui.button.disabled, false);
});

test("late creation from another vault cannot show feedback in the new vault", async () => {
  const error = Object.assign(new Error("笔记库已切换"), { code: "vault_changed" });
  const ui = entry("start-first-note", {
    openStartupUntitledNote: async () => ({ error }),
    setStatus: () => assert.fail("old-vault feedback must be suppressed")
  });
  await ui.click();
  assert.equal(ui.hint.hidden, true);
  assert.equal(ui.hint.textContent, "");
  assert.equal(ui.button.disabled, false);
});

test("startup retry calls the connection handler once while pending", async () => {
  let finish, calls = 0;
  const pending = new Promise(resolve => { finish = resolve; });
  const ui = entry("retry-startup", { retryStartupConnection: () => { calls++; return pending; } });
  const reconnecting = ui.click();
  await ui.click();
  assert.equal(ui.button.disabled, true);
  assert.equal(calls, 1);
  finish(true);
  await reconnecting;
  assert.equal(ui.button.disabled, false);
});
