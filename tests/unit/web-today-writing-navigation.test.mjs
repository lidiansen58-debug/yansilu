import test from "node:test";
import assert from "node:assert/strict";
import { openTodayWriting } from "../../apps/web/src/today-writing-navigation.js";
import { beginAppNavigation } from "../../apps/web/src/app-navigation-intent.js";
import { installTodayOrganizingEvents } from "../../apps/web/src/today-organizing-events.js";
import { renderTodayOrganizingPanel } from "../../apps/web/src/today-organizing-panel.js";
import { addWritingBasketIdsForRuntime } from "../../apps/web/src/writing-basket-state.js";

function fixture() {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const state = { module: "today", noteMoveVaultScope: {} };
  const writingState = { projectOpenRevision: 1 };
  const calls = [];
  let vault = "one";
  const deps = { state, writingState, getVaultPath: () => vault,
    activateModule: value => { state.module = value; },
    openWritingModule: () => pending,
    selectWritingThemeIndex: async id => { calls.push(["theme", id]); writingState.selectedThemeIndexId = id; },
    applyWritingTab: value => calls.push(["tab", value]), setStatus: (...args) => calls.push(["status", ...args]) };
  return { deps, calls, release, setVault: value => { vault = value; } };
}

test("home writing entry completes its own theme selection and focuses the requested step", async () => {
  const f = fixture();
  const action = openTodayWriting({ theme: { id: "theme-one" }, forWriting: true, deps: f.deps });
  f.release();
  assert.equal(await action, true);
  assert.deepEqual(f.calls, [["theme", "theme-one"], ["tab", "write"]]);
});

for (const input of [{ note: { id: "ready-note" } }, { theme: { title: "导入主题", noteIds: ["ready-note"] } }]) {
  test(`home writing entry accepts its own basket update from ${input.note ? "a note" : "an imported theme"}`, async () => {
    const f = fixture();
    let basket = [];
    f.deps.addWritingBasketIds = noteIds => addWritingBasketIdsForRuntime(noteIds, {
      parseWritingBasketIds: () => basket,
      setWritingBasketIds: ids => { basket = ids; },
      resetWritingProjectContextForBasketChange: () => { f.deps.writingState.projectOpenRevision++; }
    });
    const action = openTodayWriting({ ...input, forWriting: true, deps: f.deps });
    assert.deepEqual(basket, ["ready-note"]);
    assert.equal(f.deps.writingState.projectOpenRevision, 2);
    f.release();
    assert.equal(await action, true);
    assert.deepEqual(f.calls, [["tab", "write"]]);
  });
}

for (const [name, interrupt] of [
  ["page", f => { f.deps.state.module = "settings"; }],
  ["vault path", f => f.setVault("two")],
  ["vault epoch", f => { f.deps.state.noteMoveVaultScope = {}; }],
  ["later navigation", f => beginAppNavigation(f.deps.state)],
  ["another writing project", f => { f.deps.writingState.projectOpenRevision++; }]
]) {
  test(`late home writing response yields to a changed ${name}`, async () => {
    const f = fixture();
    const action = openTodayWriting({ theme: { id: "theme-one" }, forWriting: true, deps: f.deps });
    interrupt(f); f.release();
    assert.equal(await action, false);
    assert.deepEqual(f.calls, []);
  });
}

test("theme response cannot switch tabs after the user leaves during selection", async () => {
  const f = fixture();
  f.deps.openWritingModule = async () => {};
  f.deps.selectWritingThemeIndex = async () => { f.deps.state.module = "explorer"; };
  assert.equal(await openTodayWriting({ theme: { id: "one" }, forWriting: true, deps: f.deps }), false);
  assert.deepEqual(f.calls, []);
});

test("home ignores duplicate writing clicks and releases the lock after failure", async () => {
  const f = fixture();
  let calls = 0;
  f.deps.openWritingModule = async () => { calls++; await new Promise(resolve => { f.release = resolve; }); throw Error("offline"); };
  const handler = installTodayOrganizingEvents({ addEventListener() {} }, () => f.deps);
  const event = { preventDefault() {}, target: { closest: selector => selector === "[data-today-action]" ? { getAttribute: () => "open-writing", disabled: false } : null } };
  const first = handler(event);
  await handler(event);
  assert.equal(calls, 1);
  f.release(); await first;
  assert.match(f.calls[0][1], /offline/);
  const retry = handler(event);
  assert.equal(calls, 2);
  f.release(); await retry;
});

test("home secondary controls expose collapsible regions with correct accessibility state", () => {
  const html = renderTodayOrganizingPanel({ firstPendingMaterial: { title: "记录" }, isEmptyLibrary: false });
  assert.match(html, /aria-expanded="false" aria-controls="today-path-panel"/);
  assert.match(html, /id="today-path-panel" role="region" aria-labelledby="today-path-toggle"/);
  assert.doesNotMatch(html, /role="tablist"|role="tab"|aria-selected/);
  assert.match(html, /today-action-kicker">整理一条记录/);
});
