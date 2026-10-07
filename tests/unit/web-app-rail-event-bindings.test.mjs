import test from "node:test";
import assert from "node:assert/strict";
import { installAppRailEventBindings } from "../../apps/web/src/app-rail-event-bindings.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function settingsRail(refreshVaultSettings) {
  let click;
  let revision = 7;
  const state = { module: "today", noteMoveVaultScope: {} };
  const messages = [];
  const button = { dataset: { module: "settings" }, addEventListener(_name, listener) { click = listener; } };
  const setStatus = (text, tone, options = {}) => {
    if (options.skipIfStaleSince && options.skipIfStaleSince !== revision) return false;
    revision += 1;
    messages.push({ text, tone });
    return true;
  };
  installAppRailEventBindings({
    documentRef: { querySelectorAll: () => [button] }, state,
    activateModule: module => { state.module = module; },
    refreshVaultSettings, getStatusRevision: () => revision, setStatus
  });
  return { state, messages, setStatus, click: () => click({ preventDefault() {}, stopPropagation() {} }) };
}

test("settings refresh does not replace feedback from a newer user action", async () => {
  const read = deferred();
  const rail = settingsRail(() => read.promise);
  const pending = rail.click();
  rail.setStatus("已打开笔记库：新库", "ok");
  read.resolve();
  await pending;
  assert.deepEqual(rail.messages, [{ text: "已打开笔记库：新库", tone: "ok" }]);
});

test("a late old-vault settings refresh failure does not override the new vault", async () => {
  const read = deferred();
  const rail = settingsRail(() => read.promise);
  const pending = rail.click();
  rail.state.noteMoveVaultScope = {};
  read.reject(new Error("old vault unavailable"));
  await pending;
  assert.deepEqual(rail.messages, []);
});

test("current settings success and failure remain visible", async () => {
  const success = settingsRail(async () => {});
  await success.click();
  assert.deepEqual(success.messages, [{ text: "已打开设置", tone: "ok" }]);
  const failure = settingsRail(async () => { throw new Error("读取失败"); });
  await failure.click();
  assert.deepEqual(failure.messages, [{ text: "设置刷新失败：读取失败", tone: "warn" }]);
});
