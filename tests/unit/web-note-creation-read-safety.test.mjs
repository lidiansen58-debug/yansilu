import test from "node:test";
import assert from "node:assert/strict";
import { createNoteCreationController } from "../../apps/web/src/note-creation-controller.js";
import { createNotePlaceholderRuntime } from "../../apps/web/src/note-placeholder-runtime.js";

const uuid = "11111111-1111-4111-8111-111111111111";
const item = { id: `note_${uuid}`, directoryId: "f", title: "New", body: "# New" };
function fixture(overrides = {}) {
  const state = { notes: [], tabs: [], selectedFolderId: "f" }, opened = [];
  const create = createNoteCreationController({ state, folderById: () => ({}), findUntitledPlaceholder: async () => null,
    isLocalOnlyNote: () => false, initialBodyForFolder: () => item.body, createId: () => uuid,
    createNote: async () => item, fetchNote: async () => null, mapNoteItem: n => ({ ...n, bodyLoaded: true }),
    ensureEditableNoteBody: text => text, openNoteById: id => opened.push(id),
    timeoutMs: 5, verifyTimeoutMs: 5, ...overrides });
  return { state, create, opened };
}

test("late POST result cannot replace current saved content or dirty tabs", async () => {
  for (const dirty of [false, true]) {
    let resolve, reads = 0;
    const f = fixture({ createNote: () => new Promise(r => { resolve = r; }),
      fetchNote: async () => { reads++; return reads === 1 ? null : { ...item, body: "# Latest on disk" }; } });
    await f.create();
    resolve(item); await new Promise(r => setTimeout(r, 0));
    f.state.notes = [{ ...item, body: "# Current client work", bodyLoaded: !dirty }];
    f.state.tabs = [{ noteId: item.id, body: "# Current client work", dirty }];
    const result = await f.create();
    assert.equal(reads, 2);
    assert.equal(result.note.body, "# Current client work");
    assert.equal(f.state.tabs[0].body, "# Current client work");
  }
});

test("recheck loads latest content instead of a cached successful POST", async () => {
  let resolve, reads = 0;
  const f = fixture({ createNote: () => new Promise(r => { resolve = r; }),
    fetchNote: async () => ++reads === 1 ? null : { ...item, body: "# Updated after creation" } });
  await f.create(); resolve(item); await new Promise(r => setTimeout(r, 0));
  assert.equal((await f.create()).note.body, "# Updated after creation");
});

test("a failed recheck never falls back to stale cached creation content", async () => {
  let resolve;
  const f = fixture({ createNote: () => new Promise(r => { resolve = r; }) });
  await f.create(); resolve(item); await new Promise(r => setTimeout(r, 0));
  assert.equal((await f.create()).error.code, "creation_pending");
  assert.deepEqual(f.state.notes, []);
});

test("desktop API preflight failure permits a fresh creation after recovery", async () => {
  let posts = 0, reads = 0;
  const f = fixture({ createNote: async () => {
    if (++posts === 1) throw Object.assign(new Error("Service not ready"), { code: "desktop_api_unavailable" });
    return item;
  }, fetchNote: async () => { reads++; return null; } });
  assert.equal((await f.create()).error.code, "desktop_api_unavailable");
  assert.equal((await f.create()).note.id, item.id);
  assert.equal(posts, 2); assert.equal(reads, 0);
});

test("recheck accepts the same ID after the created note has moved", async () => {
  const f = fixture({ createNote: () => new Promise(() => {}), fetchNote: async () => ({ ...item, directoryId: "moved" }) });
  const result = await f.create();
  assert.equal(result.note.directoryId, "moved");
  assert.deepEqual(f.opened, [item.id]);
});

test("placeholder lookup is read-only and cannot affect a switched vault", async () => {
  let release;
  const f = fixture();
  f.state.notes = [{ id: "keep", folderId: "f", title: "未命名笔记", bodyLoaded: false },
    { id: "shared", folderId: "f", title: "未命名笔记", body: "# 未命名笔记", bodyLoaded: true }];
  const runtime = createNotePlaceholderRuntime(() => ({ state: f.state, noteTabFor: () => null,
    isLocalOnlyNote: () => false, typeFromFolder: () => "fleeting", ensureEditableNoteBody: x => x,
    initialBodyForFolder: () => "# 未命名笔记", mapNoteItem: x => x,
    fetchNote: () => new Promise(r => { release = r; }), deleteNote: () => assert.fail("Lookup must never delete") }));
  const scope = f.state.noteMoveVaultScope = {};
  const pending = runtime.findUntitledPlaceholder("f", { isCurrent: () => f.state.noteMoveVaultScope === scope });
  f.state.noteMoveVaultScope = {};
  f.state.notes = [{ id: "shared", body: "Important content in new vault" }];
  release({ id: "keep", folderId: "f", title: "未命名笔记", body: "# 未命名笔记" });
  assert.equal(await pending, null);
  assert.deepEqual(f.state.notes, [{ id: "shared", body: "Important content in new vault" }]);
});

test("creation reuses a placeholder without deleting duplicates or rewriting its template", async () => {
  const kept = { ...item, body: "# Existing empty template", bodyLoaded: true };
  const f = fixture({ findUntitledPlaceholder: async () => kept, createNote: () => assert.fail("Must reuse") });
  const result = await f.create();
  assert.equal(result.reused, true);
  assert.equal(result.cleanedCount, 0);
  assert.equal(result.note.body, kept.body);
});
