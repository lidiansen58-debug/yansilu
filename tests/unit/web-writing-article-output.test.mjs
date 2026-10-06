import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { buildWritingArticleOutput, installWritingArticleOutputEvents } from "../../apps/web/src/writing-article-output.js";

test("article output preserves paragraphs, citations and H1 while removing exact generated footer", () => {
  const output = buildWritingArticleOutput({ markdown: "# 我的文章\r\n\r\n独特正文 [[观点]]\r\n\r\n---\r\n可写主题：p1\r\n文章提纲：s1\r\n", title: "旧题目", projectId: "p1", scaffoldId: "s1" });
  assert.equal(output.markdown, "# 我的文章\n\n独特正文 [[观点]]\n");
  assert.equal(output.fileName, "我的文章.md");
});

test("user dividers, matching prose and other project metadata are not removed", () => {
  const body = "# A\n\n---\n可写主题：p1\n文章提纲：s1\n\n这是正文\n\n---\n可写主题：other\n文章提纲：s1";
  assert.equal(buildWritingArticleOutput({ markdown: body, projectId: "p1", scaffoldId: "s1" }).markdown, `${body}\n`);
});

test("article output adds a missing title and produces a Windows-safe Chinese filename", () => {
  const output = buildWritingArticleOutput({ markdown: "正文 ![图](assets/a.png)", title: "中文 / 文章: A?" });
  assert.equal(output.markdown, "# 中文 / 文章: A?\n\n正文 ![图](assets/a.png)\n");
  assert.equal(output.fileName, "中文 _ 文章_ A_.md");
  assert.equal(buildWritingArticleOutput({ markdown: "# CON" }).fileName, "_CON.md");
});

test("empty editor is not exported as a fabricated article", () => {
  assert.throws(() => buildWritingArticleOutput({ markdown: " \n " }), /请先写入正文/);
  assert.throws(() => buildWritingArticleOutput({ markdown: "---\n可写主题：p1\n文章提纲：s1", projectId: "p1", scaffoldId: "s1" }), /请先写入正文/);
});

test("output preserves indented code and final Markdown hard-break spaces", () => {
  assert.equal(buildWritingArticleOutput({ markdown: "\n    code example  \n", title: "A" }).markdown, "# A\n\n    code example  \n");
  assert.equal(buildWritingArticleOutput({ markdown: "  # A\n\nend  \n" }).markdown, "  # A\n\nend  \n");
});

test("article commands have one entry and are wired independently of outline export", async () => {
  const html = await fs.readFile(new URL("../../apps/web/src/prototype.html", import.meta.url), "utf8");
  const app = await fs.readFile(new URL("../../apps/web/src/prototype-app.js", import.meta.url), "utf8");
  const panel = await fs.readFile(new URL("../../apps/web/src/writing-panel-controller.js", import.meta.url), "utf8");
  for (const id of ["btnWritingCopyArticle", "btnWritingExportArticle"]) {
    assert.equal(html.split(`id="${id}"`).length - 1, 1);
    assert.ok(panel.includes(id));
  }
  assert.match(app, /installWritingArticleOutputEvents\(\{/);
  assert.ok(html.includes('id="btnWritingExportScaffold"'));
});

function setup(overrides = {}) {
  const events = new Map();
  const elements = new Map(["btnWritingCopyArticle", "btnWritingExportArticle"].map((id) => [id, { disabled: false, addEventListener: (_, fn) => events.set(id, fn) }]));
  elements.set("writingDraftEditor", { value: "# 当前文章\n\n未保存正文" });
  const calls = [];
  const deps = { writingState: { project: { id: "p1", draft_note_id: "n1", title: "旧文章", draft_note: { body: "磁盘旧正文" } }, scaffold: { id: "s1" }, draftMarkdown: "缓存旧正文", draftSaveState: "dirty" }, state: { vaultScopeKey: "v1" }, getVaultPath: () => "/vault", pickExportDirectory: async () => ({ path: "/target" }), copyTextToClipboard: async (text) => calls.push(["copy", text]), exportWritingArticle: async (payload) => { calls.push(["export", payload]); return { status: "completed", articlePath: "/target/article/A.md", targetPath: "/target/article", assetCount: 1 }; }, setStatus: (...args) => calls.push(["status", ...args]), ...overrides };
  const controller = installWritingArticleOutputEvents({ $: (id) => elements.get(id), depsProvider: () => deps });
  return { controller, calls, deps, elements, events };
}

test("copy and export use the current unsaved editor, without persisting or fetching old data", async () => {
  const { controller, calls, deps } = setup();
  await controller.copy();
  await controller.export();
  assert.deepEqual(calls[0], ["copy", "# 当前文章\n\n未保存正文\n"]);
  assert.deepEqual(calls[3], ["export", { targetPath: "/target", expectedVaultPath: "/vault", noteId: "n1", fileName: "当前文章.md", markdown: "# 当前文章\n\n未保存正文\n" }]);
  assert.match(calls[4][1], /已导出文章及 1 个附件/);
  assert.equal(deps.writingState.draftSaveState, "dirty");
});

test("copy failure has no success, retains input and restores buttons for retry", async () => {
  const { controller, calls, elements } = setup({ copyTextToClipboard: async () => { throw new Error("denied"); } });
  assert.equal(await controller.copy(), null);
  assert.deepEqual(calls, [["status", "复制正文失败：denied", "bad", { notify: true, force: true }]]);
  assert.equal(elements.get("writingDraftEditor").value, "# 当前文章\n\n未保存正文");
  assert.equal(elements.get("btnWritingCopyArticle").disabled, false);
});

test("blank current editor never falls back to a saved old body", async () => {
  const { controller, calls, elements } = setup();
  elements.get("writingDraftEditor").value = "";
  await controller.export();
  assert.equal(calls.length, 1);
  assert.match(calls[0][1], /请先写入正文/);
});

test("chapter prose cannot be accidentally exported through the article command", async () => {
  const { controller, calls, deps } = setup();
  deps.writingState.bookChapter = { projectId: "p1", id: "chapter-one" };
  await controller.export();
  assert.equal(calls.length, 1);
  assert.match(calls[0][1], /切回文章正文/);
});

test("late article output feedback is silent after selecting a chapter", async () => {
  let resolve;
  const { controller, calls, deps } = setup({ copyTextToClipboard: () => new Promise(done => { resolve = done; }) });
  const copying = controller.copy();
  deps.writingState.bookChapter = { projectId: "p1", id: "chapter-one" };
  resolve();
  await copying;
  assert.deepEqual(calls, []);
});

test("pending copy suppresses repeat clicks and late feedback in a different vault", async () => {
  let resolve;
  const { controller, calls, deps } = setup({ copyTextToClipboard: () => new Promise((done) => { resolve = done; }) });
  const first = controller.copy();
  await controller.copy();
  await controller.export();
  deps.state.vaultScopeKey = "v2";
  resolve();
  await first;
  assert.deepEqual(calls, []);
});

test("without a draft, outline content cannot be silently exported as an article", async () => {
  const { controller, calls, deps } = setup();
  deps.writingState = { project: { id: "p1" }, scaffold: { id: "s1" } };
  await controller.export();
  assert.match(calls[0][1], /请先开始写草稿/);
});

test("late copy does not show feedback after leaving writing or enable buttons during a save", async () => {
  let resolve;
  const { controller, deps, elements, calls } = setup({ copyTextToClipboard: () => new Promise((done) => { resolve = done; }) });
  const first = controller.copy();
  deps.writingState.draftSaveState = "saving";
  resolve();
  await first;
  assert.equal(elements.get("btnWritingCopyArticle").disabled, true);
  assert.equal(calls[0][3].notify, true);
  deps.writingState.draftSaveState = "dirty";
  const second = controller.copy();
  deps.state.module = "notes";
  resolve();
  await second;
  assert.equal(calls.length, 1);
});

test("cancelled directory selection writes nothing and does not claim success", async () => {
  const { controller, calls, elements } = setup({ pickExportDirectory: async () => ({ path: "" }) });
  assert.equal(await controller.export(), null);
  assert.deepEqual(calls, []);
  assert.equal(elements.get("btnWritingExportArticle").disabled, false);
});

test("directory selection cannot export a stale body or changed vault", async () => {
  let resolve;
  const { controller, calls, elements, deps } = setup({ pickExportDirectory: () => new Promise((done) => { resolve = done; }) });
  let pending = controller.export();
  elements.get("writingDraftEditor").value = "new body";
  resolve({ path: "/target" });
  await pending;
  assert.equal(calls.some((call) => call[0] === "export"), false);
  assert.match(calls[0][1], /正文或笔记库已变化/);
  calls.length = 0;
  pending = controller.export();
  deps.state.vaultScopeKey = "v2";
  resolve({ path: "/target" });
  await pending;
  assert.deepEqual(calls, []);
});

test("export API failure or unconfirmed result preserves body without success", async () => {
  for (const exportWritingArticle of [async () => { throw new Error("missing image"); }, async () => ({ status: "queued" })]) {
    const { controller, calls, elements } = setup({ exportWritingArticle });
    assert.equal(await controller.export(), null);
    assert.equal(calls.at(-1)[2], "bad");
    assert.equal(calls.some((call) => call[2] === "ok"), false);
    assert.equal(elements.get("writingDraftEditor").value, "# 当前文章\n\n未保存正文");
  }
});
