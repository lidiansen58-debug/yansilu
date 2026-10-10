import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, postJson, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("a draft permanent note explains originality eligibility and only joins writing after explicit confirmation and a real check", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { apiBase, page, webBase, vaultPath } = stack;
  const created = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default", status: "draft", title: "确认自己的解释",
    body: "# 确认自己的解释\n\n解释与核对材料能够检验理解中的遗漏。中文 café 🌿。",
    thesis: "解释并核对依据能够发现理解中的遗漏。",
    threeLineSummary: ["解释判断可以发现遗漏。", "核对依据可以避免混淆。", "记录条件可以说明适用范围。"],
    distillationStatus: "confirmed", authorship: { user_confirmed: true, ai_assisted: false }
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const note = created.json.item, readNote = async () => (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item;
  const baseline = await readNote(), bytes = await fs.readFile(path.join(vaultPath, note.markdownPath));
  let checks = 0, aiExecutions = 0;
  page.on("request", request => {
    if (request.method() !== "POST") return;
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/v1/originality/check") checks++;
    if (pathname === "/api/v1/writing/ai-analysis") aiExecutions++;
  });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${note.id}"]`).click();
  await waitFor(async () => assert.match(await page.locator("#wysiwygHost:visible").innerText(), /解释与核对材料/));
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator('[data-writing-sidebar-action="related"]').click();
  const card = page.locator(`#writingBasketList article[data-writing-note-id="${note.id}"]`);
  assert.match(await card.innerText(), /未通过原创性检查.*检查通过后即可加入写作/);
  assert.doesNotMatch(await card.innerText(), /仍是 draft|写作篮只接受|scaffold/);
  await page.locator("#writingCandidateDetails > summary").click();
  assert.equal(await page.locator(`#writingCandidateList [data-writing-action="add"][data-writing-note-id="${note.id}"]`).count(), 0);
  let confirmations = 0;
  page.once("dialog", dialog => { confirmations++; return dialog.dismiss(); });
  await card.locator('[data-writing-action="prepare"]').click();
  await waitFor(async () => assert.match(await page.locator("#statusText").innerText(), /已取消.*未加入写作/, await card.innerText()));
  assert.equal(confirmations, 1);
  assert.deepEqual(await readNote(), baseline);
  assert.deepEqual(await fs.readFile(path.join(vaultPath, note.markdownPath)), bytes);
  assert.equal(checks, 0);
  page.once("dialog", async dialog => { confirmations++; assert.match(dialog.message(), /用自己的话.*不是直接摘抄/); await dialog.accept(); });
  await card.locator('[data-writing-action="prepare"]').click();
  await waitFor(async () => {
    const current = await readNote();
    assert.equal(current.status, "active"); assert.equal(current.originalityStatus, "pass");
    assert.equal(current.body, baseline.body); assert.equal(current.thesis, baseline.thesis);
    assert.deepEqual(current.threeLineSummary, baseline.threeLineSummary);
    assert.equal(current.authorship.user_confirmed, true);
    assert.equal(await page.locator(`#writingBasketList [data-writing-action="remove"][data-writing-note-id="${note.id}"]`).count(), 1);
  });
  assert.equal(checks, 1); assert.equal(confirmations, 2); assert.equal(aiExecutions, 0);
  assert.ok((await fs.readFile(path.join(vaultPath, note.markdownPath), "utf8")).includes(baseline.body));
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/index-cards?limit=50")).json.items, []);
});
