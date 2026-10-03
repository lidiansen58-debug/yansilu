import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("Beta paper workspace saves human translation and explicitly confirmed permanent note through the UI", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, webBase, apiBase, vaultPath } = stack;
  await page.goto(`${webBase}/paper-workspace`, { waitUntil: "networkidle" });
  await page.locator('#paperIdInput').fill('paper_beta_ui');
  await page.locator('#paperTitleInput').fill('学习材料验收');
  await page.locator('#btnCreatePaperWorkspace').click();
  await waitFor(async () => assert.equal((await fetchJson(apiBase, '/api/v1/papers/paper_beta_ui')).json.item.title, '学习材料验收'));
  await page.locator('#notebookNameInput').fill('本地验收材料');
  await page.locator('#notebookSummaryInput').fill('Claim: retrieval practice improves delayed recall.');
  await page.locator('#btnAddNotebookDraft').click();
  await page.locator('[data-paper-candidate-id]').first().waitFor();
  await page.locator('[data-paper-candidate-id]').first().click();
  await page.locator('#translationParaphraseInput').fill('解释材料时，暴露出的缺口可以引导下一轮核对。');
  await page.locator('#translationRelationInput').fill('这为读书后的理解检验提供了一个步骤。');
  await page.locator('#translationBoundaryInput').fill('初学者仍需先阅读材料，不能跳过阅读。');
  await page.locator('#btnSaveTranslation').click();
  await waitFor(async () => assert.equal((await fetchJson(apiBase, '/api/v1/papers/paper_beta_ui')).json.item.translations.length, 1));
  await page.locator('#btnCreatePermanentCandidate').click();
  let candidate;
  await waitFor(async () => {
    candidate = (await fetchJson(apiBase, '/api/v1/papers/paper_beta_ui')).json.item.permanentCandidates[0];
    assert.ok(candidate?.id);
  });
  assert.equal(candidate.authorship.user_confirmed, false);
  await assert.rejects(fs.access(path.join(vaultPath, 'notes', 'permanent', `${candidate.id}.md`)));
  await page.locator('#confirmAuthorshipInput').check();
  await page.locator('#btnSavePermanentNote').click();
  const saved = await waitFor(async () => {
    const note = (await fetchJson(apiBase, `/api/v1/notes/${candidate.id}`)).json.item;
    assert.ok(note?.authorship?.user_confirmed);
    assert.match(note.body, /解释材料时/);
    return note;
  });
  assert.equal(saved.status, 'draft', 'Missing citation locator must keep the saved note a draft');
  assert.match(await fs.readFile(path.join(vaultPath, saved.markdownPath), 'utf8'), /初学者仍需先阅读材料/);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#paperIdInput').fill('paper_beta_ui');
  await page.locator('#btnLoadPaperWorkspace').click();
  await page.locator(`[data-paper-permanent-candidate-id="${candidate.id}"]`).waitFor();
  assert.equal((await fetchJson(apiBase, '/api/v1/papers/paper_beta_ui')).json.item.permanentCandidates[0].savedPermanentNoteId, saved.id);
});
