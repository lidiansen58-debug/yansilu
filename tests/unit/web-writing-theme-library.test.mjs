import assert from "node:assert/strict";
import test from "node:test";
import { installWritingThemeLibraryEvents, renderWritingThemeLibrary } from "../../apps/web/src/writing-theme-library.js";

function fixture() {
  const events = new Map();
  const nodes = new Map(["writingThemeIndexList", "writingThemeLibraryTools", "btnWritingExpandThemes", "writingThemeSearch"].map(id => [id, {
    innerHTML: "", value: "", hidden: false, attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(event, handler) { events.set(`${id}:${event}`, handler); }
  }]));
  const writingState = { sourceIndexIds: [], themeIndexes: Array.from({ length: 52 }, (_, i) => ({ id: `theme-${i}`, title: `Topic ${i}`, central_question: i === 51 ? "怎样继续旧草稿？" : "" })) };
  const deps = { $: id => nodes.get(id), writingState, escapeHtml: String,
    writingThemeIndexNoteIds: () => [], findExistingWritingProjectForTheme: item => item.id === "theme-51" ? { id: "project", draft_note_id: "draft", scaffold_id: "outline" } : null,
    describeWritingContinuationAction: ({ existingProjectId }) => existingProjectId ? { projectId: existingProjectId, action: "open-draft" } : {} };
  installWritingThemeLibraryEvents({ $: deps.$, depsProvider: () => deps });
  return { nodes, events, writingState, deps, render: () => renderWritingThemeLibrary(deps),
    toggle: () => events.get("btnWritingExpandThemes:click")(),
    search: value => { const input = nodes.get("writingThemeSearch"); input.value = value; events.get("writingThemeSearch:input")({ target: input }); } };
}

test("theme library stays at three cards until expanded and preserves existing draft actions", () => {
  const f = fixture(); f.render();
  const list = f.nodes.get("writingThemeIndexList");
  assert.equal((list.innerHTML.match(/data-writing-index-card-id=/g) || []).length, 3);
  assert.equal(f.nodes.get("btnWritingExpandThemes").textContent, "显示全部 52 个主题");
  assert.equal(f.nodes.get("writingThemeSearch").hidden, true);
  f.toggle();
  assert.equal((list.innerHTML.match(/data-writing-index-card-id=/g) || []).length, 52);
  assert.match(list.innerHTML, /data-writing-index-action="open-draft" data-writing-project-id="project">继续草稿/);
  assert.equal(f.nodes.get("writingThemeSearch").hidden, false);
  assert.equal(f.nodes.get("btnWritingExpandThemes").attributes["aria-expanded"], "true");
});

test("search filters titles and questions beyond the first page without replacing its input", () => {
  const f = fixture(); f.render(); f.toggle();
  const input = f.nodes.get("writingThemeSearch");
  f.search("继续旧草稿"); f.render();
  assert.equal(f.nodes.get("writingThemeSearch"), input);
  assert.equal(input.value, "继续旧草稿");
  assert.match(f.nodes.get("writingThemeIndexList").innerHTML, /theme-51/);
  assert.doesNotMatch(f.nodes.get("writingThemeIndexList").innerHTML, /theme-0"/);
  f.toggle(); assert.equal(input.value, "继续旧草稿");
  f.toggle(); assert.match(f.nodes.get("writingThemeIndexList").innerHTML, /theme-51/);
  f.search("not a topic"); assert.match(f.nodes.get("writingThemeIndexList").innerHTML, /没有匹配的主题/);
  f.search("tOpIc 42"); assert.match(f.nodes.get("writingThemeIndexList").innerHTML, /theme-42/);
});

test("a refreshed library discards the old search and keeps new small libraries simple", () => {
  const f = fixture(); f.render(); f.toggle(); f.search("old-vault-secret");
  f.writingState.themeIndexes = [{ id: "new", title: "New Vault" }]; f.render();
  assert.equal(f.nodes.get("writingThemeSearch").value, "");
  assert.equal(f.nodes.get("writingThemeLibraryTools").hidden, true);
  assert.match(f.nodes.get("writingThemeIndexList").innerHTML, /New Vault/);
  assert.doesNotMatch(f.nodes.get("writingThemeIndexList").innerHTML, /old-vault-secret/);
});

test("theme library events use the existing render host without requiring card dependencies in event wiring", () => {
  const f = fixture(); f.render();
  const events = new Map();
  let renders = 0;
  installWritingThemeLibraryEvents({ $: id => ({ addEventListener: (name, handler) => events.set(`${id}:${name}`, handler) }),
    depsProvider: () => ({ writingState: f.writingState, renderWritingPanel: () => { renders++; f.render(); } }) });
  events.get("btnWritingExpandThemes:click")();
  events.get("writingThemeSearch:input")({ target: { value: "继续旧草稿" } });
  assert.equal(renders, 2);
  assert.match(f.nodes.get("writingThemeIndexList").innerHTML, /theme-51/);
  assert.equal((f.nodes.get("writingThemeIndexList").innerHTML.match(/data-writing-index-card-id=/g) || []).length, 1);
});
