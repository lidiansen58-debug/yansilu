import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createWritingReadyPermanentNote, fetchJson, postJson, waitFor } from "./prototype-copy-test-helpers.mjs";

async function fixture(stack, { unloaded = false, beforeTarget = async () => {} } = {}) {
  const { apiBase, vaultPath } = stack;
  let targetDirectory = "dir_original_default";
  if (unloaded) {
    const created = await postJson(apiBase, "/api/v1/directories", {
      title: "Relation Search Child", parentDirectoryId: "dir_original_default", directoryType: "custom",
      fsPath: path.join(vaultPath, "notes", "original", "relation-search-child"), maxNotes: 500
    });
    assert.equal(created.status, 201);
    targetDirectory = created.json.item.id;
  }
  const create = async (title, directoryId) => {
    const response = await createWritingReadyPermanentNote(apiBase, {
      title, directoryId, body: `# ${title}\n\n外部关联应保留双方笔记的正文，并说明两条判断之间的关系。`,
      thesis: "关联理由应当明确而且可以回到原笔记核对。",
      threeLineSummary: ["保留双方笔记的原始观点。", "关联理由说明判断之间的联系。", "后续写作可以回到原笔记核对。"],
      boundaryOrCounterpoint: "没有依据时不能把相关当成支持。"
    });
    const note = response.json.item;
    assert.equal(note.status, "active");
    assert.equal(note.authorship.user_confirmed, true);
    return note;
  };
  const source = await create(unloaded ? "Relation Search Source" : "Writing Source", "dir_original_default");
  if (unloaded) {
    // Startup now loads existing notes eagerly. Add this real API note after opening
    // the source so search must discover a target absent from the page's loaded data.
    await openSidebar(stack, source);
    await beforeTarget();
  }
  const target = await create(unloaded ? "Remote Relation Target" : "Writing Target", targetDirectory);
  const notes = [source, target];
  const originals = await Promise.all(notes.map(note => fs.readFile(path.join(vaultPath, note.markdownPath))));
  return { source, target, targetDirectory, assertSources: async () => {
    for (let index = 0; index < notes.length; index++) {
      const current = (await fetchJson(apiBase, `/api/v1/notes/${notes[index].id}`)).json.item;
      for (const key of ["title", "body", "thesis", "threeLineSummary", "authorship", "boundaryOrCounterpoint", "distillationStatus", "status", "markdownPath"]) {
        assert.deepEqual(current[key], notes[index][key], key);
      }
      assert.deepEqual(await fs.readFile(path.join(vaultPath, notes[index].markdownPath)), originals[index]);
    }
  } };
}

async function openSidebar({ page, webBase }, source) {
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-original"]').click();
  await page.locator(`.explorer-item[data-kind="file"][data-id="${source.id}"]`).click();
  await waitFor(async () => assert.match(await page.locator("#wysiwygHost:visible").innerText(), /外部关联应保留/));
  await page.locator("#btnShowRelated").click();
  await page.locator('#relatedPanel [data-permanent-workspace-tab="relations"]:visible').click();
  await page.locator('#relatedPanel [data-relation-tab="external"]').click();
}

async function assertGraph({ page }, notes, relation = null) {
  await page.locator("#btnHideRelated").click();
  await page.locator('.rail-btn[data-module="graph"]').click();
  await waitFor(async () => {
    assert.equal(await page.locator("#graphCanvas .graph-map-node").count(), notes.length);
    for (const note of notes) assert.equal(await page.locator(`#graphCanvas .graph-map-node[data-node-id="${note.id}"]`).count(), 1);
    assert.equal(await page.locator("#graphCanvas .graph-map-edge-group").count(), relation ? 1 : 0);
    if (relation) {
      const edge = page.locator(`#graphCanvas .graph-map-edge-group[data-edge-id="${relation.id}"]`);
      assert.equal(await edge.getAttribute("data-edge-from"), relation.fromNoteId);
      assert.equal(await edge.getAttribute("data-edge-to"), relation.toNoteId);
      assert.equal(await edge.getAttribute("data-edge-relation-type"), relation.relationType);
      assert.equal(await edge.getAttribute("data-edge-rationale"), relation.rationale);
    }
  });
}

export async function runVisibleRelationCreateFlow(stack, { unloaded = false } = {}) {
  const { page, apiBase } = stack;
  const requests = [];
  page.on("request", request => { if (request.method() === "GET") requests.push(new URL(request.url())); });
  let targetCreatedAfter = 0;
  const { source, target, targetDirectory, assertSources } = await fixture(stack, { unloaded, beforeTarget: async () => { targetCreatedAfter = requests.length; } });
  if (!unloaded) await openSidebar(stack, source);
  await page.locator('#relatedPanel [data-permanent-relation-action="open"][data-permanent-relation-mode="manual"]:visible').click();
  const workspace = page.locator("[data-permanent-relation-workspace]");
  await workspace.waitFor({ state: "visible" });
  assert.match(await workspace.innerText(), /关联到哪条笔记/);
  if (unloaded) {
    assert.equal(await page.locator(`.explorer-item[data-kind="file"][data-id="${target.id}"]`).count(), 0);
    assert.equal(await page.evaluate(id => window.__prototypeState.notes.some(note => note.id === id && note.bodyLoaded === true), target.id), false);
    assert.ok(!requests.slice(targetCreatedAfter).some(url => url.pathname === `/api/v1/notes/${target.id}` || url.pathname === `/api/v1/directories/${targetDirectory}/notes`));
  }
  const response = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/v1/notes/search" && url.searchParams.get("q") === target.title;
  });
  await workspace.locator("[data-permanent-relation-target-search]").fill(target.title);
  const searched = await response;
  assert.equal(searched.status(), 200);
  assert.ok((await searched.json()).items.some(note => note.id === target.id));
  const searchUrl = new URL(searched.url());
  assert.equal(searchUrl.searchParams.get("rootDirectoryId"), "dir_original_default");
  assert.equal(searchUrl.searchParams.get("excludeNoteId"), source.id);
  await workspace.locator(`[data-permanent-relation-manual-target="${target.id}"]`).click();
  const type = unloaded ? "bridges" : "supports";
  if (unloaded) {
    await workspace.locator(".permanent-relation-more-types > summary").click();
    await workspace.locator('[data-permanent-relation-field="relationType"]:visible').selectOption(type);
  } else await workspace.locator('[data-permanent-relation-type-choice="supports"]').click();
  const rationale = unloaded ? "SQLite search can connect the current note to a target that was not loaded in the file list." : "This source note gives the target one explicit supporting reason, with a boundary the draft can keep visible.";
  await workspace.locator('[data-permanent-relation-field="rationale"]').fill(rationale);
  await workspace.locator('button[type="submit"]').click();
  await workspace.locator(".permanent-relation-result").waitFor();
  const read = async () => (await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`)).json.item;
  const saved = (await read()).outgoingLinks;
  assert.equal(saved.length, 1);
  const relation = saved[0];
  assert.equal(relation.toNoteId, target.id);
  assert.equal(relation.fromNoteId, source.id);
  assert.equal(relation.relationType, type);
  assert.equal(relation.rationale, rationale);
  assert.ok((await fetchJson(apiBase, `/api/v1/notes/${target.id}/relations`)).json.item.backlinks.some(link => link.id === relation.id));
  await workspace.locator('[data-permanent-relation-action="complete"]').click();
  await workspace.waitFor({ state: "detached" });
  await openSidebar(stack, source);
  assert.match(await page.locator("#relatedPanel").innerText(), new RegExp(target.title));
  assert.ok((await page.locator("#relatedPanel").innerText()).includes(rationale));
  assert.deepEqual((await read()).outgoingLinks, saved);
  await assertGraph(stack, [source, target], relation);
  await assertSources();
}

export async function runVisibleRelationEditFlow(stack) {
  const { page, apiBase } = stack;
  const { source, target, assertSources } = await fixture(stack);
  const created = await postJson(apiBase, `/api/v1/notes/${source.id}/relations`, {
    toNoteId: target.id, relationType: "supports", rationale: "原始关系理由用于编辑测试", insightQuestion: "原始问题是什么？", status: "draft", confidence: 1
  });
  assert.equal(created.status, 201);
  const id = created.json.item.id;
  const read = async () => (await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`)).json.item;
  await openSidebar(stack, source);
  const edit = () => page.locator(`#relatedPanel [data-relation-action="open-edit"][data-relation-id="${id}"]:visible`).click();
  await edit();
  const workspace = page.locator("[data-permanent-relation-workspace]");
  await workspace.waitFor({ state: "visible" });
  assert.match(await workspace.innerText(), /编辑关联/);
  assert.match(await workspace.innerText(), /为什么/);
  assert.equal(await workspace.locator('input[name="insightQuestion"]').inputValue(), "原始问题是什么？");
  await workspace.locator('[data-permanent-relation-type-choice="qualifies"]').click();
  const rationale = "编辑后的关系理由应说明为什么这条关系成立。";
  await workspace.locator('textarea[name="rationale"]').fill(rationale);
  await workspace.locator('button[type="submit"]').click();
  await workspace.locator(".permanent-relation-result").waitFor();
  assert.match(await workspace.innerText(), /关系已更新/);
  assert.match(await workspace.innerText(), /限定/);
  const updated = await read();
  assert.equal(updated.outgoingLinks.length, 1);
  const relation = updated.outgoingLinks[0];
  assert.deepEqual([relation.id, relation.fromNoteId, relation.toNoteId, relation.relationType, relation.status, relation.rationale, relation.insightQuestion], [id, source.id, target.id, "qualifies", "draft", rationale, "原始问题是什么？"]);
  await workspace.locator('[data-permanent-relation-action="complete"]').click();
  await openSidebar(stack, source);
  assert.ok((await page.locator("#relatedPanel").innerText()).includes(rationale));
  await edit();
  assert.equal(await workspace.locator('textarea[name="rationale"]').inputValue(), rationale);
  assert.equal(await workspace.locator('[data-permanent-relation-type-choice="qualifies"]').getAttribute("aria-pressed"), "true");
  const deletes = [];
  page.on("request", request => { if (request.method() === "DELETE") deletes.push(request.url()); });
  page.once("dialog", async dialog => { assert.match(dialog.message(), /删除|解除/); await dialog.dismiss(); });
  await workspace.locator('[data-relation-action="delete"]').click();
  assert.deepEqual(await read(), updated);
  assert.deepEqual(deletes, []);
  assert.equal(await workspace.isVisible(), true);
  page.once("dialog", async dialog => { assert.match(dialog.message(), /删除|解除/); await dialog.accept(); });
  await workspace.locator('[data-relation-action="delete"]').click();
  await workspace.waitFor({ state: "detached" });
  await waitFor(async () => {
    assert.deepEqual((await read()).outgoingLinks, []);
    assert.deepEqual((await fetchJson(apiBase, `/api/v1/notes/${target.id}/relations`)).json.item.backlinks, []);
  });
  assert.deepEqual(deletes, [`${apiBase}/api/v1/relations/${id}`]);
  assert.ok(!(await page.locator("#relatedPanel").innerText()).includes(rationale));
  await assertGraph(stack, [source, target]);
  await assertSources();
}
