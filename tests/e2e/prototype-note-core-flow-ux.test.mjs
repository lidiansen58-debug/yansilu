import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { optionalPlaywright, startPrototypeStack, createWritingReadyPermanentNote, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("a renamed viewpoint draft survives confirmation failure and retries at 320px", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  await page.setViewportSize({ width: 320, height: 844 });
  const note = (await createWritingReadyPermanentNote(apiBase, {
    title: "阅读材料留下的旧标题", body: "# 阅读材料留下的旧标题\n\n原始正文保留。", thesis: "先前的判断。"
  })).json.item;
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${note.id}"]`).click();
  await page.locator("#btnShowRelated").click();
  const panel = page.locator("#relatedPanel");
  const title = "核对原文能修正解释的遗漏";
  const thesis = "向别人解释后，再核对原文中的前提。";
  await panel.locator('input[name="title"]').fill(title);
  await panel.locator('textarea[name="thesis"]').fill(thesis);
  await panel.locator('textarea[name="thesisChangeReason"]').fill("交流暴露了原先遗漏的条件。");
  await panel.getByRole("tab", { name: "形成过程", exact: true }).click();
  await panel.getByRole("tab", { name: "当前观点", exact: true }).click();
  assert.equal(await panel.locator('input[name="title"]').inputValue(), title);
  const endpoint = `**/api/v1/permanent-notes/${note.id}/distillation/confirm`;
  await page.route(endpoint, route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "确认服务暂时不可用" } }) }));
  await panel.getByRole("button", { name: "保存当前观点", exact: true }).click();
  await waitFor(async () => assert.match(await page.locator("#statusText").textContent(), /草稿已保存，但确认失败.*确认服务暂时不可用/));
  const draft = (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item;
  assert.equal(draft.title, title);
  assert.equal(draft.thesis, thesis);
  assert.equal(draft.distillationStatus, "draft");
  assert.ok((await page.evaluate(() => window.__prototypeEditor.getEditorValue())).startsWith(`# ${title}\n`));
  assert.equal(await panel.locator('input[name="title"]').inputValue(), title);
  assert.equal(await panel.locator('textarea[name="thesis"]').inputValue(), thesis);
  assert.equal(await panel.locator("[data-note-association-followup]").count(), 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await mkdir("output/note-core-flow-ux", { recursive: true });
  await page.screenshot({ path: "output/note-core-flow-ux/title-confirm-retry-320.png", fullPage: true });
  await page.unroute(endpoint);
  await panel.getByRole("button", { name: "保存当前观点", exact: true }).click();
  await panel.locator("[data-note-association-followup]").waitFor({ state: "visible" });
  const confirmed = (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item;
  assert.equal(confirmed.title, title);
  assert.equal(confirmed.distillationStatus, "confirmed");
  assert.match(confirmed.body, /向别人解释后，再核对原文中的前提/);
  assert.equal(await page.evaluate(() => window.__prototypeEditor.activeTab().savedFileRevision), confirmed.fileRevision);
});

test("a late confirmed save preserves a newer title, viewpoint and input selection", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  await page.setViewportSize({ width: 390, height: 844 });
  const note = (await createWritingReadyPermanentNote(apiBase, {
    title: "第一份观点", body: "# 第一份观点\n\n我的记录。", thesis: "已有判断。"
  })).json.item;
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${note.id}"]`).click();
  await page.locator("#btnShowRelated").click();
  const panel = page.locator("#relatedPanel");
  await panel.locator('input[name="title"]').fill("本次保存的标题");
  await panel.locator('textarea[name="thesis"]').fill("本次保存的判断。");
  await panel.locator('textarea[name="thesisChangeReason"]').fill("新的阅读材料补充了依据。");
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  const endpoint = `**/api/v1/permanent-notes/${note.id}/distillation/confirm`;
  await page.route(endpoint, async route => {
    const response = await route.fetch();
    entered();
    await gate;
    await route.fulfill({ response });
  });
  await panel.getByRole("button", { name: "保存当前观点", exact: true }).click();
  await started;
  await panel.locator('input[name="title"]').fill("继续输入的新标题");
  const thesis = panel.locator('textarea[name="thesis"]');
  await thesis.fill("继续输入的新判断。");
  await thesis.evaluate(el => { el.focus(); el.setSelectionRange(2, 6, "backward"); });
  release();
  await waitFor(async () => assert.match(await page.locator("#statusText").textContent(), /新输入的修改尚未保存/));
  assert.equal(await panel.locator('input[name="title"]').inputValue(), "继续输入的新标题");
  assert.equal(await panel.locator('input[name="originalThesis"]').inputValue(), "本次保存的判断。");
  assert.deepEqual(await thesis.evaluate(el => ({ value: el.value, focused: el === document.activeElement,
    start: el.selectionStart, end: el.selectionEnd, direction: el.selectionDirection })), {
    value: "继续输入的新判断。", focused: true, start: 2, end: 6, direction: "backward"
  });
  assert.equal(await panel.locator("[data-note-association-followup]").count(), 0);
  const saved = (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item;
  assert.equal(saved.title, "本次保存的标题");
  assert.equal(saved.thesis, "本次保存的判断。");
  await page.unroute(endpoint);
  await panel.getByRole("button", { name: "保存当前观点", exact: true }).click();
  await panel.locator("[data-note-association-followup]").waitFor({ state: "visible" });
  const newest = (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item;
  assert.equal(newest.title, "继续输入的新标题");
  assert.equal(newest.thesis, "继续输入的新判断。");
  assert.ok(newest.viewpointHistory.some(item => item.previousThesis === "本次保存的判断。" && item.thesis === "继续输入的新判断。"));
});

for (const failed of [false, true]) {
  test(`delayed relation ${failed ? "failure" : "success"} keeps the composing viewpoint input mounted`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase } = stack;
    const note = (await createWritingReadyPermanentNote(apiBase, { title: "正在输入的观点", body: "# 正在输入的观点", thesis: "原观点" })).json.item;
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${note.id}"]`).click();
    let release, entered;
    const gate = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { entered = resolve; });
    t.after(() => release());
    const endpoint = `**/api/v1/notes/${note.id}/relations`;
    await page.route(endpoint, async route => {
      entered();
      await gate;
      if (failed) await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "delayed relation failure" } }) });
      else await route.continue();
    });
    await page.evaluate(() => {
      const editor = window.__prototypeEditor;
      window.__delayedRelationsTrace = [];
      window.__completedRelationSerials = new Set();
      const refresh = editor.refreshSemanticRelations.bind(editor);
      editor.refreshSemanticRelations = async (...args) => {
        window.__delayedRelationsTrace.push({ phase: "start", requested: args[1], current: editor.relationsRequestSerial });
        await refresh(...args);
        window.__completedRelationSerials.add(args[1]);
        window.__delayedRelationsTrace.push({ phase: "end", requested: args[1], current: editor.relationsRequestSerial,
          state: editor.semanticRelationsState, links: editor.currentSemanticRelations?.outgoingLinks?.length });
      };
    });
    await page.locator("#btnShowRelated").click();
    await started;
    const field = page.locator('#relatedPanel textarea[name="thesis"]');
    await field.fill("加载中输入的新观点");
    await page.locator('#relatedPanel textarea[name="thesisChangeReason"]').fill("新的材料补充了判断依据。");
    await field.focus();
    await field.evaluate(el => {
      window.__composingViewpointInput = el;
      el.setSelectionRange(2, 7, "backward");
      el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "新" }));
    });
    let related;
    if (!failed) {
      related = (await createWritingReadyPermanentNote(apiBase, { title: "迟到的补充依据", body: "# 迟到的补充依据", thesis: "补充判断依据。" })).json.item;
      const relation = await postJson(apiBase, `/api/v1/notes/${note.id}/relations`, {
        toNoteId: related.id, relationType: "supports", rationale: "提供了正在整理的观点所需的依据。"
      });
      assert.equal(relation.status, 201, JSON.stringify(relation.json));
    }
    release();
    try {
      await page.waitForFunction(() => window.__completedRelationSerials.has(window.__prototypeEditor.relationsRequestSerial));
    } catch (error) {
      t.diagnostic(JSON.stringify(await page.evaluate(() => ({ trace: window.__delayedRelationsTrace,
        completed: [...window.__completedRelationSerials], state: window.__prototypeEditor.semanticRelationsState,
        current: window.__prototypeEditor.relationsRequestSerial, note: window.__prototypeEditor.activeNote()?.id }))));
      throw error;
    }
    assert.deepEqual(await field.evaluate(el => ({
      sameNode: el === window.__composingViewpointInput, value: el.value,
      focused: el === document.activeElement, start: el.selectionStart, end: el.selectionEnd, direction: el.selectionDirection
    })), { sameNode: true, value: "加载中输入的新观点", focused: true, start: 2, end: 7, direction: "backward" });
    assert.equal(await page.evaluate(() => window.__prototypeEditor.semanticRelationsState), failed ? "error" : "loaded");
    await field.evaluate(el => el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "新" })));
    await page.unroute(endpoint);
    if (related) {
      await page.locator("#relatedPanel").getByRole("tab", { name: "笔记关联", exact: true }).click();
      await page.locator("#relatedPanel").getByText(related.title, { exact: true }).first().waitFor({ state: "visible" });
      await page.locator("#relatedPanel").getByRole("tab", { name: "当前观点", exact: true }).click();
      assert.equal(await field.inputValue(), "加载中输入的新观点");
    }
    await page.locator("#relatedPanel").getByRole("button", { name: "保存当前观点", exact: true }).click();
    await waitFor(async () => assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.thesis, "加载中输入的新观点"));
  });
}

test("polish workspace preserves edits across keyboard tabs and fits desktop and mobile", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { apiBase, page } = stack;
  const title = "用自己的话解释，为什么能检查理解？";
  const source = (await createWritingReadyPermanentNote(apiBase, {
    title, body: `# ${title}\n\n把知识讲给别人听，才会发现理解中的空白。`,
    thesis: "能用自己的话解释一个观点，才能检验是否真正理解。"
  })).json.item;
  const target = (await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default", body: "# 练习材料：让读书笔记从摘录走向自己的判断，并用解释检验理解中的空白\n\n解释是一种练习。"
  })).json.item;
  await postJson(apiBase, `/api/v1/notes/${source.id}/relations`, {
    toNoteId: target.id, relationType: "supports",
    rationale: "这条练习材料提供了具体方法：合上原文重新解释，再对照遗漏之处。"
  });
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${source.id}"]`).click();
  await page.locator("#btnShowRelated").click();
  const panel = page.locator("#relatedPanel");
  const thesis = panel.locator('textarea[name="thesis"]');
  await thesis.waitFor({ state: "visible" });
  await panel.locator("#btnHideRelated").focus();
  await page.keyboard.press("Shift+Tab");
  assert.equal(await panel.getByRole("button", { name: "保存当前观点", exact: true }).evaluate(el => el === document.activeElement), true);
  await page.keyboard.press("Tab");
  assert.equal(await panel.locator("#btnHideRelated").evaluate(el => el === document.activeElement), true);
  await thesis.fill("重新解释一个观点，能暴露理解中的空白。");
  await panel.locator('textarea[name="thesisChangeReason"]').fill("练习笔记提供了可以执行的检验方法。");
  const viewpoint = panel.getByRole("tab", { name: "当前观点", exact: true });
  await viewpoint.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await panel.getByRole("tab", { name: "笔记关联", exact: true }).getAttribute("aria-selected"), "true");
  await page.keyboard.press("End");
  assert.equal(await panel.getByRole("tab", { name: "形成过程", exact: true }).getAttribute("aria-selected"), "true");
  assert.equal(await panel.locator("[data-note-relations-section]").isVisible(), false);
  await page.keyboard.press("Home");
  assert.equal(await thesis.inputValue(), "重新解释一个观点，能暴露理解中的空白。");
  await mkdir("output/note-core-flow-ux", { recursive: true });
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await panel.getByRole("tab", { name: "笔记关联", exact: true }).click();
    await panel.getByText("这条练习材料提供了具体方法：合上原文重新解释，再对照遗漏之处。", { exact: true }).waitFor();
    const geometry = await panel.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const result = el.querySelector("#resultArea");
      const title = el.querySelector(".semantic-relation-summary-row .related-item-title");
      const nestedScrollers = [...result.querySelectorAll("*")].filter(node => {
        const style = getComputedStyle(node);
        return node.getClientRects().length && /auto|scroll/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
      });
      return { left: rect.left, right: rect.right, overflow: result.scrollWidth - result.clientWidth,
        titleOverflow: title.scrollWidth - title.clientWidth, nestedScrollers: nestedScrollers.length };
    });
    assert.ok(geometry.left >= 0 && geometry.right <= width + 1, JSON.stringify(geometry));
    assert.ok(geometry.overflow <= 1 && geometry.titleOverflow <= 1, JSON.stringify(geometry));
    assert.equal(geometry.nestedScrollers, 0);
    await page.screenshot({ path: `output/note-core-flow-ux/relations-${width}.png` });
    await viewpoint.click();
    assert.equal(await thesis.inputValue(), "重新解释一个观点，能暴露理解中的空白。");
    await page.screenshot({ path: `output/note-core-flow-ux/viewpoint-${width}.png` });
  }
  await panel.getByRole("button", { name: "保存当前观点", exact: true }).click();
  await waitFor(async () => {
    const saved = (await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item;
    assert.equal(saved.thesis, "重新解释一个观点，能暴露理解中的空白。");
  });
  await panel.locator("[data-note-association-followup]").waitFor({ state: "visible" });
  const focusAfterSave = await panel.evaluate(el => ({
    within: el.contains(document.activeElement), active: document.activeElement?.outerHTML?.slice(0, 600),
    visible: el.getClientRects().length, inspector: window.__prototypeEditor.state.inspectorVisible
  }));
  if (!focusAfterSave.within) t.diagnostic(JSON.stringify(focusAfterSave));
  assert.equal(await panel.evaluate(el => el.contains(document.activeElement)), true);
  await page.screenshot({ path: "output/note-core-flow-ux/viewpoint-saved-390.png" });
  await page.keyboard.press("Escape");
  assert.equal(await panel.isVisible(), false);
  assert.equal(await page.locator("#btnShowRelated").evaluate(el => el === document.activeElement), true);
  await page.locator("#btnShowRelated").click();
  await panel.getByRole("tab", { name: "形成过程", exact: true }).click();
  await panel.getByText("改变原因：练习笔记提供了可以执行的检验方法。", { exact: false }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await panel.isVisible(), false);
  assert.equal(await page.locator("#btnShowRelated").evaluate(el => el === document.activeElement), true);

  await page.setViewportSize({ width: 1366, height: 900 });
  const material = (await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_fleeting_default", body: "# 今天的阅读想法\n\n合上书试着复述，发现我能重复结论，却解释不出理由。"
  })).json.item;
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${material.id}"]`).click();
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator("#btnRecordPermanent").click();
    const modal = page.locator("#permanentNoteModal");
    await modal.waitFor({ state: "visible" });
    const geometry = await modal.locator(".modal").boundingBox();
    assert.ok(geometry.x >= 0 && geometry.x + geometry.width <= width + 1);
    await page.screenshot({ path: `output/note-core-flow-ux/promotion-${width}.png` });
    if (width === 1366) await page.locator("#permanentNoteCancel").click();
    else await page.locator("#permanentNoteCreate").click();
  }
  await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id !== id && !document.querySelector("#permanentNoteModal")?.getClientRects().length, material.id);
  const permanentId = await page.evaluate(() => window.__prototypeEditor.activeNote()?.id);
  const permanent = (await fetchJson(apiBase, `/api/v1/notes/${permanentId}`)).json.item;
  assert.match(permanent.body, new RegExp(`\\[\\[${material.id}\\|`));
});

for (const width of [1366, 390]) {
  test(`late viewpoint save preserves newer body input and a dismissed panel (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase } = stack;
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const note = (await createWritingReadyPermanentNote(apiBase, {
      title: "等待保存时继续写", body: "# 等待保存时继续写\n\n保留已有记录。", thesis: "原来的判断。"
    })).json.item;
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${note.id}"]`).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, note.id);
    if (await page.evaluate(() => window.__prototypeEditor.state.previewMode) !== 'source') await page.locator("#btnModeToggle").click();
    await page.locator('#editorHost .cm-content:visible').waitFor();
    const previous = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
    await page.locator("#btnShowRelated").click();
    const panel = page.locator("#relatedPanel");
    await panel.locator('textarea[name="thesis"]').fill("交流后核对原文，可以发现遗漏。");
    await panel.locator('textarea[name="thesisChangeReason"]').fill("读书交流中出现了不同的解释。");
    let release, entered;
    const gate = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { entered = resolve; });
    t.after(() => release());
    await page.route(`**/api/v1/permanent-notes/${note.id}/distillation/confirm`, async route => {
      const response = await route.fetch();
      entered();
      await gate;
      await route.fulfill({ response });
    });
    await page.evaluate(() => {
      const editor = window.__prototypeEditor;
      const handle = editor.handleDistillationForm.bind(editor);
      editor.handleDistillationForm = async form => { await handle(form); window.__viewpointSaveReturned = true; };
    });
    await panel.getByRole("button", { name: "保存当前观点", exact: true }).click();
    await started;
    await panel.locator("#btnHideRelated").click();
    const newer = `${previous.trim()}\n\n迟到的响应不能覆盖这段新记录。`;
    const body = page.locator("#editorHost .cm-content:visible");
    await body.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.insertText(newer);
    const confirmed = (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item;
    const merged = `${confirmed.body.trim()}\n\n迟到的响应不能覆盖这段新记录。`;
    release();
    await page.waitForFunction(() => window.__viewpointSaveReturned);
    assert.equal(await panel.isVisible(), false);
    assert.equal(await body.evaluate(el => el.contains(document.activeElement)), true);
    const client = await page.evaluate(() => ({ body: window.__prototypeEditor.getEditorValue(), tab: window.__prototypeEditor.activeTab() }));
    assert.equal(client.body.trim(), merged);
    assert.equal(client.tab.body.trim(), merged);
    assert.deepEqual(await page.evaluate(() => window.__prototypeEditor.editorSelection()),
      { from: client.body.trimEnd().length, to: client.body.trimEnd().length }, "The caret must stay after the newly typed paragraph");
    assert.equal(client.tab.dirty, true);
    assert.ok(client.tab.savedBody.includes("交流后核对原文，可以发现遗漏。"));
    await page.keyboard.press("Control+s");
    await waitFor(async () => assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body.trim(), merged));
    await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
    assert.equal(await page.evaluate(() => window.__prototypeEditor.activeTab().dirty), false);
    await page.locator('#btnModeToggle').click();
    const reading = page.locator('#wysiwygHost .toastui-editor-ww-container .ProseMirror');
    try { await reading.waitFor({ state: 'visible', timeout: 5000 }); }
    catch (error) {
      t.diagnostic(JSON.stringify(await page.evaluate(() => ({ status: document.querySelector('#statusText').textContent,
        mode: window.__prototypeEditor.state.previewMode, rich: Boolean(window.__prototypeEditor.richEditor) }))));
      throw error;
    }
    assert.doesNotMatch(await reading.innerText(), /yansilu:distillation:end/);
    assert.match(await reading.innerText(), /交流后核对原文，可以发现遗漏/);
    await reading.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('正文模式继续输入。');
    const richBody = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
    assert.equal((richBody.match(/<!-- yansilu:distillation:end -->/g) || []).length, 1);
    assert.doesNotMatch(richBody, /\$\$widget/);
    await page.keyboard.press('Control+s');
    await waitFor(async () => {
      const saved = (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item;
      assert.match(saved.body, /正文模式继续输入/);
      assert.equal((saved.body.match(/<!-- yansilu:distillation:end -->/g) || []).length, 1);
      assert.match(saved.body, /交流后核对原文，可以发现遗漏/);
    });
    await page.locator('#btnModeToggle').click();
    await body.click();
    await page.keyboard.press('Control+End');
    const example = '\n\n```md\n<!-- yansilu:distillation:end -->\n```';
    await page.keyboard.insertText(example);
    await page.keyboard.press('Control+s');
    await waitFor(async () => assert.ok((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body.includes(example.trim())));
    await page.locator('#btnModeToggle').click();
    await reading.waitFor({ state: 'visible' });
    assert.equal(((await reading.innerText()).match(/yansilu:distillation:end/g) || []).length, 1, 'The code example remains visible; the actual delimiter stays hidden');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `output/note-core-flow-ux/merged-reading-${width}.png` });
  });

  test(`polish refresh restores selection and modal shortcuts cannot switch notes (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { apiBase, page } = stack;
    await page.evaluate(() => {
      window.__workspaceFocusTrace = [];
      document.addEventListener("focusin", event => {
        const node = event.target;
        window.__workspaceFocusTrace.push({ tag: node.tagName, id: node.id, name: node.getAttribute("name"), time: performance.now() });
        window.__workspaceFocusTrace = window.__workspaceFocusTrace.slice(-20);
      });
    });
    const create = async title => (await createWritingReadyPermanentNote(apiBase, {
      title, body: `# ${title}\n\n保留正文。`, thesis: "保留当前判断。"
    })).json.item;
    const other = await create("其他已打开的笔记"), note = await create("正在打磨的笔记");
    await postJson(apiBase, `/api/v1/notes/${note.id}/relations`, {
      toNoteId: other.id, relationType: "supports", rationale: "预览这条关联笔记的证据。"
    });
    for (const item of [other, note]) {
      await page.locator("#btnToggleSearch").click();
      await page.locator(`[data-search-note="${item.id}"]`).click();
    }
    await page.setViewportSize({ width, height: 900 });
    await page.locator("#btnShowRelated").click();
    await page.waitForFunction(() => window.__prototypeEditor.semanticRelationsState === "loaded");
    const panel = page.locator("#relatedPanel");
    await panel.locator(".viewpoint-optional-details > summary").click();
    const boundary = panel.locator('textarea[name="boundaryOrCounterpoint"]');
    await boundary.fill("只在能够解释证据和理由时，才说明理解足够完整。");
    await boundary.evaluate(el => el.setSelectionRange(3, 11, "backward"));
    const beforeScroll = await panel.locator("#resultArea").evaluate(el => el.scrollTop);

    let release, entered;
    const gate = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { entered = resolve; });
    t.after(() => release());
    const endpoint = `**/api/v1/notes/${note.id}/relations`;
    await page.route(endpoint, async route => { entered(); await gate; await route.continue(); });
    await page.evaluate(() => {
      const editor = window.__prototypeEditor;
      window.__reviewRefreshDone = false;
      void editor.refreshSemanticRelations(editor.activeNote().id, editor.relationsRequestSerial)
        .then(() => { window.__reviewRefreshDone = true; });
    });
    await started;
    release();
    await page.waitForFunction(() => window.__reviewRefreshDone);
    await page.unroute(endpoint);
    assert.deepEqual(await boundary.evaluate(el => ({
      focused: el === document.activeElement, start: el.selectionStart,
      end: el.selectionEnd, direction: el.selectionDirection,
      detailsOpen: el.closest("details").open, value: el.value
    })), {
      focused: true, start: 3, end: 11, direction: "backward", detailsOpen: true,
      value: "只在能够解释证据和理由时，才说明理解足够完整。"
    });
    assert.equal(await panel.locator("#resultArea").evaluate(el => el.scrollTop), beforeScroll);
    await page.keyboard.press("Escape");
    assert.equal(await panel.isVisible(), false);
    assert.equal(await page.locator("#btnShowRelated").evaluate(el => el === document.activeElement), true);

    await page.locator("#btnShowRelated").click();
    const viewpoint = panel.getByRole("tab", { name: "当前观点", exact: true });
    await viewpoint.focus();
    for (const key of ["Control+ArrowRight", "Control+ArrowLeft", "Alt+ArrowRight", "Meta+ArrowRight", "Shift+ArrowRight", "F2", "Delete"]) {
      await page.keyboard.press(key);
      assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote().id), note.id, key);
      assert.equal(await viewpoint.getAttribute("aria-selected"), "true", key);
    }
    await page.keyboard.press("ArrowRight");
    assert.equal(await panel.getByRole("tab", { name: "笔记关联", exact: true }).getAttribute("aria-selected"), "true");
    await panel.locator(`[data-preview-note="${other.id}"]`).first().click();
    await panel.locator(".note-peek-actions").waitFor({ state: "visible" });
    assert.equal(await panel.evaluate(el => el.contains(document.activeElement)), true);
    await page.keyboard.press("Escape");
    assert.equal(await panel.isVisible(), false);
    // Body-link and tag entry points open the modal from outside resultArea.
    await page.evaluate(id => window.__prototypeEditor.handleTokenAction(`[[${id}]]`), other.id);
    await panel.locator(".note-peek-actions").waitFor({ state: "visible" });
    assert.equal(await panel.evaluate(el => el.contains(document.activeElement)), true);
    await page.keyboard.press("Escape");
    assert.equal(await panel.isVisible(), false);
    await page.evaluate(() => window.__prototypeEditor.handleTokenAction("#focus-regression"));
    assert.equal(await panel.evaluate(el => el.contains(document.activeElement)), true);
    await page.keyboard.press("Escape");
    assert.equal(await panel.isVisible(), false);
    await page.locator("#btnShowRelated").click();
    await panel.getByRole("tab", { name: "当前观点", exact: true }).click();
    const composingField = panel.locator('textarea[name="thesis"]');
    await composingField.focus();
    for (const legacy of [false, true]) {
      const prevented = await composingField.evaluate((el, legacy) => {
        const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true,
          isComposing: !legacy, keyCode: legacy ? 229 : 27 });
        el.dispatchEvent(event);
        return event.defaultPrevented;
      }, legacy);
      assert.equal(prevented, false);
      assert.equal(await panel.isVisible(), true);
      const focus = await composingField.evaluate(el => ({
        retained: el === document.activeElement,
        active: { tag: document.activeElement.tagName, id: document.activeElement.id, name: document.activeElement.getAttribute("name") },
        trace: window.__workspaceFocusTrace
      }));
      assert.equal(focus.retained, true, JSON.stringify(focus));
    }
    await page.keyboard.press("Escape");
    assert.equal(await panel.isVisible(), false);
    for (const outcome of ["closed", "replaced"]) {
      await page.locator("#btnShowRelated").click();
      await page.waitForFunction(() => window.__prototypeEditor.semanticRelationsState === "loaded");
      let releasePreview, previewEntered;
      const previewGate = new Promise(resolve => { releasePreview = resolve; });
      const previewStarted = new Promise(resolve => { previewEntered = resolve; });
      t.after(() => releasePreview());
      const previewEndpoint = `**/api/v1/notes/${other.id}`;
      await page.route(previewEndpoint, async route => {
        previewEntered();
        await previewGate;
        await route.continue();
      });
      await page.evaluate(id => {
        const editor = window.__prototypeEditor;
        editor.state.notes.find(item => item.id === id).bodyLoaded = false;
        window.__pendingPreview = editor.showNotePreviewInInspector(id);
      }, other.id);
      await previewStarted;
      if (outcome === "closed") await page.keyboard.press("Escape");
      else await page.evaluate(id => window.__prototypeEditor.showNotePreviewInInspector(id), note.id);
      releasePreview();
      await page.evaluate(() => window.__pendingPreview);
      await page.unroute(previewEndpoint);
      if (outcome === "closed") {
        assert.equal(await panel.isVisible(), false);
        assert.equal(await page.locator("#btnShowRelated").evaluate(el => el === document.activeElement), true);
      } else {
        assert.equal(await panel.locator("[data-open-linked-note]").getAttribute("data-open-linked-note"), note.id);
        assert.equal(await panel.evaluate(el => el.contains(document.activeElement)), true);
        await page.keyboard.press("Escape");
      }
    }
    // Application navigation remains available after the modal is closed.
    await page.keyboard.press("Control+ArrowRight");
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, other.id);
  });
}
