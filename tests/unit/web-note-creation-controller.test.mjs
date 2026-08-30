import test from "node:test";
import assert from "node:assert/strict";
import { createNoteCreationController } from "../../apps/web/src/note-creation-controller.js";
import { switchVaultWithNoteMoveRecovery } from "../../apps/web/src/vault-switch-recovery.js";

const id = "a1234567-1234-1234-1234-123456789abc";
const created = { id: `note_${id}`, directoryId: "folder", body: "# Test" };
function fixture(overrides = {}) {
  const state = { notes: [], tabs: [], selectedFolderId: "folder" }, opened = [];
  let posts = 0;
  const create = createNoteCreationController({ state, folderById: () => ({}),
    findUntitledPlaceholder: async () => null, isLocalOnlyNote: () => false,
    initialBodyForFolder: () => "# Test", mapNoteItem: item => ({ ...item, bodyLoaded: true }), ensureEditableNoteBody: text => text,
    createNote: async () => { posts++; return created; }, fetchNote: async () => null,
    openStandaloneEditorWindow: id => opened.push(id), openNoteById: id => opened.push(id),
    createId: () => id, timeoutMs: 5, verifyTimeoutMs: 5, ...overrides });
  return { state, opened, create, posts: () => posts };
}

test("creation uses a stable ID and opens the persisted result", async () => {
  let payload;
  const f = fixture({ createNote: async value => { payload = value; return created; } });
  const result = await f.create();
  assert.equal(payload.clientCreationId, id);
  assert.equal(result.remote, true);
  assert.deepEqual(f.opened, [created.id]);
});

test("hung creation returns feedback and subsequent clicks only recheck", async () => {
  let posts = 0, reads = 0;
  const f = fixture({ createNote: () => { posts++; return new Promise(() => {}); },
    fetchNote: async noteId => { reads++; assert.equal(noteId, created.id); return null; } });
  const first = f.create(), duplicate = f.create();
  assert.equal(first, duplicate);
  assert.match((await first).error.message, /创建结果尚未确认/);
  assert.match((await f.create()).error.message, /创建结果尚未确认/);
  assert.equal(posts, 1); assert.equal(reads, 2); assert.deepEqual(f.opened, []);
});

test("lost creation response is recovered by ID without a second POST", async () => {
  let posts = 0;
  const f = fixture({ createNote: () => { posts++; return new Promise(() => {}); }, fetchNote: async () => created });
  assert.equal((await f.create()).note.id, created.id);
  assert.equal(posts, 1); assert.deepEqual(f.opened, [created.id]);
});

test("late successful creation is opened only when the user rechecks", async () => {
  let resolve;
  let current = null;
  const f = fixture({ createNote: () => new Promise(r => { resolve = r; }), fetchNote: async () => current });
  assert.ok((await f.create()).error);
  resolve(created); await new Promise(r => setTimeout(r, 0));
  current = created;
  assert.deepEqual(f.opened, []);
  assert.equal((await f.create()).note.id, created.id);
});

test("late definitive rejection releases creation for a fresh attempt", async () => {
  let reject, posts = 0;
  const f = fixture({ createNote: () => { posts++; return posts === 1 ? new Promise((_, r) => { reject = r; }) : Promise.resolve(created); } });
  await f.create();
  reject(Object.assign(new Error("Read-only directory"), { code: "NOTE_PAYLOAD_INVALID" }));
  await new Promise(r => setTimeout(r, 0));
  assert.match((await f.create()).error.message, /Read-only/);
  assert.equal((await f.create()).note.id, created.id);
  assert.equal(posts, 2);
});

test("creation that finishes after switching vaults never inserts old data", async () => {
  let resolve;
  const f = fixture({ createNote: () => new Promise(r => { resolve = r; }) });
  await f.create();
  f.state.noteMoveVaultScope = {};
  resolve(created); await new Promise(r => setTimeout(r, 0));
  assert.deepEqual(f.state.notes, []); assert.deepEqual(f.opened, []);
});

test("creation blocks switching until a late result is known and binds the original vault", async () => {
  let resolve, payload;
  const f = fixture({ getVaultPath: () => "A", createNote: input => {
    payload = input; return new Promise(r => { resolve = r; });
  } });
  await f.create();
  assert.equal(payload.expectedVaultPath, "A");
  assert.ok(f.state.pendingNoteCreation);
  await assert.rejects(switchVaultWithNoteMoveRecovery(f.state, () => assert.fail("Must not switch")), /创建/);
  resolve(created); await new Promise(r => setImmediate(r));
  assert.equal(f.state.pendingNoteCreation, null);
});

for (const code of ["desktop_api_unavailable", "VAULT_CHANGED", "NOTE_ID_EXISTS"]) {
  test(`${code} releases the creation switch guard`, async () => {
    const f = fixture({ createNote: async () => { throw Object.assign(new Error("Rejected"), { code }); } });
    assert.equal((await f.create()).error.code, code);
    assert.equal(f.state.pendingNoteCreation, null);
  });
}

for (const late of ["empty", "placeholder", "failure"]) {
  test(`timed-out preparation unlocks switching and ignores late ${late}`, async () => {
    let resolve, reject, signal, calls = 0;
    const f = fixture({ findUntitledPlaceholder: (_folder, options) => {
      signal = options.signal;
      if (++calls > 1) return null;
      return new Promise((r, fail) => { resolve = r; reject = fail; });
    } });
    const first = await f.create();
    assert.equal(first.error.code, "creation_prepare_timeout");
    assert.equal(signal.aborted, true);
    assert.equal(f.state.pendingNoteCreation, null);
    assert.equal(f.posts(), 0);
    const result = await f.create();
    assert.equal(result.note.id, created.id);
    if (late === "failure") reject(new Error("Late read error"));
    else resolve(late === "placeholder" ? { id: "old", body: "Stale" } : null);
    await new Promise(r => setImmediate(r));
    assert.equal(f.posts(), 1);
    assert.deepEqual(f.opened, [created.id]);
    assert.equal(f.state.pendingNoteCreation, null);
  });
}

test("a timed-out preparation permits an actual vault switch without a late POST", async () => {
  let resolve;
  const f = fixture({ findUntitledPlaceholder: () => new Promise(r => { resolve = r; }) });
  await f.create();
  const vault = await switchVaultWithNoteMoveRecovery(f.state, async () => ({ vaultPath: "B" }));
  assert.equal(vault.vaultPath, "B");
  resolve(null); await new Promise(r => setImmediate(r));
  assert.equal(f.posts(), 0);
});
