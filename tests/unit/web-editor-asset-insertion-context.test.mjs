import test from "node:test";
import assert from "node:assert/strict";
import { captureAssetInsertionContext } from "../../apps/web/src/editor-asset-insertion-context.js";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";

function fixture() {
  let tab = { id: "tab-a" }, note = { id: "note-a", markdownPath: "notes/a.md" };
  let vault = "vault-a", value = "original";
  const host = {
    state: { noteMoveVaultScope: 1 }, activeTab: () => tab, activeNote: () => note,
    vaultScope: () => vault, getEditorValue: () => value
  };
  return { host, context: captureAssetInsertionContext(host, value),
    tab: next => { tab = next; }, note: next => { note = next; },
    vault: next => { vault = next; }, value: next => { value = next; } };
}

function uploadFixture() {
  const f = fixture();
  const statuses = [], replacements = [];
  Object.setPrototypeOf(f.host, EditorPane.prototype);
  Object.assign(f.host, {
    els: {}, editorSelection: () => ({ from: 0, to: 0 }),
    fileToBase64: async () => "YQ==", isWysiwygMode: () => false,
    replaceEditorRange: (...args) => replacements.push(args),
    onStatus: (message, kind) => statuses.push({ message, kind })
  });
  return { ...f, statuses, replacements, files: [{ name: "a.txt", type: "text/plain" }, { name: "b.txt", type: "text/plain" }] };
}

test("an upload cancelled during file reading does not make a write request", async t => {
  const f = uploadFixture();
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; assert.fail("No request should be sent"); });
  f.host.fileToBase64 = async () => { f.value("new input"); return "YQ=="; };
  await f.host.insertAssetFiles(f.files);
  assert.equal(requests, 0);
  assert.equal(f.replacements.length, 0);
  assert.match(f.statuses.at(-1).message, /未上传附件/);
  assert.equal(f.host.assetUploadPending, false);
});

test("a changed context stops remaining files and does not insert partial links", async t => {
  const f = uploadFixture();
  let requests = 0;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    requests++;
    assert.equal(JSON.parse(options.body).expectedVaultPath, "vault-a");
    f.value("new input");
    return new Response(JSON.stringify({ item: { assetKind: "file", fileName: "a.txt", markdownLinkPath: "assets/a.txt" } }));
  });
  await f.host.insertAssetFiles(f.files);
  assert.equal(requests, 1);
  assert.equal(f.replacements.length, 0);
  assert.equal(f.host.getEditorValue(), "new input");
  assert.match(f.statuses.at(-1).message, /文件已保存.*未插入链接/);
  assert.equal(f.host.assetUploadPending, false);
});

test("normal uploads carry the vault scope and insert the returned links once", async t => {
  const f = uploadFixture();
  const requests = [];
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    return new Response(JSON.stringify({ item: { assetKind: "file", fileName: body.fileName, markdownLinkPath: `assets/${body.fileName}` } }));
  });
  await f.host.insertAssetFiles(f.files);
  assert.equal(requests.length, 2);
  assert.ok(requests.every(body => body.noteId === "note-a" && body.expectedVaultPath === "vault-a"));
  assert.equal(f.replacements.length, 1);
  assert.match(f.replacements[0][2], /\[a.txt\]\(assets\/a.txt\)/);
  assert.match(f.replacements[0][2], /\[b.txt\]\(assets\/b.txt\)/);
  assert.match(f.statuses.at(-1).message, /已插入2 个附件/);
  assert.equal(f.host.assetUploadPending, false);
});

test("partial upload failure reports saved files and releases the upload lock", async t => {
  const f = uploadFixture();
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return requests === 1
      ? new Response(JSON.stringify({ item: { assetKind: "file", fileName: "a.txt", markdownLinkPath: "assets/a.txt" } }))
      : new Response(JSON.stringify({ error: { code: "ASSET_UPLOAD_INVALID", message: "磁盘写入失败" } }), { status: 400 });
  });
  await f.host.insertAssetFiles(f.files);
  assert.equal(f.replacements.length, 0);
  assert.match(f.statuses.at(-1).message, /磁盘写入失败.*已保存 1 个文件.*未插入链接/);
  assert.equal(f.statuses.at(-1).kind, "bad");
  assert.equal(f.host.assetUploadPending, false);
});

test("another insert cannot start or release an already active upload", async t => {
  const f = uploadFixture();
  f.host.assetUploadPending = true;
  t.mock.method(globalThis, "fetch", async () => assert.fail("No concurrent write"));
  await f.host.insertAssetFiles(f.files);
  assert.equal(f.replacements.length, 0);
  assert.match(f.statuses.at(-1).message, /正在处理中/);
  assert.equal(f.host.assetUploadPending, true);
});

test("an uncertain upload does not insert links or claim that no file was saved", async t => {
  const f = uploadFixture();
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
    error: { code: "request_timeout", message: "timeout" }
  }), { status: 504 }));
  await f.host.insertAssetFiles(f.files);
  assert.equal(f.replacements.length, 0);
  assert.equal(f.host.getEditorValue(), "original");
  assert.match(f.statuses.at(-1).message, /未确认.*可能已保存.*重试/);
  assert.equal(f.statuses.at(-1).kind, "warn");
  assert.equal(f.host.assetUploadPending, false);
});

test("asset insertion remains valid with an unchanged editor", () => {
  const { context } = fixture();
  assert.equal(context.noteId, "note-a");
  assert.equal(context.vaultPath, "vault-a");
  assert.equal(context.isCurrent(), true);
});

for (const [name, change] of [
  ["another note", f => f.note({ id: "note-b", markdownPath: "notes/a.md" })],
  ["closed and reopened tab", f => f.tab({ id: "tab-a" })],
  ["another vault with matching IDs", f => f.vault("vault-b")],
  ["vault switched away and back", f => { f.host.state.noteMoveVaultScope++; }],
  ["editing the body", f => f.value("new input")],
  ["renaming or moving the note", f => f.note({ id: "note-a", markdownPath: "notes/new/a.md" })],
  ["switch in progress", f => { f.host.state.noteMoveVaultSwitching = true; }],
  ["uncertain vault", f => { f.host.state.noteMoveVaultUncertain = true; }],
  ["unresolved move", f => { f.host.state.unresolvedNoteMove = { noteId: "note-a" }; }],
  ["no active note", f => f.note(null)],
  ["no active tab", f => f.tab(null)]
]) {
  test(`asset insertion rejects ${name}`, () => {
    const f = fixture();
    change(f);
    assert.equal(f.context.isCurrent(), false);
  });
}
