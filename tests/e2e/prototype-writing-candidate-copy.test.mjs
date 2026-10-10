import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";
import { captureWritingSources } from "./prototype-writing-topic-repair-flow-helpers.mjs";
import { createWritingScopeDirectory, createWritingScopeNote, openWritingScopeCandidates, visibleWritingCandidateIds } from "./prototype-writing-scope-flow-helpers.mjs";

test("visible writing candidates include eligible notes in the current directory and descendants and exclude drafts and outside notes", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  const directory = await createWritingScopeDirectory(stack, "当前材料", "candidate-scope");
  const child = await createWritingScopeDirectory(stack, "子目录材料", "candidate-scope/child", directory.id);
  const first = await createWritingScopeNote(stack, directory.id, "当前目录的判断");
  const nested = await createWritingScopeNote(stack, child.id, "子目录的判断");
  const outside = await createWritingScopeNote(stack, "dir_original_default", "范围外的判断");
  const draft = await postJson(apiBase, "/api/v1/notes", { directoryId: directory.id, body: "# 仍在整理的材料\n\n尚未确认。" });
  assert.equal(draft.status, 201);
  const assertSourcesUnchanged = await captureWritingSources(stack, [first, nested, outside, draft.json.item]);
  let aiExecutions = 0;
  page.on("request", req => { if (req.method() === "POST" && new URL(req.url()).pathname === "/api/v1/writing/ai-analysis") aiExecutions++; });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-action="quick-original"]').click();
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${directory.id}"]`).click();
  await page.locator('.rail-btn[data-module="writing"]').click();
  await openWritingScopeCandidates(page);
  await waitFor(async () => assert.deepEqual(await visibleWritingCandidateIds(page), [first.id, nested.id].sort()));
  assert.doesNotMatch(await page.locator("#writingCandidateList").innerText(), /写作篮|脚手架|wp_|范围外的判断|仍在整理的材料/);
  for (const note of [first, nested]) await page.locator(`#writingCandidateList [data-writing-action="add"][data-writing-note-id="${note.id}"]`).click();
  await waitFor(async () => {
    assert.deepEqual((await page.locator("#writingBasketList article[data-writing-note-id]").evaluateAll(cards => cards.map(card => card.getAttribute("data-writing-note-id")))).sort(), [first.id, nested.id].sort());
    assert.equal(await page.locator("#writingRelatedNotesCount").innerText(), "2");
  });
  assert.equal(await page.locator(`#writingBasketList [data-writing-action="remove"][data-writing-note-id="${outside.id}"]`).count(), 0);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/index-cards?limit=50")).json.items, []);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  await assertSourcesUnchanged(); assert.equal(aiExecutions, 0);
});
