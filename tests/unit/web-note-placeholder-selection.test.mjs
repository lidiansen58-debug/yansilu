import test from "node:test";
import assert from "node:assert/strict";
import { createNotePlaceholderRuntime } from "../../apps/web/src/note-placeholder-runtime.js";
import { createNoteCreationController } from "../../apps/web/src/note-creation-controller.js";

const title = "\u672a\u547d\u540d\u7b14\u8bb0";
const heading = `# ${title}`;
const template = `${heading}\n\n## Current fields`;
const oldTemplate = `${heading}\n\n## Old fields`;

function fixture({ body = template, bodyLoaded = true, tab, fetchNote } = {}) {
  const original = { id: "old", folderId: "f", title, body, bodyLoaded };
  const state = { notes: [original], tabs: tab ? [{ noteId: "old", title, body, dirty: false, ...tab }] : [], selectedFolderId: "f" };
  let creates = 0, currentTemplate = template;
  const deps = { state, noteTabFor: id => state.tabs.find(item => item.noteId === id),
    isLocalOnlyNote: () => false, ensureEditableNoteBody: x => x, initialBodyForFolder: () => currentTemplate,
    typeFromFolder: () => "permanent", settingsState: { noteTemplates: { permanent: { history: [oldTemplate] } } },
    normalizeNoteTemplateHistory: x => x, applyTitleToNoteTemplate: x => x,
    mapNoteItem: x => ({ ...x, folderId: x.folderId || x.directoryId }),
    fetchNote: fetchNote || (async () => ({ ...original, body })),
    updateNote: () => assert.fail("Lookup must not rewrite an existing note"),
    deleteNote: () => assert.fail("Lookup must not delete an existing note") };
  const runtime = createNotePlaceholderRuntime(() => deps);
  const create = createNoteCreationController({ ...deps, findUntitledPlaceholder: runtime.findUntitledPlaceholder,
    folderById: () => ({}), openNoteById: () => {}, createId: () => "new",
    createNote: async input => { creates++; return { ...input, id: `note_${input.clientCreationId}`, title, bodyLoaded: true }; } });
  return { state, original, runtime, create, creates: () => creates, setTemplate: body => { currentTemplate = body; } };
}

test("only the current template is reused without creating or rewriting", async () => {
  const f = fixture({ body: template.replace(/\n/g, "\r\n") + "\r\n" });
  const before = structuredClone(f.original);
  const result = await f.create();
  assert.equal(result.reused, true);
  assert.equal(result.note.id, "old");
  assert.equal(f.creates(), 0);
  assert.deepEqual(f.original, before);
});

for (const body of [oldTemplate, heading, "", `${heading}\n\nMy own reasoning`]) {
  test(`non-current body ${JSON.stringify(body)} remains untouched while a new note uses the current template`, async () => {
    const f = fixture({ body });
    const before = structuredClone(f.original);
    const result = await f.create();
    assert.equal(result.reused, false);
    assert.equal(result.note.body, template);
    assert.equal(f.creates(), 1);
    assert.deepEqual(f.state.notes.find(item => item.id === "old"), before);
  });
}

test("a stale clean tab cannot hide nonempty fetched content", async () => {
  const fullBody = `${heading}\n\nSaved reasoning`;
  const f = fixture({ body: heading, bodyLoaded: false, tab: {},
    fetchNote: async () => ({ id: "old", folderId: "f", title, body: fullBody }) });
  const result = await f.create();
  assert.equal(result.reused, false);
  assert.equal(result.note.id, "note_new");
  assert.equal(f.creates(), 1);
});

test("a stale clean tab does not prevent reuse of the authoritative current template", async () => {
  const f = fixture({ body: heading, bodyLoaded: false, tab: {},
    fetchNote: async () => ({ id: "old", folderId: "f", title, body: template }) });
  assert.equal((await f.create()).reused, true);
  assert.equal(f.state.tabs[0].body, template);
  assert.equal(f.creates(), 0);
});

test("dirty tabs are never reused or fetched", async () => {
  const f = fixture({ bodyLoaded: false, tab: { dirty: true }, fetchNote: () => assert.fail("Dirty note must be skipped") });
  assert.equal((await f.create()).reused, false);
  assert.equal(f.state.tabs[0].dirty, true);
});

test("loaded blank cache is not reused after another window saves real content", async () => {
  let reads = 0;
  const f = fixture({ tab: {}, fetchNote: async () => {
    reads++;
    return { id: "old", folderId: "f", title, body: `${heading}\n\nSaved elsewhere` };
  } });
  const result = await f.create();
  assert.equal(reads, 1);
  assert.equal(result.reused, false);
  assert.equal(f.creates(), 1);
});

test("reusing a verified current template refreshes a loaded stale clean tab", async () => {
  const f = fixture({ body: oldTemplate, tab: {}, fetchNote: async () => ({ id: "old", folderId: "f", title, body: template }) });
  const result = await f.create();
  assert.equal(result.reused, true);
  assert.equal(result.note.body, template);
  assert.equal(f.state.tabs[0].body, template);
  assert.equal(f.creates(), 0);
});

for (const change of ["dirty", "rename", "body", "move", "replace", "template"]) {
  test(`lookup skips a candidate after concurrent ${change}`, async () => {
    let resolve;
    const f = fixture({ bodyLoaded: false, tab: {}, fetchNote: () => new Promise(r => { resolve = r; }) });
    const pending = f.runtime.findUntitledPlaceholder("f");
    if (change === "dirty") f.state.tabs[0].dirty = true;
    if (change === "rename") f.state.tabs[0].title = "Renamed";
    if (change === "body") f.state.tabs[0].body = "New content";
    if (change === "move") f.original.folderId = "other";
    if (change === "replace") f.state.notes = [{ ...f.original }];
    if (change === "template") f.setTemplate(`${heading}\n\n## Newer fields`);
    resolve({ id: "old", folderId: "f", title, body: template });
    assert.equal(await pending, null);
  });
}
