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
  test(`${kind} originality rejection explains the next edit and retains the AI review for retry`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t); if (!pw) return;
    const stack = await startPrototypeStack(t, pw); if (!stack) return;
    const { page, apiBase } = stack;
    const body = kind === "literature" ? composeLiteratureWorkspace({ title: "审阅检验材料",
      originalText: "表达流畅不能说明方法能迁移。", paraphrase: "检查方法需要新场景。", supportsJudgment: "用新的判断检查解释。",
      citation: { authors: "作者乙", year: "2025", sourceTitle: "判断方法", locator: "第 18 页" } }) : "# 审阅检验随笔\n\n表达流畅不能说明方法能迁移。";
    const source = (await postJson(apiBase, "/api/v1/notes", { directoryId: `dir_${kind}_default`, body })).json.item;
    await open(page, source.id);
    await page.evaluate(() => {
      const editor = window.__prototypeEditor;
      editor.setInspectorVisible(true);
      editor.setSourceDistillAiState({ actionId: "distill_material", noteId: editor.activeNote().id,
        status: "awaiting_confirmation", sourceBodySnapshot: editor.getEditorValue(), error: "",
        result: { kind: "draft", modelUsed: true, draft: { title: "用新场景检验方法", coreArgument: "检验解释要检查新的判断。", content: "材料提供了检查解释的线索。", questions: "哪些观察可以推翻结论？" } } });
    });
    let attempts = 0;
    await page.route("**/api/v1/notes", route => {
      if (route.request().method() !== "POST") return route.continue();
      attempts++;
      if (attempts === 1) return route.fulfill({ status: 400, json: { error: { code: "PERMANENT_ORIGINALITY_BLOCKED", message: "Permanent note save blocked: rewrite this note in your own words before saving." } } });
      return route.continue();
    });
    const panel = page.locator("#relatedPanel");
    const claim = panel.locator('[data-contextual-ai-field="coreArgument"]');
    const content = panel.locator('[data-contextual-ai-field="content"]');
    await claim.fill("人工审阅：检验说明能否指导一个新判断。");
    const reviewedContent = await content.inputValue();
    await panel.locator("[data-contextual-ai-adopt]").click();
    await page.locator("#permanentNoteCreate").click();
    await page.waitForFunction(() => !window.__prototypeEditor.sourceDistillAdopting);
    await page.waitForFunction(() => document.body.innerText.includes("内容与已有材料过于相似。请改写核心观点和内容，再创建永久笔记。"));
    assert.doesNotMatch(await page.locator("body").innerText(), /Permanent note save blocked/);
    assert.equal(await claim.inputValue(), "人工审阅：检验说明能否指导一个新判断。");
    assert.equal(await content.inputValue(), reviewedContent);
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body, source.body);
    assert.equal((await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes")).json.items.length, 0);
    await content.fill("我会先构造一个反例，再列出继续采用这个方法所需的观察证据。独立的检验步骤能让结论的边界被其他人核查。");
    await panel.locator("[data-contextual-ai-adopt]").click();
    await page.locator("#permanentNoteCreate").click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id !== id && !window.__prototypeEditor.savingPromise, source.id);
    const permanentId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
    const permanent = (await fetchJson(apiBase, `/api/v1/notes/${permanentId}`)).json.item;
    assert.equal(attempts, 2);
    assert.equal((await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes")).json.items.length, 1);
    assert.match(permanent.body, /独立的检验步骤/);
    assert(permanent.body.includes(`[[${source.id}|`));
    assert.equal(permanent.authorship.ai_assisted, true);
    assert.equal(permanent.authorship.user_confirmed, false);
  });
}

for (const kind of ["fleeting", "literature"]) {
  test(`${kind} AI draft directory dialog stays above its inspector and retains review after cancel`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t); if (!pw) return;
    const stack = await startPrototypeStack(t, pw); if (!stack) return;
    const { page, apiBase } = stack;
    const body = kind === "literature" ? composeLiteratureWorkspace({ title: "AI 审阅材料",
      originalText: "复述有助于检查理解。", paraphrase: "解释材料可以发现理解缺口。", supportsJudgment: "检验理解需要复述和核对依据。",
      citation: { authors: "作者甲", year: "2024", sourceTitle: "学习方法", locator: "第 12 页" } }) : "# AI 审阅随笔\n\n复述材料后还需要核对依据。";
    const source = (await postJson(apiBase, "/api/v1/notes", { directoryId: `dir_${kind}_default`, body })).json.item;
    await open(page, source.id);
    // Seed a reviewed result only; directory selection and persistence use the real UI/API.
    await page.evaluate(() => {
      const editor = window.__prototypeEditor;
      editor.setInspectorVisible(true);
      editor.setSourceDistillAiState({ actionId: "distill_material", noteId: editor.activeNote().id,
        status: "awaiting_confirmation", sourceBodySnapshot: editor.getEditorValue(), error: "",
        result: { kind: "draft", modelUsed: true, draft: { title: "理解需要核对依据", coreArgument: "复述只是起点。", content: "需要回到材料核对依据。", questions: "适用边界是什么？" } } });
    });
    const panel = page.locator("#relatedPanel");
    const claim = panel.locator('[data-contextual-ai-field="coreArgument"]');
    await claim.fill("人工审阅：复述与证据核对共同检验理解。");
    await panel.locator("[data-contextual-ai-adopt]").click();
    await page.locator("#permanentNoteModal:visible").waitFor();
    assert.equal(await page.locator("#permanentNoteCancel").evaluate(button => {
      const r = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    }), true, "The inspector must not cover directory-dialog controls");
    await page.locator("#permanentNoteCancel").click();
    await page.locator("#permanentNoteModal").waitFor({ state: "hidden" });
    await page.waitForFunction(() => !window.__prototypeEditor.sourceDistillAdopting);
    assert.equal(await claim.inputValue(), "人工审阅：复述与证据核对共同检验理解。");
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body, source.body);
    await panel.locator("[data-contextual-ai-adopt]").click();
    await page.locator("#permanentNoteCreate").click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id !== id && !window.__prototypeEditor.savingPromise, source.id);
    const permanentId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
    const permanent = (await fetchJson(apiBase, `/api/v1/notes/${permanentId}`)).json.item;
    assert.match(permanent.body, /人工审阅：复述与证据核对共同检验理解/);
    assert.ok(permanent.body.includes(`[[${source.id}|`));
    const savedSource = (await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item;
    assert.ok(savedSource.body.includes(kind === "fleeting" ? "复述材料后还需要核对依据。" : "解释材料可以发现理解缺口。"));
  });
}

for (const kind of ["fleeting", "literature"]) {
  for (const scenario of ["switch-note", "external-conflict"]) {
    test(`${kind} promotion respects current navigation and external edits: ${scenario}`, async t => {
      if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
      const pw = await optionalPlaywright(t);
      if (!pw) return;
      const stack = await startPrototypeStack(t, pw);
      if (!stack) return;
      const { page, apiBase } = stack;
      const body = kind === "literature" ? composeLiteratureWorkspace({ title: "阅读材料",
        originalText: "需要检验理解。", paraphrase: "离开原文表达能检验理解。", supportsJudgment: "用回忆检验理解。",
        citation: { authors: "作者甲", year: "2024", sourceTitle: "学习方法", locator: "第 12 页" } }) : "# 随手记录\n\n保留当前想法。";
      const source = (await postJson(apiBase, "/api/v1/notes", { directoryId: `dir_${kind}_default`, body })).json.item;
      const other = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# 另一条笔记\n\n继续编辑这里。" })).json.item;
      await open(page, source.id);
      let release, entered, sourceWrites = 0;
      const gate = new Promise(resolve => { release = resolve; });
      const started = new Promise(resolve => { entered = resolve; });
      t.after(() => release());
      const endpoint = scenario === "switch-note" ? "**/api/v1/notes" : `**/api/v1/notes/${source.id}`;
      const method = scenario === "switch-note" ? "POST" : "PUT";
      await page.route(endpoint, async route => {
        if (route.request().method() !== method) return route.continue();
        sourceWrites++;
        entered(); await gate;
        return route.continue();
      });
      await page.locator("#btnRecordPermanent").click();
      await page.locator("#permanentNoteCreate").click();
      await started;
      let externalBody;
      if (scenario === "switch-note") {
        await open(page, other.id);
        await append(page, "\n新笔记里的输入不能被打断。");
      } else {
        externalBody = `${source.body}\n\n外部程序新增的材料。`;
        const response = await fetch(`${apiBase}/api/v1/notes/${source.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: source.title, body: externalBody, status: "draft", expectedRevision: source.fileRevision })
        });
        assert.equal(response.status, 200);
      }
      release();
      await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
      const tab = await page.evaluate(id => window.__prototypeState.tabs.find(tab => tab.noteId === id), source.id);
      const permanentId = await page.evaluate(id => window.__prototypeState.notes.find(note => note.id === id).generatedOriginalNoteId, source.id);
      assert.ok(permanentId);
      const permanent = (await fetchJson(apiBase, `/api/v1/notes/${permanentId}`)).json.item;
      assert.match(permanent.body, new RegExp(`\\[\\[${source.id}\\|`));
      if (scenario === "switch-note") {
        assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote().id), other.id);
        assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /新笔记里的输入不能被打断/);
      } else {
        assert.equal(tab.saveConflict, true);
        assert.equal(tab.saveUiState.mode, "conflict");
        assert.equal(tab.dirty, true);
        const saved = (await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item;
        assert.equal(saved.body.trim(), externalBody.trim());
        assert.doesNotMatch(saved.body, /generated-original=/);
        assert.match(tab.body, /generated-original=/);
        assert.equal(sourceWrites, 1);
        const draft = await page.evaluate(id => JSON.parse(localStorage.getItem(`yansilu:draft:${id}`)), source.id);
        assert.equal(draft.savedFileRevision, source.fileRevision);
        assert.equal(draft.body, tab.body);
      }
    });
  }
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
          assert.equal(tab.saveUiState.mode, outcome === "missing-result" ? "uncertain" : "error");
          if (outcome === "missing-result") assert.equal(tab.saveConflict, true);
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
