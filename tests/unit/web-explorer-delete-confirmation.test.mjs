import test from "node:test";
import assert from "node:assert/strict";
import { ExplorerPane } from "../../apps/web/src/components-explorer-pane.js";
import { confirmExplorerDelete } from "../../apps/web/src/explorer-delete-confirmation.js";
import { handleNoteDeleteStateChange, handleDirectoryDeleteStateChange } from "../../apps/web/src/app-shell-state-file-actions.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture() {
  const calls = [], messages = [];
  const state = {
    noteMoveVaultScope: {}, tabs: [],
    notes: [{ id: "n", title: "待删除笔记", body: "保留正文", folderId: "root", markdownPath: "note.md", fileRevision: "v1" }],
    folders: [{ id: "root", isDefault: true }, { id: "d", name: "空目录", parentId: "root", fsPath: "/vault/empty" }]
  };
  return { state, calls, messages, onStatus: (...args) => messages.push(args), onStateChange: async (...args) => { calls.push(args); return true; } };
}

for (const kind of ["file", "folder"]) {
  const target = { kind, id: kind === "file" ? "n" : "d" };
  test(`${kind} deletion waits for a decision, ignores repeated clicks, cancellation permits retry`, async () => {
    const host = fixture(), decision = deferred();
    let prompts = 0;
    const ask = () => { prompts++; return decision.promise; };
    const pending = confirmExplorerDelete(host, target, ask);
    assert.equal(await confirmExplorerDelete(host, target, ask), false);
    assert.equal(prompts, 1);
    assert.deepEqual(host.calls, []);
    decision.resolve(false);
    assert.equal(await pending, false);
    assert.deepEqual(host.calls, []);
    assert.equal(await confirmExplorerDelete(host, target, () => true), true);
    assert.deepEqual(host.calls, [[kind === "file" ? "note-delete" : "directory-delete", {
      [kind === "file" ? "noteId" : "directoryId"]: target.id, expectedVaultScope: host.state.noteMoveVaultScope
    }]]);
  });
  for (const [label, change] of [
    ["vault changed", host => { host.state.noteMoveVaultScope = {}; }],
    ["vault switching", host => { host.state.noteMoveVaultSwitching = true; }],
    ["vault uncertain", host => { host.state.noteMoveVaultUncertain = true; }],
    ["target disappeared", host => { host.state[kind === "file" ? "notes" : "folders"] = []; }],
    ["target changed", host => { host.state[kind === "file" ? "notes" : "folders"][kind === "file" ? 0 : 1][kind === "file" ? "body" : "fsPath"] = "changed"; }]
  ]) {
    test(`${kind} deletion aborts when ${label} while confirmation is pending`, async () => {
      const host = fixture(), decision = deferred();
      const pending = confirmExplorerDelete(host, target, () => decision.promise);
      change(host);
      decision.resolve(true);
      assert.equal(await pending, false);
      assert.deepEqual(host.calls, []);
    });
  }
  test(`${kind} deletion retains its duplicate guard until mutation completes`, async () => {
    const host = fixture(), mutation = deferred();
    host.onStateChange = async (...args) => { host.calls.push(args); return mutation.promise; };
    const pending = confirmExplorerDelete(host, target, () => true);
    await Promise.resolve();
    assert.equal(host.calls.length, 1);
    let prompts = 0;
    assert.equal(await confirmExplorerDelete(host, target, () => { prompts++; return true; }), false);
    assert.equal(prompts, 0);
    mutation.resolve(true);
    assert.equal(await pending, true);
  });
  test(`${kind} confirmation failure leaves data untouched and releases guard`, async () => {
    const host = fixture();
    assert.equal(await confirmExplorerDelete(host, target, () => Promise.reject(new Error("native dialog failed"))), false);
    assert.deepEqual(host.calls, []);
    assert.equal(host.messages.length, 1);
    assert.equal(await confirmExplorerDelete(host, target, () => true), true);
  });
}

test("pending delete tolerates equivalent hydration but aborts an edited open draft", async () => {
  const host = fixture(), decision = deferred();
  const pending = confirmExplorerDelete(host, { kind: "file", id: "n" }, () => decision.promise);
  host.state.notes = structuredClone(host.state.notes);
  decision.resolve(true);
  assert.equal(await pending, true);
  const next = deferred();
  host.state.tabs = [{ id: "tab_n", noteId: "n", body: "保留正文", title: "标题", dirty: false }];
  const edited = confirmExplorerDelete(host, { kind: "file", id: "n" }, () => next.promise);
  host.state.tabs[0].body = "新草稿";
  next.resolve(true);
  assert.equal(await edited, false);
  assert.equal(host.calls.length, 1);
});

test("directories containing notes, subdirectories or default roots never prompt or delete", async () => {
  for (const change of [
    host => { host.state.notes[0].folderId = "d"; },
    host => { host.state.folders.push({ id: "child", parentId: "d" }); },
    host => { host.state.folders[1].isDefault = true; }
  ]) {
    const host = fixture(); change(host);
    let prompts = 0;
    assert.equal(await confirmExplorerDelete(host, { kind: "folder", id: "d" }, () => { prompts++; return true; }), false);
    assert.equal(prompts, 0);
    assert.deepEqual(host.calls, []);
    assert.equal(host.messages.length, 1);
  }
});

test("an empty directory that gains contents while awaiting approval is preserved", async () => {
  const host = fixture(), decision = deferred();
  const pending = confirmExplorerDelete(host, { kind: "folder", id: "d" }, () => decision.promise);
  host.state.notes[0].folderId = "d";
  decision.resolve(true);
  assert.equal(await pending, false);
  assert.deepEqual(host.calls, []);
});

test("actual Explorer context routing waits for async cancellation for both delete actions", async () => {
  const previous = globalThis.confirm;
  try {
    for (const target of [{ kind: "file", id: "n" }, { kind: "folder", id: "d" }]) {
      const host = fixture(), decision = deferred();
      globalThis.confirm = () => decision.promise;
      const pending = ExplorerPane.prototype.handleContextAction.call(host, "delete", target);
      assert.deepEqual(host.calls, []);
      decision.resolve(false);
      assert.equal(await pending, false);
      assert.deepEqual(host.calls, []);
    }
  } finally { globalThis.confirm = previous; }
});

for (const [kind, handler, payload] of [
  ["file", handleNoteDeleteStateChange, { noteId: "n" }],
  ["folder", handleDirectoryDeleteStateChange, { directoryId: "d" }]
]) {
  test(`${kind} delete sends the confirmed path and ignores a late result after only the path changes`, async () => {
    const host = fixture(), mutation = deferred(), requests = [];
    let vaultPath = "E:/confirmed-vault";
    const remove = (id, options) => { requests.push([id, options]); return mutation.promise; };
    const pending = handler(payload, {
      state: host.state, getVaultPath: () => vaultPath, deleteNote: remove, deleteDirectory: remove,
      removeNoteFromClientState: () => assert.fail("late client mutation"),
      setStatus: () => assert.fail("late status"), renderAll: () => assert.fail("late render")
    });
    assert.deepEqual(requests, [[kind === "file" ? "n" : "d", { expectedVaultPath: "E:/confirmed-vault" }]]);
    vaultPath = "E:/copied-vault";
    mutation.resolve();
    assert.equal(await pending, false);
    assert.equal(host.state.notes.length, 1);
    assert.equal(host.state.folders.length, 2);
  });
  test(`${kind} deletion state handler rejects stale confirmation scope before calling API`, async () => {
    const host = fixture();
    assert.equal(await handler({ ...payload, expectedVaultScope: {} }, {
      state: host.state, deleteNote: () => assert.fail("stale delete"), deleteDirectory: () => assert.fail("stale delete")
    }), false);
  });
  for (const fails of [false, true]) {
    test(`${kind} ${fails ? "failed" : "successful"} delete completion cannot mutate a newly selected vault`, async () => {
      const host = fixture(), mutation = deferred(), before = structuredClone(host.state);
      const pending = handler(payload, {
        state: host.state, deleteNote: () => mutation.promise, deleteDirectory: () => mutation.promise,
        removeNoteFromClientState: () => assert.fail("late client mutation"),
        setStatus: () => assert.fail("late status"), renderAll: () => assert.fail("late render")
      });
      host.state.noteMoveVaultScope = {};
      if (fails) mutation.reject(new Error("old vault failure")); else mutation.resolve();
      assert.equal(await pending, false);
      assert.deepEqual(host.state.notes, before.notes);
      assert.deepEqual(host.state.folders, before.folders);
    });
  }
}
