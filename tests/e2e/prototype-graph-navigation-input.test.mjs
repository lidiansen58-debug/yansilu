import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, createWritingReadyPermanentNote, waitFor } from "./prototype-copy-test-helpers.mjs";

test("reading an endpoint returns to the original focused graph", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  const notes = [];
  for (const title of ["中心笔记", "关联观点", "独立中心", "独立关联"]) {
    const result = await postJson(apiBase, "/api/v1/notes", {
      directoryId: "dir_original_default", body: `# ${title}\n\n${title}的实际正文。`
    });
    assert.equal(result.status, 201);
    notes.push(result.json.item);
  }
  for (const [source, target] of [[0, 1], [2, 3]]) {
    assert.equal((await postJson(apiBase, `/api/v1/notes/${notes[source].id}/relations`, {
      toNoteId: notes[target].id, relationType: "supports", rationale: "这个观点提供了具体依据。"
    })).status, 201);
  }
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
  await page.locator(`.explorer-item[data-kind="file"][data-id="${notes[0].id}"]`).click();
  await waitFor(async () => assert.equal(await page.locator(`.graph-map-node[data-node-id="${notes[2].id}"]`).count(), 0));
  const edge = page.locator(`.graph-map-edge-group[data-edge-from="${notes[0].id}"][data-edge-to="${notes[1].id}"]`);
  await edge.focus();
  await edge.press("Enter");
  await page.locator(`.graph-selection-panel [data-open-note="${notes[1].id}"]`).click();
  await page.waitForFunction(id => window.__prototypeState.module === "explorer" && window.__prototypeState.selectedFileId === id, notes[1].id);
  await page.locator('.rail-btn[data-module="graph"]').click();
  await waitFor(async () => {
    assert.equal(await page.evaluate(() => window.__prototypeState.selectedFileId), notes[0].id);
    assert.equal(await page.locator(`.graph-map-node[data-node-id="${notes[2].id}"]`).count(), 0);
    assert.ok(await page.locator(".graph-selection-panel.is-edge").isVisible());
  });
});

for (const input of ["keyboard", "touch"]) {
  test(`graph filters and endpoint navigation work with ${input}`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { apiBase, webBase } = stack;
    const create = async title => (await postJson(apiBase, "/api/v1/notes", {
      directoryId: "dir_original_default", body: `# ${title}\n\n独立观点。`
    })).json.item;
    const source = await create("导航来源"), target = await create("导航目标"), counter = await create("反例目标");
    for (const [note, relationType] of [[target, "supports"], [counter, "contradicts"]]) {
      const result = await postJson(apiBase, `/api/v1/notes/${source.id}/relations`, {
        toNoteId: note.id, relationType, rationale: `关系依据：${note.title}`
      });
      assert.equal(result.status, 201);
    }
    const context = await stack.page.context().browser().newContext({
      viewport: { width: input === "touch" ? 390 : 1366, height: 900 }, hasTouch: input === "touch"
    });
    t.after(() => context.close());
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
    const activate = async locator => {
      if (input === "touch") await locator.tap();
      else { await locator.focus(); await locator.press("Enter"); }
    };
    await activate(page.locator('.rail-btn[data-module="graph"]'));
    await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
    const node = page.locator(`.graph-map-node[data-node-id="${source.id}"]`);
    await activate(node);
    await page.locator(".graph-selection-panel", { hasText: source.title }).waitFor();
    await activate(page.locator("[data-graph-selection-close]").first());

    const filter = page.locator("#graphRelationTypeFilter");
    await filter.selectOption("supports");
    const edge = page.locator(`.graph-map-edge-group[data-edge-from="${source.id}"][data-edge-to="${target.id}"]`);
    await waitFor(async () => {
      assert.equal(await edge.count(), 1);
      assert.equal(await page.locator(`.graph-map-edge-group[data-edge-to="${counter.id}"]`).count(), 0);
    });
    await activate(edge);
    const panel = page.locator(".graph-selection-panel");
    await panel.waitFor();
    assert.match(await panel.textContent(), /导航来源/);
    assert.match(await panel.textContent(), /导航目标/);
    assert.match(await panel.textContent(), /关系依据/);
    await activate(panel.locator(`[data-open-note="${target.id}"]`));
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, target.id);
    await activate(page.locator('.rail-btn[data-module="graph"]'));
    assert.ok(await panel.isVisible());
    await activate(panel.locator(`[data-open-note="${source.id}"]`));
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, source.id);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(pageErrors, []);
  });
}

for (const writingReady of [false, true]) {
test(`graph directory scope saves the selected network as a theme${writingReady ? " and continues writing" : ""}`, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase, vaultPath } = stack;
  const directory = async (title, parentDirectoryId, segments) => {
    const result = await postJson(apiBase, "/api/v1/directories", {
      title, parentDirectoryId, directoryType: "custom", maxNotes: 500,
      fsPath: path.join(vaultPath, "notes", "original", ...segments)
    });
    assert.equal(result.status, 201, JSON.stringify(result.json));
    return result.json.item;
  };
  const parent = await directory("关联范围", "dir_original_default", ["navigation-scope"]);
  const child = await directory("子目录", parent.id, ["navigation-scope", "child"]);
  const create = async (title, directoryId) => (writingReady
    ? await createWritingReadyPermanentNote(apiBase, {
      title, directoryId, body: `# ${title}\n\n关联的理由需要可追溯。`,
      thesis: "关联的理由需要可追溯。", threeLineSummary: ["明确判断。", "说明依据。", "讨论边界。"],
      boundaryOrCounterpoint: "相似主题并不自动构成支持关系。"
    })
    : await postJson(apiBase, "/api/v1/notes", { directoryId, body: `# ${title}\n\n观点。` })).json.item;
  const source = await create("范围来源", parent.id), target = await create("范围目标", parent.id);
  const descendant = await create("子目录观点", child.id), outside = await create("范围之外", "dir_original_default");
  for (const note of [target, descendant]) {
    assert.equal((await postJson(apiBase, `/api/v1/notes/${source.id}/relations`, {
      toNoteId: note.id, relationType: "supports", rationale: "共同回答一个问题。"
    })).status, 201);
  }
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-original"]').click();
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${parent.id}"]`).click();
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
  for (const note of [source, target, descendant]) {
    await page.locator(`.graph-map-node[data-node-id="${note.id}"]`).waitFor();
  }
  assert.equal(await page.locator(`.graph-map-node[data-node-id="${outside.id}"]`).count(), 0);
  await page.locator(`.graph-map-node[data-node-id="${source.id}"]`).click();
  const theme = page.locator('[data-graph-create-theme-index]:not([disabled]):visible').first();
  await theme.click();
  await page.locator("#graphThemeQuestion").fill("关联的理由怎样帮助写作？");
  await page.locator('[data-graph-theme-confirmation-form] button[type="submit"]').click();
  await waitFor(async () => {
    const indexes = await fetchJson(apiBase, `/api/v1/index-cards?directoryId=${parent.id}&includeDescendants=true&indexType=topic&limit=12`);
    assert.equal(indexes.status, 200);
    const theme = indexes.json.items?.find(item => [source.id, target.id, descendant.id]
      .every(id => item.item_note_ids?.includes(id)));
    assert.ok(theme, JSON.stringify(indexes.json));
    assert.ok(!theme.item_note_ids.includes(outside.id));
  });
  if (writingReady) {
    await page.waitForFunction(() => window.__prototypeState.module === "writing");
    await waitFor(async () => {
      assert.match(await page.locator("#writingBasketSummary").textContent(), /已选 3 条/);
      const ids = await page.locator('.writing-note-card.selected[data-writing-note-id]').evaluateAll(nodes => nodes.map(node => node.dataset.writingNoteId));
      for (const note of [source, target, descendant]) assert.ok(ids.includes(note.id), JSON.stringify(ids));
      assert.ok(!ids.includes(outside.id));
    });
  }
});
}
