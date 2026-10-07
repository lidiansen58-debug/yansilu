import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { optionalPlaywright, startPrototypeStack, fetchJson } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 320]) {
  test(`refresh resumes the same full preview and selection without another import POST (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, vaultPath } = stack;
    const source = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-import-resume-source-"));
    t.after(() => fs.rm(source, { recursive: true, force: true }));
    const originals = new Map();
    for (let i = 1; i <= 25; i++) {
      const number = String(i).padStart(2, "0");
      const body = `---\ntype: permanent\n---\n# 判断 ${number}\n\n## 一句话论点\n在第 ${number} 个情境中应用结论之前，要先核对它成立的条件。\n`;
      originals.set(`${number}.md`, body);
      await fs.writeFile(path.join(source, `${number}.md`), body, "utf8");
    }
    let previews = 0, confirmations = 0;
    page.on("request", request => {
      if (request.method() !== "POST") return;
      if (request.url().includes("/imports/preview")) previews++;
      if (/\/imports\/[^/]+\/confirm/.test(request.url())) confirmations++;
    });
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    const settings = async () => {
      await page.locator('.rail-btn[data-module="settings"]').click();
      if (width === 1366) await page.locator('[data-settings-item="import-export"]').click();
      else await page.locator("#settingsMobileItemSelect").selectOption("import-export");
    };
    await settings();
    assert.equal(await page.locator("#btnImportRepreview").isVisible(), false);
    await page.locator("#importPath").fill(source);
    const response = page.waitForResponse(response => response.url().includes("/imports/preview") && response.request().method() === "POST");
    await page.locator("#btnImportPreview").click();
    const preview = await (await response).json();
    await page.locator("#btnImportConfirm:visible").waitFor();
    const excluded = preview.candidatePreview.permanentNotes[12];
    await page.locator('[data-candidate-page-select]').selectOption("2");
    await page.locator(`.candidate-checkbox[data-candidate-id="${excluded.id}"]`).uncheck();
    await page.locator("#btnCloseImportOperationResult").click();
    await page.reload({ waitUntil: "networkidle" });
    await settings();
    assert.equal(await page.locator("#btnImportPreview").innerText(), "继续核对");
    const iconRect = await page.locator("#btnImportRepreview").boundingBox();
    assert.ok(iconRect.width >= 44 && iconRect.height >= 44);
    const primaryRect = await page.locator("#btnImportPreview").boundingBox();
    assert.ok(primaryRect.x + primaryRect.width <= iconRect.x && iconRect.x + iconRect.width <= width);
    assert.equal(await page.locator(".import-actions .primary:visible").count(), 1);
    const screenshots = path.resolve("output/playwright/core-import-resume");
    await fs.mkdir(screenshots, { recursive: true });
    await page.screenshot({ path: path.join(screenshots, `resume-entry-${width}.png`), fullPage: true });
    await page.locator("#btnImportPreview").focus();
    await page.keyboard.press("Enter");
    await page.locator("#btnImportConfirm:visible").waitFor();
    assert.equal(await page.locator("#importRecordId").inputValue(), preview.importRecordId);
    assert.equal(previews, 1);
    assert.equal(confirmations, 0);
    assert.match(await page.locator("#btnImportConfirm").innerText(), /49\/50/);
    assert.equal(await page.locator("#importResult .result-status").innerText(), "待确认");
    await page.locator('[data-candidate-page-select]').selectOption("2");
    assert.equal(await page.locator(`.candidate-checkbox[data-candidate-id="${excluded.id}"]`).isChecked(), false);
    const record = (await fetchJson(apiBase, `/api/v1/imports/${preview.importRecordId}`)).json.importRecord;
    assert.equal(record.candidatePreview.permanentNotes.length, 25);
    assert.equal((await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes")).json.items.length, 0);
    const confirmResponse = page.waitForResponse(response => /\/imports\/[^/]+\/confirm/.test(response.url()) && response.request().method() === "POST");
    await page.locator("#btnImportConfirm").click();
    const confirmation = await (await confirmResponse).json();
    assert.deepEqual(confirmation.result.created, { sources: 25, literatureNotes: 0, permanentNotes: 24 });
    assert.equal(confirmations, 1);
    for (const item of confirmation.result.createdFiles) assert.ok((await fs.readFile(path.join(vaultPath, item.path))).length);
    await page.locator('#importResult .result-card[data-result-stage="confirm"]').waitFor();
    await page.locator("#btnCloseImportOperationResult").click();
    assert.equal(await page.locator("#btnImportPreview").evaluate(node => node === document.activeElement), true);
    await page.reload({ waitUntil: "networkidle" });
    await settings();
    assert.equal(await page.locator("#btnImportPreview").innerText(), "预览笔记");
    assert.equal(await page.locator("#importOperationResultModal").isVisible(), false);
    assert.equal(previews, 1);
    assert.equal(confirmations, 1);
    for (const [file, body] of originals) assert.equal(await fs.readFile(path.join(source, file), "utf8"), body);
  });
}

test("legacy client cache upgrades through GET, survives read failure, and completed lost-response never reimports (320px)", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  const source = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-import-legacy-source-"));
  t.after(() => fs.rm(source, { recursive: true, force: true }));
  const original = number => `---\ntype: permanent\n---\n# 条件 ${number}\n\n## 一句话论点\n使用第 ${number} 条判断之前，需要检查具体情境中的限制条件。\n`;
  for (let i = 1; i <= 25; i++) await fs.writeFile(path.join(source, `${i}.md`), original(i), "utf8");
  let previews = 0, confirmations = 0;
  page.on("request", req => {
    if (req.method() !== "POST") return;
    if (req.url().includes("/imports/preview")) previews++;
    if (/\/imports\/[^/]+\/confirm/.test(req.url())) confirmations++;
  });
  await page.setViewportSize({ width: 320, height: 844 });
  const settings = async () => {
    await page.locator('.rail-btn[data-module="settings"]').click();
    await page.locator("#settingsMobileItemSelect").selectOption("import-export");
  };
  await settings();
  await page.locator("#importPath").fill(source);
  const firstResponse = page.waitForResponse(r => r.url().includes("/imports/preview") && r.request().method() === "POST");
  await page.locator("#btnImportPreview").click();
  const preview = await (await firstResponse).json();
  await page.locator("#btnImportConfirm:visible").waitFor();
  await page.locator("#btnCloseImportOperationResult").click();
  const excluded = preview.candidatePreview.permanentNotes[0].id;
  // Reproduce an old installed client's actual local cache, without changing live UI state.
  const key = await page.evaluate(({ vaultPath, excluded }) => {
    const key = `yansilu:import-workspace:v1:${encodeURIComponent(vaultPath)}`;
    const saved = JSON.parse(localStorage.getItem(key));
    delete saved.previewRequest;
    for (const group of ["sources", "literatureNotes", "permanentNotes"]) saved.preview.candidatePreview[group] = (saved.preview.candidatePreview[group] || []).slice(0, 12);
    saved.preview.candidatePreview.truncated = true;
    saved.selectedIds = [...saved.preview.candidatePreview.sources, ...saved.preview.candidatePreview.permanentNotes].map(item => item.id).filter(id => id !== excluded);
    saved.selectedIds.push(saved.preview.candidateSelection.permanentNotes[12]);
    localStorage.setItem(key, JSON.stringify(saved));
    return key;
  }, { vaultPath, excluded });
  await page.reload({ waitUntil: "networkidle" });
  await settings();
  const recordPattern = `**/api/v1/imports/${preview.importRecordId}`;
  const unavailable = route => route.fulfill({ status: 503, json: { message: "Local service temporarily unavailable" } });
  await page.route(recordPattern, unavailable);
  await page.locator("#btnImportPreview").click();
  await page.locator('#importResult [data-result-stage="preview_error"]').waitFor();
  assert.equal(previews, 1);
  assert.equal(confirmations, 0);
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).selectedIds.length, key), 24);
  await page.locator("#btnCloseImportOperationResult").click();
  await page.unroute(recordPattern, unavailable);
  await page.locator("#btnImportPreview").click();
  await page.locator("#btnImportConfirm:visible").waitFor();
  assert.match(await page.locator("#btnImportConfirm").innerText(), /23\/50/);
  assert.equal(await page.locator(`.candidate-checkbox[data-candidate-id="${excluded}"]`).isChecked(), false);
  await page.locator('[data-candidate-page-select]').selectOption("2");
  const newlyVisible = preview.candidatePreview.permanentNotes[12].id;
  assert.equal(await page.locator(`.candidate-checkbox[data-candidate-id="${newlyVisible}"]`).isChecked(), false);
  assert.equal(previews, 1);
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).preview.candidatePreview.permanentNotes.length, key), 25);
  const shots = path.resolve("output/playwright/core-import-resume");
  await fs.mkdir(shots, { recursive: true });
  await page.screenshot({ path: path.join(shots, "legacy-restored-320.png"), fullPage: true });
  await page.locator("#btnCloseImportOperationResult").click();

  await fs.writeFile(path.join(source, "26.md"), original(26), "utf8");
  const rescanResponse = page.waitForResponse(r => r.url().includes("/imports/preview") && r.request().method() === "POST");
  await page.getByRole("button", { name: "重新预览", exact: true }).click();
  const rescanned = await (await rescanResponse).json();
  await page.locator("#btnImportConfirm:visible").waitFor();
  assert.notEqual(rescanned.importRecordId, preview.importRecordId);
  assert.match(await page.locator("#btnImportConfirm").innerText(), /52\/52/);
  assert.equal(previews, 2);

  const newRecordPattern = `**/api/v1/imports/${rescanned.importRecordId}`;
  await page.route(newRecordPattern, unavailable);
  await page.route(`**/api/v1/imports/${rescanned.importRecordId}/confirm`, async route => {
    const response = await route.fetch();
    assert.equal(response.status(), 200);
    await route.fulfill({ status: 503, json: { message: "Confirmation response lost after write" } });
  });
  await page.locator("#btnImportConfirm").click();
  await page.locator('#importResult [data-result-stage="confirm_pending"]').waitFor();
  const completed = (await fetchJson(apiBase, `/api/v1/imports/${rescanned.importRecordId}`)).json.importRecord;
  assert.equal(completed.status, "completed");
  assert.equal(completed.confirmResult.createdFiles.length, 52);
  for (const file of completed.confirmResult.createdFiles) assert.ok((await fs.readFile(path.join(vaultPath, file.path))).length);
  await page.unrouteAll({ behavior: "wait" });
  await page.reload({ waitUntil: "networkidle" });
  await settings();
  await page.locator("#btnImportPreview").click();
  await page.locator('#importResult [data-result-stage="record"]').waitFor();
  assert.equal(await page.locator("#btnImportConfirm:visible").count(), 0);
  assert.equal(previews, 2);
  assert.equal(confirmations, 1);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
  await page.screenshot({ path: path.join(shots, "completed-recovered-320.png"), fullPage: true });
  await page.locator("#btnCloseImportOperationResult").click();
  await page.reload({ waitUntil: "networkidle" });
  await settings();
  assert.equal(await page.locator("#btnImportPreview").innerText(), "预览笔记");
  assert.equal(confirmations, 1);
  for (let i = 1; i <= 26; i++) assert.equal(await fs.readFile(path.join(source, `${i}.md`), "utf8"), original(i));
});

test("a delayed resume cannot reopen the old preview after editing its source (1366px)", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page } = stack;
  const source = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-import-delayed-source-"));
  t.after(() => fs.rm(source, { recursive: true, force: true }));
  await fs.writeFile(path.join(source, "note.md"), "# 一个需要再考虑的问题\n\n先记下，再检查它的适用条件。", "utf8");
  const settings = async () => {
    await page.locator('.rail-btn[data-module="settings"]').click();
    await page.locator('[data-settings-item="import-export"]').click();
  };
  await settings();
  await page.locator("#importPath").fill(source);
  const response = page.waitForResponse(r => r.url().includes("/imports/preview") && r.request().method() === "POST");
  await page.locator("#btnImportPreview").click();
  const preview = await (await response).json();
  await page.locator("#btnImportConfirm:visible").waitFor();
  await page.locator("#btnCloseImportOperationResult").click();
  await page.reload({ waitUntil: "networkidle" });
  await settings();
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const barrier = new Promise(resolve => { release = resolve; });
  t.after(() => release?.());
  await page.route(`**/api/v1/imports/${preview.importRecordId}`, async route => {
    entered(); await barrier; await route.continue();
  });
  await page.locator("#btnImportPreview").click();
  await started;
  await page.locator("#importPath").fill(`${source}-other`);
  const oldRead = page.waitForResponse(r => r.url().endsWith(`/imports/${preview.importRecordId}`));
  release();
  await oldRead;
  await page.waitForFunction(() => !document.getElementById("btnImportPreview").disabled);
  assert.equal(await page.locator("#btnImportPreview").innerText(), "预览笔记");
  assert.equal(await page.locator("#importOperationResultModal").isVisible(), false);
  assert.equal(await page.locator("#importPath").inputValue(), `${source}-other`);
});
