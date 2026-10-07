import test from "node:test";
import assert from "node:assert/strict";
import { createWritingProjectOpenController } from "../../apps/web/src/writing-project-open-controller.js";
import { saveWritingInput } from "../../apps/web/src/writing-input-recovery.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup() {
  let basket = ["old-note"];
  const state = { module: "writing", noteMoveVaultScope: {} };
  const writingState = { project: { id: "old", scaffold_id: "s-old", draft_note_id: "d-old" },
    scaffold: { id: "s-old" }, scaffoldMarkdown: "Old outline", draftMarkdown: "Old body",
    draftSaveState: "saved", selectedThemeIndexId: "t-old", scaffoldVersions: ["old"], draftVersions: ["old"] };
  const commits = [];
  const deps = {
    state, writingState, getVaultPath: () => "/vault", parseWritingBasketIds: () => basket,
    fetchWritingProject: async id => ({ id, scaffold_id: `s-${id}`, draft_note_id: `d-${id}`, basket_note_ids: [`n-${id}`], related_index_ids: [`t-${id}`] }),
    fetchDraftScaffold: async id => ({ item: { id }, export: { markdown: `Outline ${id}` } }),
    fetchNote: async id => ({ id, body: `Body ${id}` }),
    listProjectScaffolds: async id => [`scaffold-version-${id}`],
    listProjectDraftVersions: async id => [`draft-version-${id}`],
    loadWritingRelationCounts: async ids => ({ counts: Object.fromEntries(ids.map(id => [id, 1])), errors: {} }),
    ensureNotesLoaded: async () => {},
    resetWritingStrongModelState: () => {},
    setWritingBasketIds: ids => { basket = ids; },
    populateWritingFormFromProject: project => { commits.push(project.id); writingState.selectedThemeIndexId = project.related_index_ids[0]; },
    renderWritingPanel: () => {}, setStatus: () => {},
  };
  return { deps, state, writingState, commits, controller: createWritingProjectOpenController(() => deps) };
}

test("article open restores empty local input and its original save baseline", async () => {
  const s = setup();
  const records = new Map();
  s.deps.recoveryStorage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) };
  saveWritingInput(s.deps, JSON.stringify(["article", "new", "s-new"]), {
    markdown: "", noteId: "d-new", savedBody: "Old disk body", savedFileRevision: "old-revision"
  });
  await s.controller.open("new");
  assert.equal(s.writingState.draftMarkdown, "");
  assert.equal(s.writingState.draftSaveState, "dirty");
  assert.equal(s.writingState.project.draft_note.body, "Old disk body");
  assert.equal(s.writingState.project.draft_note.fileRevision, "old-revision");
});

test("damaged recovery record leaves the original project untouched", async () => {
  const s = setup();
  s.deps.recoveryStorage = { getItem: () => "{broken" };
  await assert.rejects(s.controller.open("new"), /本机草稿恢复记录/);
  assert.equal(s.writingState.project.id, "old");
  assert.equal(s.writingState.draftMarkdown, "Old body");
  assert.deepEqual(s.commits, []);
});

test("last requested project wins when an earlier project response is late", async () => {
  const { deps, controller, writingState, commits } = setup();
  const oldFetch = deps.fetchWritingProject;
  const wait = deferred();
  deps.fetchWritingProject = async id => { if (id === "a") await wait.promise; return oldFetch(id); };
  const a = controller.open("a");
  await controller.open("b");
  wait.resolve();
  assert.equal(await a, null);
  assert.equal(writingState.project.id, "b");
  assert.equal(writingState.draftMarkdown, "Body d-b");
  assert.deepEqual(commits, ["b"]);
});

test("typing in the current outline while another project loads cancels replacement", async () => {
  const h = setup();
  h.writingState.scaffold.sections = [{ heading: "Original outline", purpose: "Original purpose" }];
  const waiting = deferred(), fetch = h.deps.fetchWritingProject;
  h.deps.fetchWritingProject = async id => { await waiting.promise; return fetch(id); };
  const opening = h.controller.open("new");
  h.writingState.scaffold.sections[0].heading = "Still editing my current outline";
  waiting.resolve();
  assert.equal(await opening, null);
  assert.equal(h.writingState.project.id, "old");
  assert.equal(h.writingState.scaffold.sections[0].heading, "Still editing my current outline");
  assert.deepEqual(h.commits, []);
});

test("dirty or saving chapter blocks project replacement and saved chapter is reset on open", async () => {
  const s = setup();
  for (const saveState of ["dirty", "error", "saving"]) {
    s.writingState.bookChapter = { projectId: "old", id: "chapter-old", markdown: "Own prose", saveState };
    await assert.rejects(s.controller.open("new"), /章节/);
    assert.equal(s.writingState.project.id, "old");
  }
  s.writingState.bookChapter.saveState = "saved";
  await s.controller.open("new");
  assert.equal(s.writingState.bookChapter, null);
  assert.equal(s.writingState.draftMarkdown, "Body d-new");
});

test("late failed read is silent after a newer project succeeds", async () => {
  const { deps, controller, writingState } = setup();
  const wait = deferred();
  const original = deps.fetchNote;
  deps.fetchNote = async id => { if (id === "d-a") return wait.promise; return original(id); };
  const a = controller.open("a");
  await Promise.resolve(); await Promise.resolve();
  await controller.open("b");
  wait.reject(new Error("Old failure"));
  assert.equal(await a, null);
  assert.equal(writingState.project.id, "b");
});

test("version history failure opens the actual draft with a visible warning", async () => {
  const { deps, controller, writingState } = setup();
  const messages = [];
  deps.setStatus = (text, tone, options) => messages.push({ text, tone, options });
  deps.listProjectDraftVersions = async () => { throw new Error("History unavailable"); };
  await controller.open("a");
  assert.equal(writingState.draftMarkdown, "Body d-a");
  assert.deepEqual(writingState.draftVersions, []);
  assert.match(messages.at(-1).text, /主题已打开.*版本列表读取失败/);
  assert.equal(messages.at(-1).options.holdMs, 8000);
});

test("typing while a project loads retains the current draft", async () => {
  const { deps, controller, writingState, commits } = setup();
  const messages = [];
  deps.setStatus = message => messages.push(message);
  const wait = deferred();
  deps.fetchNote = async id => { await wait.promise; return { id, body: "New body" }; };
  const request = controller.open("a");
  await Promise.resolve(); await Promise.resolve();
  writingState.draftMarkdown = "Typing in old draft";
  writingState.draftSaveState = "dirty";
  wait.resolve();
  assert.equal(await request, null);
  assert.equal(writingState.draftMarkdown, "Typing in old draft");
  assert.deepEqual(commits, []);
  assert.match(messages.at(-1), /已取消切换主题/);
});

for (const change of ["module", "theme", "revision", "form"]) test(`changed ${change} cancels a pending project open`, async () => {
  const { deps, controller, state, writingState, commits } = setup();
  const wait = deferred();
  let form = "Original";
  deps.getWritingFormSnapshot = () => form;
  deps.fetchNote = async id => { await wait.promise; return { id, body: "Late body" }; };
  const request = controller.open("a");
  await Promise.resolve(); await Promise.resolve();
  if (change === "module") state.module = "explorer";
  if (change === "theme") writingState.selectedThemeIndexId = "another";
  if (change === "revision") writingState.projectOpenRevision++;
  if (change === "form") form = "Edited";
  wait.resolve();
  assert.equal(await request, null);
  assert.deepEqual(commits, []);
});

test("missing draft body is not treated as a successfully opened empty draft", async () => {
  const { deps, controller, writingState } = setup();
  deps.fetchNote = async id => ({ id });
  await assert.rejects(controller.open("a"), /草稿数据不完整/);
  assert.equal(writingState.draftMarkdown, "Old body");
});

test("genuinely empty saved body remains empty and replaces old project history", async () => {
  const { deps, controller, writingState } = setup();
  deps.fetchNote = async id => ({ id, body: "" });
  await controller.open("a");
  assert.equal(writingState.draftMarkdown, "");
  assert.deepEqual(writingState.scaffoldVersions, ["scaffold-version-a"]);
  assert.equal(writingState.loadingScaffoldVersions, false);
});

test("a project without outline or draft cannot inherit the old ones", async () => {
  const { deps, controller, writingState } = setup();
  deps.fetchWritingProject = async id => ({ id, related_index_ids: [], basket_note_ids: [] });
  await controller.open("a");
  assert.equal(writingState.scaffold, null);
  assert.equal(writingState.scaffoldMarkdown, "");
  assert.equal(writingState.draftMarkdown, "");
});

test("slow outline does not mix the previous request into the next project", async () => {
  const { deps, controller, writingState } = setup();
  const wait = deferred();
  const oldFetch = deps.fetchDraftScaffold;
  deps.fetchDraftScaffold = async id => { if (id === "s-a") await wait.promise; return oldFetch(id); };
  const a = controller.open("a");
  await Promise.resolve(); await Promise.resolve();
  await controller.open("b");
  wait.resolve(); await a;
  assert.equal(writingState.project.id, "b");
  assert.equal(writingState.scaffold.id, "s-b");
  assert.deepEqual(writingState.draftVersions, ["draft-version-b"]);
});

for (const stage of ["fetchDraftScaffold", "fetchNote"]) test(`${stage} failure retains the complete previous project and permits retry`, async () => {
  const { deps, controller, writingState, commits } = setup();
  const before = structuredClone(writingState);
  const original = deps[stage];
  deps[stage] = async () => { throw new Error("Service unavailable"); };
  await assert.rejects(controller.open("a"), /Service unavailable/);
  assert.equal(writingState.project.id, before.project.id);
  assert.equal(writingState.draftMarkdown, before.draftMarkdown);
  assert.equal(writingState.scaffoldMarkdown, before.scaffoldMarkdown);
  assert.deepEqual(commits, []);
  deps[stage] = original;
  await controller.open("a");
  assert.equal(writingState.project.id, "a");
});

test("late response cannot replace a changed vault", async () => {
  const { deps, controller, state, writingState, commits } = setup();
  const wait = deferred();
  deps.fetchNote = async id => { await wait.promise; return { id, body: "Late body" }; };
  const request = controller.open("a");
  await Promise.resolve(); await Promise.resolve();
  state.noteMoveVaultScope = {};
  writingState.project = { id: "new-vault-project" };
  writingState.draftMarkdown = "New vault body";
  wait.resolve();
  assert.equal(await request, null);
  assert.equal(writingState.draftMarkdown, "New vault body");
  assert.deepEqual(commits, []);
});
