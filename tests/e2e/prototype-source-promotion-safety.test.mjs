import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";
import { composeLiteratureWorkspace } from "../../apps/web/src/editor-template-workspace.js";

async function open(page, id) {
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${id}"]`).click();
  await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, id);
}

async function append(page, text) {
  if (!(await page.locator("#editorHost .cm-content").isVisible())) await page.locator("#btnModeToggle").click();
  await page.locator("#editorHost .cm-content:visible").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.insertText(text);
}

for (const kind of ["fleeting", "literature"]) {
  for (const outcome of ["success", "failure", "missing-result"]) {
    test(`${kind} promotion retains current edits and source links: ${outcome}`, async t => {
      if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
      const pw = await optionalPlaywright(t);
      if (!pw) return;
      const stack = await startPrototypeStack(t, pw);
      if (!stack) return;
      const { page, apiBase } = stack;
      const body = kind === "literature"
        ? composeLiteratureWorkspace({ title: "阅读材料", originalText: "需要通过回忆检验学习效果。", paraphrase: "检验理解需要离开原文表达。", supportsJudgment: "用回忆检验理解。", citation: { authors: "作者甲", year: "2024", sourceTitle: "学习方法", locator: "第 12 页", identifier: "https://example.test/book" } })
        : "# 随手记录\n\n写出想法再整理。";
      const source = (await postJson(apiBase, "/api/v1/notes", { directoryId: `dir_${kind}_default`, body })).json.item;
      await open(page, source.id);
      await append(page, "\n\n生成前尚未保存的内容。");
      let releaseCreate, releaseSave, creating = false, saving = false;
      const createGate = new Promise(resolve => { releaseCreate = resolve; });
      const saveGate = new Promise(resolve => { releaseSave = resolve; });
      await page.route("**/api/v1/notes", async route => {
        if (route.request().method() !== "POST") return route.continue();
        creating = true;
        await createGate;
        return route.continue();
      });
      const endpoint = `**/api/v1/notes/${source.id}`;
      await page.route(endpoint, async route => {
        if (route.request().method() !== "PUT") return route.continue();
        saving = true;
        await saveGate;
        if (outcome === "success") return route.continue();
        return route.fulfill(outcome === "failure"
          ? { status: 500, json: { error: { code: "TEST_DISK_FULL", message: "Disk full" } } }
          : { status: 200, json: { item: null } });
      });
      try {
        await page.locator("#btnRecordPermanent").click();
        await page.locator("#permanentNoteCreate").click();
        await waitFor(() => assert.equal(creating, true));
        await append(page, "\n\n创建期间的新想法。");
        releaseCreate();
        await waitFor(() => assert.equal(saving, true));
        await append(page, "\n\n来源保存期间继续输入。");
        releaseSave();
        await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id !== id && !window.__prototypeEditor.savingPromise, source.id);
        const permanentId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
        const tab = await page.evaluate(id => window.__prototypeState.tabs.find(tab => tab.noteId === id), source.id);
        assert.match(tab.body, /创建期间的新想法/);
        assert.match(tab.body, /来源保存期间继续输入/);
        assert.equal(tab.dirty, true);
        assert.match(tab.body, new RegExp(`\\[\\[${permanentId}\\|`));
        const draft = await page.evaluate(id => JSON.parse(localStorage.getItem(`yansilu:draft:${id}`)), source.id);
        assert.equal(draft.body, tab.body);
        const saved = (await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item;
        assert.doesNotMatch(saved.body, /来源保存期间继续输入/);
        if (outcome === "success") assert.match(saved.body, /创建期间的新想法/);
        else {
          assert.equal(saved.body, source.body);
          assert.equal(tab.saveUiState.mode, "error");
          assert.match(await page.locator("#statusText").textContent(), /来源笔记标记保存失败/);
        }
        const permanent = (await fetchJson(apiBase, `/api/v1/notes/${permanentId}`)).json.item;
        assert.match(permanent.body, new RegExp(`\\[\\[${source.id}\\|`));
        if (kind === "literature") assert.match(permanent.body, /作者甲/);
        await page.unroute(endpoint);
        await open(page, source.id);
        await page.keyboard.press("Control+s");
        await waitFor(async () => assert.match((await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body, /来源保存期间继续输入/));
        await page.waitForFunction(() => !window.__prototypeEditor.activeTab()?.dirty);
        await page.reload({ waitUntil: "networkidle" });
        await open(page, source.id);
        assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /来源保存期间继续输入/);
        const links = (await fetchJson(apiBase, `/api/v1/notes/${permanentId}/relations`)).json.item;
        assert.ok(links.outgoingLinks.some(link => link.toNoteId === source.id));
      } finally { releaseCreate(); releaseSave(); }
    });
  }
}
