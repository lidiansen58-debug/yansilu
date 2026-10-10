import test from "node:test";
import assert from "node:assert/strict";
import { createWritingThemeEditController } from "../../apps/web/src/writing-theme-edit-controller.js";

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function fixture(overrides = {}) {
  const state = { module: "writing", noteMoveVaultScope: {} };
  const writingState = { project: { id: "project-original" }, selectedThemeIndexId: "other-theme" };
  const card = { id: "theme", title: "主题", updated_at: "2026-10-11T00:00:00.000Z", items: [{ note_id: "note-original" }] };
  const updates = [], renders = [], notices = [];
  let path = "/original", basket = ["note-original"];
  const deps = { state, writingState, getVaultPath: () => path, parseWritingBasketIds: () => basket,
    upsertWritingThemeIndex: value => renders.push(value), renderWritingPanel: () => renders.push("render"), setStatus: (...args) => notices.push(args) };
  const controller = createWritingThemeEditController({ depsProvider: () => deps, fetchCard: async () => card,
    updateCard: async (id, values) => { updates.push({ id, values }); return { ...card, ...values }; }, requestEdit: async options => options, ...overrides });
  return { controller, state, writingState, card, updates, renders, notices,
    setPath: value => { path = value; }, setBasket: value => { basket = value; } };
}

test("theme edits bind their original vault and revision without changing member lists or project context", async () => {
  const f = fixture(), before = structuredClone(f.writingState);
  const dialog = await f.controller.open("theme");
  await dialog.onSave({ title: "新名称", centralQuestion: "新问题" });
  assert.deepEqual(f.updates, [{ id: "theme", values: { title: "新名称", centralQuestion: "新问题", expectedUpdatedAt: f.card.updated_at, expectedVaultPath: "/original" } }]);
  assert.deepEqual(f.writingState, before);
  assert.equal(f.renders.length, 2);
  assert.deepEqual(f.notices, [["已保存主题：新名称", "ok"]]);
});

test("late theme reads do not open an editor after leaving writing or changing vault scope", async () => {
  for (const change of [f => { f.state.module = "graph"; }, f => { f.state.noteMoveVaultScope = {}; }, f => f.setPath("/clone")]) {
    const read = deferred(); let opened = false;
    const f = fixture({ fetchCard: () => read.promise, requestEdit: async () => { opened = true; } });
    const opening = f.controller.open("theme");
    change(f); read.resolve(f.card);
    assert.equal(await opening, null);
    assert.equal(opened, false);
    assert.equal(f.updates.length, 0);
  }
});

test("changing the basket, current project, or vault blocks a pending theme form before it writes", async () => {
  for (const change of [f => f.setBasket(["other-note"]), f => { f.writingState.project = { id: "other-project" }; },
    f => { f.state.noteMoveVaultUncertain = true; }, f => { f.state.noteMoveVaultSwitching = true; }]) {
    const f = fixture(), dialog = await f.controller.open("theme"); change(f);
    assert.equal(dialog.isCurrent(), false);
    await assert.rejects(dialog.onSave({ centralQuestion: "旧表单" }), /已切换/);
    assert.equal(f.updates.length, 0);
  }
});

test("late theme read failures cannot publish an error after moving to another page", async () => {
  const read = deferred(); let opened = false;
  const f = fixture({ fetchCard: () => read.promise, requestEdit: async () => { opened = true; } });
  const opening = f.controller.open("theme");
  f.state.module = "graph";
  read.reject(new Error("late network failure"));
  assert.equal(await opening, null);
  assert.equal(opened, false);
  assert.deepEqual(f.notices, []);
});

test("a theme save finishing after a vault switch never renders its result in the new vault", async () => {
  const write = deferred(); const f = fixture({ updateCard: () => write.promise });
  const dialog = await f.controller.open("theme"), saving = dialog.onSave({ title: "原库修改" });
  f.setPath("/clone"); write.resolve({ ...f.card, title: "原库修改" });
  assert.equal(await saving, null);
  assert.deepEqual(f.renders, []);
  assert.deepEqual(f.notices, []);
});

test("repeated theme opens share one pending read and a failed read allows reopening", async () => {
  const read = deferred(); let calls = 0;
  const f = fixture({ fetchCard: () => { calls++; return read.promise; } });
  const first = f.controller.open("theme"), second = f.controller.open("theme");
  assert.equal(first, second); assert.equal(calls, 1);
  read.resolve(null); await assert.rejects(first, /没有找到/);
  await assert.rejects(f.controller.open("theme"), /没有找到/);
  assert.equal(calls, 2);
});

test("server conflicts propagate to the form without publishing stale edits to the theme list", async () => {
  const conflict = Object.assign(new Error("conflict"), { code: "INDEX_CARD_CONFLICT" });
  const f = fixture({ updateCard: async () => { throw conflict; } });
  const dialog = await f.controller.open("theme");
  await assert.rejects(dialog.onSave({ centralQuestion: "待保留的问题" }), error => error === conflict);
  assert.deepEqual(f.renders, []);
  assert.deepEqual(f.notices, []);
});
