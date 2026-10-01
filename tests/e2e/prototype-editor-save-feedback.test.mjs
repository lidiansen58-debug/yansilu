import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const outcome of ["success", "failure", "missing-result"]) {
  test(`editor save feedback waits for persistence: ${outcome}`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const playwright = await optionalPlaywright(t);
    if (!playwright) return;
    const stack = await startPrototypeStack(t, playwright);
    if (!stack) return;
    const { page, apiBase } = stack;
    const note = (await postJson(apiBase, "/api/v1/notes", {
      directoryId: "dir_fleeting_default", body: "# 保存反馈\n\n原始记录。"
    })).json.item;
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${note.id}"]`).click();
    if (!(await page.locator("#editorHost .cm-content").isVisible())) await page.locator("#btnModeToggle").click();
    await page.locator("#editorHost .cm-content:visible").click();
    await page.keyboard.press("Control+End");
    await page.keyboard.insertText("\n\n保存失败时也要保留这句话。");
    await page.waitForFunction(() => window.__prototypeEditor.activeTab()?.dirty);
    const expected = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
    let release, requested = false;
    const held = new Promise(resolve => { release = resolve; });
    const endpoint = `**/api/v1/notes/${note.id}`;
    await page.route(endpoint, async route => {
      if (route.request().method() !== "PUT") return route.continue();
      requested = true;
      await held;
      if (outcome === "success") return route.continue();
      return route.fulfill(outcome === "failure"
        ? { status: 500, json: { error: { code: "TEST_SAVE_FAILED", message: "Test write failed" } } }
        : { status: 200, json: { item: null } });
    });
    try {
      await page.keyboard.press("Control+s");
      await waitFor(() => assert.equal(requested, true));
      assert.doesNotMatch(await page.locator("#statusText").textContent(), /当前修改已同步|已同步到 Markdown/);
      assert.equal(await page.evaluate(() => window.__prototypeEditor.activeTab().saveUiState.mode), "saving");
      assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, note.body);
      release();
      await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
      if (outcome !== "success") {
        assert.equal(await page.evaluate(() => window.__prototypeEditor.activeTab().dirty), true);
        assert.equal(await page.evaluate(() => window.__prototypeEditor.activeTab().saveUiState.mode), "error");
        const draft = await page.evaluate(id => JSON.parse(localStorage.getItem(`yansilu:draft:${id}`)), note.id);
        assert.equal(draft.body.trimEnd(), expected.trimEnd());
        assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, note.body);
        await page.unroute(endpoint);
        await page.keyboard.press("Control+s");
      }
      await waitFor(async () => assert.equal(
        (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body.trimEnd(), expected.trimEnd()
      ));
      await page.waitForFunction(() => window.__prototypeEditor.activeTab()?.dirty === false);
      assert.equal(await page.evaluate(id => localStorage.getItem(`yansilu:draft:${id}`), note.id), null);
    } finally { release(); }
  });
}

for (const outcome of ["success", "failure"]) {
  test(`later edits survive a note switch during save preparation: ${outcome}`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const playwright = await optionalPlaywright(t);
    if (!playwright) return;
    const stack = await startPrototypeStack(t, playwright);
    if (!stack) return;
    const { page, apiBase } = stack;
    const create = async body => (await postJson(apiBase, "/api/v1/notes", {
      directoryId: "dir_original_default", body
    })).json.item;
    const first = await create("# 编辑期间切换\n\n## 核心观点\n后续编辑应当独立于此前的保存请求。");
    const other = await create("# 另一条记录\n\n这是另一条笔记的内容。");
    const open = async id => {
      await page.locator("#btnToggleSearch").click();
      await page.locator(`[data-search-note="${id}"]`).click();
      await page.waitForFunction(noteId => window.__prototypeEditor.activeNote()?.id === noteId, id);
    };
    const append = async text => {
      if (!(await page.locator("#editorHost .cm-content").isVisible())) await page.locator("#btnModeToggle").click();
      await page.locator("#editorHost .cm-content:visible").click();
      await page.keyboard.press("Control+End");
      await page.keyboard.insertText(text);
    };
    await open(first.id);
    await append("\n\n这是先发起保存的内容。");
    let release, checking = false;
    const held = new Promise(resolve => { release = resolve; });
    await page.route("**/api/v1/originality/check", async route => {
      const response = await route.fetch();
      checking = true;
      await held;
      await route.fulfill({ response });
    });
    const endpoint = `**/api/v1/notes/${first.id}`;
    if (outcome === "failure") await page.route(endpoint, route => route.request().method() === "PUT"
      ? route.fulfill({ status: 500, json: { error: { code: "TEST_SAVE_FAILED", message: "Test write failed" } } })
      : route.continue());
    try {
      await page.keyboard.press("Control+s");
      await waitFor(() => assert.equal(checking, true));
      await append("\n\n稍后输入的新想法必须保留。");
      const latest = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
      await open(other.id);
      release();
      await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
      const sourceTab = await page.evaluate(id => window.__prototypeState.tabs.find(tab => tab.noteId === id), first.id);
      assert.equal(sourceTab.body.trimEnd(), latest.trimEnd());
      assert.equal(sourceTab.dirty, true);
      const draft = await page.evaluate(id => JSON.parse(localStorage.getItem(`yansilu:draft:${id}`)), first.id);
      assert.equal(draft.body.trimEnd(), latest.trimEnd());
      assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote().id), other.id);
      assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /这是另一条笔记的内容/);
      const savedEarlier = (await fetchJson(apiBase, `/api/v1/notes/${first.id}`)).json.item.body;
      assert.doesNotMatch(savedEarlier, /稍后输入的新想法/);
      if (outcome === "success") assert.match(savedEarlier, /这是先发起保存的内容/);
      else assert.equal(savedEarlier, first.body);
      await page.unroute("**/api/v1/originality/check");
      if (outcome === "failure") await page.unroute(endpoint);
      await open(first.id);
      assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /稍后输入的新想法必须保留/);
      await page.keyboard.press("Control+s");
      await waitFor(async () => assert.match(
        (await fetchJson(apiBase, `/api/v1/notes/${first.id}`)).json.item.body, /稍后输入的新想法必须保留/
      ));
      await page.waitForFunction(() => window.__prototypeEditor.activeTab()?.dirty === false);
    } finally { release(); }
  });
}
