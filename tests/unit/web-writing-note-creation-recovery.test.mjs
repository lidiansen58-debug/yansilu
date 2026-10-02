import test from "node:test";
import assert from "node:assert/strict";
import { acknowledgeWritingNoteBinding, createWritingNoteWithRecovery } from "../../apps/web/src/writing-note-creation-recovery.js";

const id = "12345678-1234-4234-8234-123456789abc";
const payload = { directoryId: "dir", body: "Original prose" };
const note = { ...payload, id: `note_${id}` };

function memoryStorage() {
  const records = new Map();
  return { records, getItem: key => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
}

test("successful creation remains recoverable across refresh until binding is confirmed", async () => {
  const storage = memoryStorage();
  let writes = 0;
  const deps = { recoveryStorage: storage, retainCreationRecovery: true, getVaultPath: () => "vault-A",
    createNoteId: () => id, createNote: async () => { writes++; return note; }, fetchNote: async () => note };
  await createWritingNoteWithRecovery({}, deps, payload, "project/chapter");
  assert.equal(storage.records.size, 1);
  const restored = await createWritingNoteWithRecovery({}, deps, payload, "project/chapter");
  assert.equal(restored.note.id, note.id);
  assert.equal(writes, 1);
  acknowledgeWritingNoteBinding(deps, "project/chapter", "wrong-note");
  assert.equal(storage.records.size, 1);
  acknowledgeWritingNoteBinding(deps, "project/chapter", note.id);
  assert.equal(storage.records.size, 0);
});

test("refresh restores the original creation ID and submitted text without posting again", async () => {
  const storage = memoryStorage();
  let posts = 0, readable = false;
  const deps = { recoveryStorage: storage, getVaultPath: () => "vault-A", createNoteId: () => id,
    createNote: async () => { posts++; throw Object.assign(new Error("Lost response"), { code: "request_timeout" }); },
    fetchNote: async requested => { assert.equal(requested, note.id); return readable ? note : null; } };
  await assert.rejects(createWritingNoteWithRecovery({}, deps, payload, "project/chapter"), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
  const refreshedHolder = {};
  readable = true;
  const result = await createWritingNoteWithRecovery(refreshedHolder, { ...deps, state: { noteMoveVaultScope: {} } },
    { ...payload, body: "New input after refresh" }, "project/chapter");
  assert.equal(result.submittedBody, payload.body);
  assert.equal(result.note.id, note.id);
  assert.equal(result.recovered, true);
  assert.equal(posts, 1);
  assert.equal(storage.records.size, 0);
});

test("confirmed-missing writing creation retries the stored payload with the same ID", async () => {
  const storage = memoryStorage();
  const requests = [];
  const deps = { recoveryStorage: storage, getVaultPath: () => "vault-A", createNoteId: () => id,
    createNote: async input => {
      requests.push(input);
      if (requests.length === 1) throw Object.assign(new Error("Lost response"), { code: "request_timeout" });
      return note;
    }, fetchNote: async () => { throw Object.assign(new Error("missing"), { code: "NOTE_NOT_FOUND" }); } };
  await assert.rejects(createWritingNoteWithRecovery({}, deps, payload, "project/chapter"), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
  const recovered = await createWritingNoteWithRecovery({}, deps, { ...payload, body: "Newer prose" }, "project/chapter");
  assert.equal(recovered.note.id, note.id);
  assert.equal(recovered.submittedBody, payload.body);
  assert.equal(recovered.recovered, true);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(requests[1].clientCreationId, id);
  assert.equal(storage.records.size, 0);
});

test("storage failure prevents a creation that could not be recovered after refresh", async () => {
  const deps = { getVaultPath: () => "vault-A", createNoteId: () => id,
    recoveryStorage: { getItem: () => null, setItem: () => { throw new Error("Quota"); } },
    createNote: () => assert.fail("Must not POST") };
  await assert.rejects(createWritingNoteWithRecovery({}, deps, payload, "project"), { code: "WRITING_RECOVERY_STORAGE_FAILED" });
});

test("pending creation storage is isolated by vault and writing context", async () => {
  const storage = memoryStorage();
  let posts = 0;
  const base = { recoveryStorage: storage, createNoteId: () => id, fetchNote: async () => null,
    createNote: async () => { posts++; throw Object.assign(new Error("Lost response"), { code: "request_timeout" }); } };
  for (const [vault, context] of [["A", "article"], ["B", "article"], ["A", "chapter"]]) {
    await assert.rejects(createWritingNoteWithRecovery({}, { ...base, getVaultPath: () => vault }, payload, context), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
  }
  assert.equal(posts, 3);
  assert.equal(storage.records.size, 3);
  await assert.rejects(createWritingNoteWithRecovery({}, { ...base, getVaultPath: () => "A" }, payload, "article"), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
  assert.equal(posts, 4);
});

test("a corrupt stored operation never allows a replacement creation", async () => {
  const storage = memoryStorage();
  storage.setItem("yansilu:writing-creation:v1:vault-A:project", "{broken");
  await assert.rejects(createWritingNoteWithRecovery({}, { recoveryStorage: storage, getVaultPath: () => "vault-A",
    createNote: () => assert.fail("Must not POST") }, payload, "project"), { code: "WRITING_RECOVERY_STORAGE_FAILED" });
});

for (const context of ["article", "chapter"]) {
  test(`${context} creation replay preserves original payload and only rechecks`, async () => {
    const holder = {};
    let writes = 0, readable = false;
    const deps = { createNoteId: () => id, createNote: async input => {
      writes++;
      assert.equal(input.clientCreationId, id);
      throw Object.assign(new Error("Already created"), { code: "NOTE_ID_EXISTS" });
    }, fetchNote: async requestedId => {
      assert.equal(requestedId, note.id);
      if (!readable) throw new Error("Service unavailable");
      return note;
    } };
    await assert.rejects(createWritingNoteWithRecovery(holder, deps, payload, context), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
    assert.ok(holder.pendingNoteCreation);
    readable = true;
    const recovered = await createWritingNoteWithRecovery(holder, deps, { ...payload, body: "Later input" }, context);
    assert.equal(recovered.note, note);
    assert.equal(recovered.submittedBody, payload.body);
    assert.equal(recovered.recovered, true);
    assert.equal(writes, 1);
    assert.equal(holder.pendingNoteCreation, null);
  });
}

for (const result of [null, { ...note, id: "wrong" }, { ...note, directoryId: "other" }, { id: note.id, directoryId: "dir" }]) {
  test(`invalid creation/readback ${JSON.stringify(result)} remains uncertain without reposting`, async () => {
    const holder = {};
    let writes = 0;
    const deps = { createNoteId: () => id, createNote: async () => { writes++; return result; }, fetchNote: async () => result };
    for (let n = 0; n < 2; n++) await assert.rejects(createWritingNoteWithRecovery(holder, deps, payload, "article"), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
    assert.equal(writes, result === null ? 2 : 1);
  });
}

test("a hung create is bounded and late success is not applied without a recheck", async () => {
  const holder = {};
  let resolve, found = null, writes = 0;
  const deps = { creationTimeoutMs: 5, creationVerifyTimeoutMs: 5, createNoteId: () => id,
    createNote: () => { writes++; return new Promise(done => { resolve = done; }); }, fetchNote: async () => found };
  await assert.rejects(createWritingNoteWithRecovery(holder, deps, payload, "article"), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
  resolve(note);
  await new Promise(done => setImmediate(done));
  assert.ok(holder.pendingNoteCreation);
  found = note;
  assert.equal((await createWritingNoteWithRecovery(holder, deps, payload, "article")).note, note);
  assert.equal(writes, 1);
});

test("a definitive rejection allows a fresh create and binds the expected vault", async () => {
  const holder = {};
  let writes = 0;
  const deps = { getVaultPath: () => "vault-A", createNoteId: () => id, createNote: async input => {
    assert.equal(input.expectedVaultPath, "vault-A");
    assert.equal(input.clientCreationId, id);
    if (++writes === 1) throw Object.assign(new Error("invalid input"), { code: "NOTE_PAYLOAD_INVALID" });
    return note;
  } };
  await assert.rejects(createWritingNoteWithRecovery(holder, deps, payload, "article"), { code: "NOTE_PAYLOAD_INVALID" });
  assert.equal(holder.pendingNoteCreation, null);
  assert.equal((await createWritingNoteWithRecovery(holder, deps, payload, "article")).note, note);
  assert.equal(writes, 2);
});
