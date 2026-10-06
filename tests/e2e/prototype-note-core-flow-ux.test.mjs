import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { optionalPlaywright, startPrototypeStack, createWritingReadyPermanentNote, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

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
  assert.equal(await panel.evaluate(el => el.contains(document.activeElement)), true);
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
  test(`polish refresh restores selection and modal shortcuts cannot switch notes (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { apiBase, page } = stack;
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
      assert.equal(await composingField.evaluate(el => el === document.activeElement), true);
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
