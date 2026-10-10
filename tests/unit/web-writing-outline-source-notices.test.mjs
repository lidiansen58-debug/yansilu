import test from "node:test";
import assert from "node:assert/strict";
import { renderWritingScaffoldPreviewDom } from "../../apps/web/src/writing-scaffold-preview-panel.js";
import { handleWritingOutlineSourceClick } from "../../apps/web/src/writing-outline-source-notices.js";
import { installWritingDraftActionEventHandlers } from "../../apps/web/src/writing-panel-events.js";
import { createSearchNoteOpener } from "../../apps/web/src/search-note-opener.js";
import { escapeHtml } from "../../apps/web/src/editor-render-utils.js";

function fixture() {
  const state = { notes: [], tabs: [], module: "writing" };
  const writingState = { project: { id: "project", basket_notes: [] }, scaffold: { id: "outline",
    sections: [{ heading: "Historical chapter", purpose: "Explain the claim", evidence_note_ids: ["source"] }],
    evidence_notes: [{ id: "source", title: "Real source title", note_type: "literature" }],
    preflight: { checks: [{ id: "source_note_types", status: "warning", message: "依据已重新分类，请核对。", targetNoteIds: ["source"] }] } } };
  const calls = [], status = [];
  const open = createSearchNoteOpener({ state, fetchNote: async id => ({ id, title: "Real source title", body: "# Source" }),
    mapNoteItem: item => item, openNoteById: id => { calls.push(id); return true; },
    activateModule: module => { state.module = module; }, unavailableMessage: "来源笔记已不可用，请重新载入提纲后核对。" });
  const deps = { state, writingState, getVaultPath: () => "vault", openWritingSourceNote: open,
    setStatus: (...args) => status.push(args) };
  const button = { disabled: false, getAttribute: () => "source" };
  const event = { target: { closest: selector => selector === "[data-writing-outline-source-note]" ? button : null } };
  const preview = () => {
    const el = { innerHTML: "" };
    renderWritingScaffoldPreviewDom({ $: () => el, writingState, escapeHtml });
    return el.innerHTML;
  };
  return { state, writingState, calls, status, deps, button, event, preview };
}

test("outline shows actionable source warnings and escapes actual note titles", () => {
  const f = fixture();
  f.writingState.scaffold.evidence_notes[0].title = '<img src=x onerror="bad()">';
  f.writingState.scaffold.preflight.checks.push({ id: "distillation_quality", status: "warning", message: "Unrelated diagnostics" });
  const html = f.preview();
  assert.match(html, /依据已重新分类，请核对/);
  assert.match(html, /data-writing-outline-source-note="source"/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /Unrelated diagnostics/);
  assert.ok(html.indexOf("来源核对") < html.indexOf("Historical chapter"));
});

test("missing files are labeled without a broken open action and passing checks stay hidden", () => {
  const f = fixture();
  const check = f.writingState.scaffold.preflight.checks[0];
  check.id = "source_files";
  check.message = "来源文件已不存在，请补回或替换。";
  assert.match(f.preview(), /来源文件缺失/);
  assert.doesNotMatch(f.preview(), /data-writing-outline-source-note/);
  check.status = "pass";
  assert.doesNotMatch(f.preview(), /来源核对/);
});

test("source click hydrates historical evidence outside the basket then opens it", async () => {
  const f = fixture();
  const outline = structuredClone(f.writingState.scaffold);
  assert.equal(await handleWritingOutlineSourceClick(f.event, f.deps), true);
  assert.deepEqual(f.calls, ["source"]);
  assert.equal(f.state.module, "explorer");
  assert.equal(f.state.notes[0].id, "source");
  assert.deepEqual(f.writingState.scaffold, outline);
  assert.equal(f.button.disabled, false);
});

test("opening evidence preserves the existing local unsaved note", async () => {
  const f = fixture();
  f.state.notes = [{ id: "source", body: "Local edit" }];
  f.state.tabs = [{ noteId: "source", dirty: true, body: "Local edit" }];
  await handleWritingOutlineSourceClick(f.event, f.deps);
  assert.equal(f.state.notes[0].body, "Local edit");
  assert.equal(f.state.tabs[0].body, "Local edit");
  assert.deepEqual(f.calls, ["source"]);
});

for (const change of ["vault", "project", "outline", "module", "warning-cleared"]) {
  test(`a ${change} change cannot open late evidence in the wrong context`, async () => {
    const f = fixture();
    let resolve;
    const opener = createSearchNoteOpener({ state: f.state, fetchNote: () => new Promise(done => { resolve = done; }),
      mapNoteItem: item => item, openNoteById: id => { f.calls.push(id); return true; }, activateModule: () => assert.fail("Must not navigate") });
    const operation = handleWritingOutlineSourceClick(f.event, { ...f.deps, openWritingSourceNote: opener });
    if (change === "vault") f.state.noteMoveVaultScope = {};
    if (change === "project") f.writingState.project.id = "other";
    if (change === "outline") f.writingState.scaffold.id = "other";
    if (change === "module") f.state.module = "settings";
    if (change === "warning-cleared") f.writingState.scaffold.preflight.checks = [];
    resolve({ id: "source", body: "Old vault data" });
    await operation;
    assert.deepEqual(f.calls, []);
    assert.deepEqual(f.state.notes, []);
    assert.equal(f.button.disabled, false);
  });
}

test("a missing or removed target does not issue an open request", async () => {
  const f = fixture();
  f.writingState.scaffold.preflight.checks[0].id = "source_files";
  await handleWritingOutlineSourceClick(f.event, f.deps);
  assert.deepEqual(f.calls, []);
  f.writingState.scaffold.preflight.checks = [];
  await handleWritingOutlineSourceClick(f.event, f.deps);
  assert.deepEqual(f.calls, []);
});

test("a read failure reports an actionable warning without navigating", async () => {
  const f = fixture();
  f.deps.openWritingSourceNote = createSearchNoteOpener({ state: f.state, fetchNote: async () => null,
    mapNoteItem: item => item, openNoteById: () => assert.fail("Must not open"),
    activateModule: () => assert.fail("Must not navigate"), unavailableMessage: "来源笔记已不可用，请重新载入提纲后核对。" });
  await handleWritingOutlineSourceClick(f.event, f.deps);
  assert.match(f.status[0][0], /无法打开来源笔记.*重新载入提纲/);
  assert.equal(f.status[0][1], "warn");
  assert.equal(f.button.disabled, false);
});

test("delegated source clicks do not trigger outline mutation or autosave", async () => {
  const f = fixture(), handlers = new Map();
  installWritingDraftActionEventHandlers({
    $: id => id === "writingScaffoldPreview" ? { addEventListener: (event, handler) => handlers.set(event, handler) } : null,
    depsProvider: () => ({ ...f.deps, updateDraftScaffold: () => assert.fail("Reading is not editing") })
  });
  await handlers.get("click")(f.event);
  assert.deepEqual(f.calls, ["source"]);
  assert.equal(f.writingState.outlineSaveQueue, undefined);
});

for (const id of ["basket_notes_missing_thesis", "basket_notes_missing_three_line_summary"]) {
  test(`${id} uses the current scaffold note title and opens without changing the outline`, async () => {
    const f = fixture();
    f.writingState.project.basket_notes = [{ id: "source", title: "Old title" }];
    f.writingState.scaffold.evidence_notes = [];
    f.writingState.scaffold.basket_notes = [{ id: "source", title: "Current <title>", note_type: "permanent" }];
    f.writingState.scaffold.preflight.checks = [{ id, status: "warning", message: "请补齐笔记内容。", targetNoteIds: ["source"] }];
    const outline = structuredClone(f.writingState.scaffold);
    const html = f.preview();
    assert.match(html, /请补齐笔记内容/);
    assert.match(html, /核对：Current &lt;title&gt;/);
    assert.doesNotMatch(html, /Old title/);
    await handleWritingOutlineSourceClick(f.event, f.deps);
    assert.deepEqual(f.calls, ["source"]);
    assert.deepEqual(f.writingState.scaffold, outline);
  });
}
