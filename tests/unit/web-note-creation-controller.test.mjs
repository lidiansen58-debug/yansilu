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

function memoryStorage() {
  const records = new Map();
  return { records, getItem: key => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
}

test("a refreshed creation controller reads the original ID without another POST", async () => {
  const storage = memoryStorage();
  let posts = 0, found = null;
  const dependencies = { getVaultPath: () => "A", getStorage: () => storage,
    createNote: async () => { posts++; throw Object.assign(new Error("lost"), { code: "api_unavailable" }); },
    fetchNote: async noteId => { assert.equal(noteId, created.id); return found; } };
  const first = fixture(dependencies);
  assert.equal((await first.create()).error.code, "creation_pending");
  found = created;
  const refreshed = fixture({ ...dependencies, createId: () => "new-id-must-not-be-used" });
  refreshed.state.selectedFolderId = "another-folder";
  assert.equal((await refreshed.create()).note.id, created.id);
  assert.equal(posts, 1);
  assert.equal(storage.records.size, 0);
  assert.deepEqual(refreshed.opened, [created.id]);
});

test("creation recovery is isolated by vault and storage failure prevents writes", async () => {
  const storage = memoryStorage();
  const first = fixture({ getVaultPath: () => "A", getStorage: () => storage,
    createNote: async () => { throw Object.assign(new Error("lost"), { code: "api_unavailable" }); } });
  await first.create();
  const anotherVault = fixture({ getVaultPath: () => "B", getStorage: () => storage });
  assert.equal((await anotherVault.create()).note.id, created.id);
  assert.equal(anotherVault.posts(), 1);
  assert.equal(storage.records.size, 1);
  const full = fixture({ getVaultPath: () => "C", getStorage: () => ({
    getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => {} }) });
  assert.equal((await full.create()).error.code, "CREATION_RECOVERY_STORAGE_FAILED");
  assert.equal(full.posts(), 0);
  assert.equal(full.state.pendingNoteCreation, null);
});

test("corrupt creation records cannot silently start a new creation", async () => {
  const f = fixture({ getVaultPath: () => "A", getStorage: () => ({ getItem: () => "null" }) });
  assert.equal((await f.create()).error.code, "CREATION_RECOVERY_STORAGE_FAILED");
  assert.equal(f.posts(), 0);
  assert.deepEqual(f.opened, []);
});

test("an unexpected post-write error retains recovery and verifies the same ID", async () => {
  const storage = memoryStorage();
  let found = null, posts = 0;
  const f = fixture({ getVaultPath: () => "A", getStorage: () => storage,
    createNote: async () => { posts++; throw new Error("unexpected failure after write"); },
    fetchNote: async () => found });
  assert.equal((await f.create()).error.code, "creation_pending");
  assert.equal(storage.records.size, 1);
  found = created;
  assert.equal((await f.create()).note.id, created.id);
  assert.equal(posts, 1);
});

test("a generic payload error after writing cannot discard an existing created note", async () => {
  const f = fixture({ createNote: async () => { throw Object.assign(new Error("catalog failed"), { code: "NOTE_PAYLOAD_INVALID" }); },
    fetchNote: async () => created });
  assert.equal((await f.create()).note.id, created.id);
});

test("creation uses a stable ID and opens the persisted result", async () => {
  let payload;
  const f = fixture({ createNote: async value => { payload = value; return created; } });
  const result = await f.create();
  assert.equal(payload.clientCreationId, id);
  assert.equal(result.remote, true);
  assert.deepEqual(f.opened, [created.id]);
});

test("newly created notes retain the exact disk body as their save baseline", async () => {
  const diskNote = { ...created, body: "# Test\n", fileRevision: "a".repeat(64) };
  const f = fixture({ createNote: async () => diskNote, ensureEditableNoteBody: text => `${text}\n\n` });
  const result = await f.create();
  assert.equal(result.note.body, diskNote.body);
  assert.equal(result.note.fileRevision, diskNote.fileRevision);
});

for (const acknowledgement of [{ ...created, id: "wrong-note" }, { id: created.id }, null]) {
  test(`invalid acknowledgement ${JSON.stringify(acknowledgement)} cannot open an unrelated or incomplete note`, async () => {
    let posts = 0, found = null;
    const f = fixture({ createNote: async () => { posts++; return acknowledgement; }, fetchNote: async () => found });
    assert.equal((await f.create()).error.code, "creation_pending");
    assert.deepEqual(f.opened, []);
    found = created;
    assert.equal((await f.create()).note.id, created.id);
    assert.equal(posts, 1);
    assert.deepEqual(f.opened, [created.id]);
  });
}

test("hung creation returns feedback and subsequent clicks only recheck", async () => {
  let posts = 0, reads = 0;
  const f = fixture({ createNote: () => { posts++; return new Promise(() => {}); },
    fetchNote: async noteId => { reads++; assert.equal(noteId, created.id); return null; } });
  const first = f.create(), duplicate = f.create();
  assert.equal(first, duplicate);
  assert.match((await first).error.message, /创建结果尚未确认/);
  assert.match((await f.create()).error.message, /创建结果尚未确认/);
  assert.equal(posts, 2); assert.equal(reads, 3); assert.deepEqual(f.opened, []);
});

test("a confirmed-missing creation retries its original ID and payload", async () => {
  const requests = [];
  const f = fixture({ createNote: async input => {
    requests.push(input);
    if (requests.length === 1) throw Object.assign(new Error("response lost"), { code: "request_timeout" });
    return created;
  }, fetchNote: async () => { throw Object.assign(new Error("missing"), { code: "NOTE_NOT_FOUND" }); } });
  assert.equal((await f.create()).error.code, "creation_pending");
  const result = await f.create();
  assert.equal(result.note.id, created.id);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(requests[1].clientCreationId, id);
  assert.deepEqual(f.opened, [created.id]);
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

test("transport replay rejection rechecks the original creation without another POST", async () => {
  let posts = 0, found = null;
  const f = fixture({ createNote: async () => {
    posts++;
    throw Object.assign(new Error("Already exists"), { code: "NOTE_ID_EXISTS" });
  }, fetchNote: async () => found });
  assert.equal((await f.create()).error.code, "creation_pending");
  assert.ok(f.state.pendingNoteCreation);
  assert.deepEqual(f.opened, []);
  found = created;
  assert.equal((await f.create()).note.id, created.id);
  assert.equal(posts, 1);
  assert.equal(f.state.pendingNoteCreation, null);
  assert.deepEqual(f.opened, [created.id]);
});

for (const code of ["desktop_api_unavailable", "VAULT_CHANGED"]) {
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
