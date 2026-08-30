import test from "node:test";
import assert from "node:assert/strict";
import { handleNoteMoveStateChange } from "../../apps/web/src/app-shell-state-file-actions.js";
import { handleSaveNoteStateChange } from "../../apps/web/src/app-shell-save-note-state-actions.js";
import { switchVaultWithNoteMoveRecovery } from "../../apps/web/src/vault-switch-recovery.js";
import { createNoteMoveOperations } from "../../apps/api/src/note-move-operations.mjs";

test("desktop preflight rejection releases move lock and permits a fresh retry", async () => {
  const state = {}, messages = [];
  let attempts = 0, locked = false;
  const deps = {
    state, beginMoveInteraction: () => { locked = true; return () => { locked = false; }; },
    moveNote: async () => {
      if (++attempts === 1) throw Object.assign(new Error("Service not ready"), { code: "desktop_api_unavailable" });
      return { id: "n1", directoryId: "d2", body: "original" };
    },
    fetchNote: () => assert.fail("Unsent request needs no verification"),
    showMoveRecovery: () => assert.fail("Unsent request must not lock the note"),
    setStatus: text => messages.push(text)
  };
  assert.equal(await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, deps), false);
  assert.equal(locked, false);
  assert.equal(state.pendingNoteMoveId, "");
  assert.equal(Boolean(state.unresolvedNoteMove), false);
  assert.match(messages.at(-1), /Service not ready/);
  assert.equal(await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, deps), true);
  assert.equal(attempts, 2);
});

for (const code of ["PERMANENT_ORIGINALITY_BLOCKED", "desktop_api_unavailable"]) {
test(`late ${code} move rejection clears protection without reporting success`, async () => {
  let reject, retry, cleared = false;
  const messages = [], state = {};
  await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, {
    state, moveTimeoutMs: 5, verifyTimeoutMs: 50,
    beginMoveInteraction: () => () => {},
    moveNote: () => new Promise((_, r) => { reject = r; }),
    fetchNote: async () => ({ id: "n1", directoryId: "d1", body: "original" }),
    showMoveRecovery: fn => { retry = fn; return () => { cleared = true; }; },
    setStatus: text => messages.push(text)
  });
  reject(Object.assign(new Error("Move rejected"), { code }));
  await new Promise(r => setTimeout(r, 0));
  assert.equal(await retry(), true);
  assert.equal(state.unresolvedNoteMove, null);
  assert.equal(cleared, true);
  assert.match(messages.at(-1), /移动失败/);
  assert.equal(messages.some(text => text.includes("移动成功")), false);
});
}

test("timed out move verifies the destination without repeating the mutation", async () => {
  let locked = false, posts = 0, applied = null;
  const state = {};
  const result = await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, {
    state, moveTimeoutMs: 5, verifyTimeoutMs: 50,
    beginMoveInteraction: () => { locked = true; return () => { locked = false; }; },
    moveNote: () => { posts++; return new Promise(() => {}); },
    fetchNote: async () => ({ id: "n1", directoryId: "d2", body: "rewritten paths" }),
    moveNoteInClientState: (_id, _dir, item) => { applied = item; }
  });
  assert.equal(result, true);
  assert.equal(posts, 1);
  assert.equal(locked, false);
  assert.equal(applied.body, "rewritten paths");
});

test("unconfirmed move releases global lock, blocks save and supports read-only recheck", async () => {
  let retry, posts = 0, reads = 0, cleared = false, locked = false;
  const state = { notes: [{ id: "n1" }] };
  const result = await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, {
    state, moveTimeoutMs: 5, verifyTimeoutMs: 50,
    beginMoveInteraction: () => { locked = true; return () => { locked = false; }; },
    moveNote: () => { posts++; return new Promise(() => {}); },
    fetchNote: async () => ({ id: "n1", directoryId: ++reads === 1 ? "d1" : "d2", body: "confirmed" }),
    showMoveRecovery: callback => { retry = callback; return () => { cleared = true; }; }
  });
  assert.equal(result, false);
  assert.equal(locked, false);
  assert.equal(state.unresolvedNoteMove.noteId, "n1");
  const saved = await handleSaveNoteStateChange({ noteId: "n1", body: "stale paths" }, {
    state, updateNote: () => assert.fail("must not save unresolved note")
  });
  assert.equal(saved.ok, false);
  assert.equal(await retry(), true);
  assert.equal(posts, 1);
  assert.equal(cleared, true);
  assert.equal(state.unresolvedNoteMove, null);
});

test("slow graph refresh does not extend the move interaction lock", async () => {
  let finishGraph, locked = false;
  const pendingGraph = new Promise(resolve => { finishGraph = resolve; });
  try {
    const result = await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, {
      beginMoveInteraction: () => { locked = true; return () => { locked = false; }; },
      moveNote: async () => ({ id: "n1", directoryId: "d2", body: "done" }),
      refreshDirectoryGraph: () => { assert.equal(locked, false); return pendingGraph; }
    });
    assert.equal(result, true);
    assert.equal(locked, false);
  } finally { finishGraph(); }
});

test("failed rollback stays protected until the original location is confirmed", async () => {
  const state = {}, messages = [];
  let retry, restored = false, applied;
  const error = Object.assign(new Error("Restore the retained file to its original location"), {
    code: "NOTE_MOVE_RECOVERY_REQUIRED", details: { originalDirectoryId: "d1", originalMarkdownPath: "notes/d1/n.md" }
  });
  await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, {
    state, beginMoveInteraction: () => () => {}, moveNote: async () => { throw error; },
    fetchNote: async () => ({ id: "n1", directoryId: restored ? "d1" : "d2",
      markdownPath: restored ? "notes/d1/n.md" : "notes/d2/n.md", body: "Content" }),
    showMoveRecovery: callback => { retry = callback; return () => {}; },
    moveNoteInClientState: (_id, _dir, note) => { applied = note; }, setStatus: text => messages.push(text)
  });
  assert.equal(state.unresolvedNoteMove.noteId, "n1");
  assert.equal(await retry(), false);
  assert.equal(applied, undefined);
  const result = await handleSaveNoteStateChange({ noteId: "n1" }, { state, updateNote: () => assert.fail("Must remain protected") });
  assert.equal(result.ok, false);
  restored = true;
  assert.equal(await retry(), true);
  assert.equal(state.unresolvedNoteMove, null);
  assert.equal(applied.directoryId, "d1");
  assert.match(messages.at(-1), /恢复原位置/);
  assert.equal(messages.some(text => text.includes("移动成功")), false);
});

test("an undelivered request can be cancelled after service recovery, unlocking vault switching", async () => {
  const operations = createNoteMoveOperations(), state = {};
  let retry, online = false, id, instanceId;
  await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, {
    state, beginMoveInteraction: () => () => {},
    moveNote: async (_note, _directory, options) => {
      id = options.operationId;
      ({ instanceId } = operations.prepare(id, "n1"));
      throw Object.assign(new Error("Network refused the POST"), { code: "api_unavailable" });
    },
    checkNoteMove: async () => { if (!online) throw new Error("Offline"); return operations.check(id, "n1", instanceId); },
    fetchNote: () => assert.fail("cancelled operation needs no speculative location read"),
    showMoveRecovery: callback => { retry = callback; return () => {}; }
  });
  assert.equal(state.unresolvedNoteMove.noteId, "n1");
  online = true;
  assert.equal(await retry(), true);
  assert.equal(state.unresolvedNoteMove, null);
  await assert.rejects(operations.run(id, "n1", () => assert.fail("late POST must not run"), instanceId), { code: "NOTE_MOVE_CANCELLED" });
  const switched = await switchVaultWithNoteMoveRecovery(state, async () => ({ vaultPath: "B" }));
  assert.equal(switched.vaultPath, "B");
});

test("an active operation cannot be unlocked by a target-path response until it finishes", async () => {
  const state = {};
  let retry, finish, status = "pending", reads = 0;
  await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, {
    state, moveTimeoutMs: 5, beginMoveInteraction: () => () => {},
    moveNote: () => new Promise(resolve => { finish = resolve; }),
    checkNoteMove: async () => ({ state: status }),
    fetchNote: async () => { reads++; return { id: "n1", directoryId: "d2", body: "Complete" }; },
    showMoveRecovery: callback => { retry = callback; return () => {}; }
  });
  assert.equal(await retry(), false);
  assert.equal(reads, 0);
  status = "succeeded";
  finish({ id: "n1", directoryId: "d2", body: "Complete" });
  assert.equal(await retry(), true);
  assert.equal(state.unresolvedNoteMove, null);
});

test("service restart only releases protection after reading an intact note", async () => {
  const state = {};
  let retry, intact = false;
  await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, {
    state, beginMoveInteraction: () => () => {},
    moveNote: async () => { throw Object.assign(new Error("Service changed"), { code: "NOTE_MOVE_SERVICE_CHANGED" }); },
    checkNoteMove: async () => ({ state: "interrupted" }),
    fetchNote: async () => { if (!intact) throw new Error("File missing"); return { id: "n1", directoryId: "d1", body: "Original" }; },
    showMoveRecovery: callback => { retry = callback; return () => {}; }
  });
  assert.equal(state.unresolvedNoteMove.noteId, "n1");
  await assert.rejects(retry(), /File missing/);
  intact = true;
  assert.equal(await retry(), true);
  assert.equal(state.unresolvedNoteMove, null);
});

test("known rollback failure is not cancelled by an empty tracker after restart", async () => {
  const state = {};
  let retry;
  await handleNoteMoveStateChange({ noteId: "n1", directoryId: "d2" }, {
    state, beginMoveInteraction: () => () => {},
    moveNote: async () => { throw Object.assign(new Error("Recover original"), { code: "NOTE_MOVE_RECOVERY_REQUIRED", details: { originalDirectoryId: "d1", originalMarkdownPath: "source.md" } }); },
    checkNoteMove: () => assert.fail("known recovery failure must keep its recovery details"),
    fetchNote: async () => ({ id: "n1", directoryId: "d2", markdownPath: "target.md", body: "Target" }),
    showMoveRecovery: callback => { retry = callback; return () => {}; }
  });
  assert.equal(await retry(), false);
  assert.equal(state.unresolvedNoteMove.noteId, "n1");
});
