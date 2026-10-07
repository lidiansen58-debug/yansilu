import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { optionalPlaywright, startPrototypeStack, waitFor, fetchJson, postJson } from "./prototype-copy-test-helpers.mjs";

async function snapshot(root) {
  const files = (await fs.readdir(root, { recursive: true, withFileTypes: true })).filter(entry => entry.isFile());
  const entries = await Promise.all(files.map(async entry => {
    const absolute = path.join(entry.parentPath, entry.name);
    return [path.relative(root, absolute), await fs.readFile(absolute)];
  }));
  return entries.sort(([left], [right]) => left.localeCompare(right));
}

async function assertFits(page, selector) {
  await waitFor(async () => {
    const sizes = await page.evaluate(selector => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      return { x: rect?.x, y: rect?.y, width: rect?.width, height: rect?.height, viewportWidth: innerWidth, viewportHeight: innerHeight, scrollWidth: document.documentElement.scrollWidth };
    }, selector);
    assert.ok(sizes.width > 0 && sizes.height > 0 && sizes.x >= 0 && sizes.y >= 0 && sizes.x + sizes.width <= sizes.viewportWidth + 1 && sizes.y + sizes.height <= sizes.viewportHeight + 1, JSON.stringify(sizes));
    assert.ok(sizes.scrollWidth <= sizes.viewportWidth + 1, JSON.stringify(sizes));
  });
}

for (const width of [1366, 390, 320]) {
  test(`import preview, selection, cancellation, confirmation and Markdown export remain clear at ${width}px`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") {
      t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e.");
      return;
    }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, vaultPath } = stack;
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const source = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-import-ux-source-"));
    const destination = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-import-ux-export-"));
    await fs.cp("tests/fixtures/imports/obsidian-realistic-vault", source, { recursive: true });
    const original = await snapshot(source);
    await fs.mkdir("output/playwright/settings-goal", { recursive: true });
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    await page.locator('.rail-btn[data-module="settings"]').click();
    if (width === 1366) await page.locator('[data-settings-item="import-export"]').click();
    else await page.locator("#settingsMobileItemSelect").selectOption("import-export");
    assert.equal(await page.locator("#settingsCardImportExport .import-card-head").count(), 0);
    assert.equal(await page.locator("#settingsCardImportExport .import-page-header").count(), 0);
    assert.equal(await page.locator("#btnImportConfirm").isVisible(), false);
    assert.equal(await page.locator(".import-compat-details").evaluate(node => node.open), false);
    assert.equal(await page.locator("#importDirectoryId").inputValue(), "dir_original_default");
    await assertFits(page, "#btnImportPreview");
    await page.locator("#importPath").fill(source);
    await page.screenshot({ path: `output/playwright/settings-goal/import-first-${width}.png` });
    assert.equal(await page.locator("#importOptions").inputValue(), "");
    await page.locator("#btnImportPreview").click();
    await page.locator('#importResult .result-card[data-result-stage="preview"]').waitFor();
    await page.locator("#btnImportConfirm").waitFor({ state: "visible" });
    const selectionOptions = page.locator(".candidate-selection-options");
    assert.equal(await selectionOptions.evaluate(node => node.open), false);
    assert.equal(await page.locator('[data-candidate-action="permanent"]').isVisible(), false);
    assert.equal(await page.locator(".candidate-checkbox").count(), 4);
    assert.equal(await page.locator("#importOperationResultModal #btnImportConfirm").count(), 1);
    await assertFits(page, "#btnImportConfirm");
    await page.screenshot({ path: `output/playwright/settings-goal/import-preview-initial-${width}.png` });
    const firstCheckbox = page.locator(".candidate-checkbox").first();
    const firstCandidateId = await firstCheckbox.getAttribute("data-candidate-id");
    await firstCheckbox.focus();
    await page.keyboard.press("Space");
    assert.equal(await page.locator(".candidate-checkbox:checked").count(), 3);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-candidate-id")), firstCandidateId);
    await page.keyboard.press("Space");
    assert.equal(await page.locator(".candidate-checkbox:checked").count(), 4);
    assert.equal((await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes")).json.items.length, 0);
    await page.locator('[data-candidate-action="none"]').click();
    assert.equal(await page.locator("#btnImportConfirm").isDisabled(), true);
    await page.evaluate(() => window.__prototypeImport.renderPage());
    assert.equal(await page.locator(".candidate-checkbox:checked").count(), 0);
    assert.equal(await page.locator('[data-candidate-action="none"]').isVisible(), true);
    assert.equal(await page.locator("#btnImportConfirm").isDisabled(), true);
    await page.locator('[data-candidate-action="all"]').click();
    assert.equal(await page.locator("#btnImportConfirm").isEnabled(), true);
    await page.screenshot({ path: `output/playwright/settings-goal/import-preview-${width}.png` });
    await selectionOptions.locator("summary").focus();
    await page.keyboard.press("Enter");
    await page.locator('[data-candidate-action="permanent"]').click();
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-candidate-action")), "permanent");
    assert.equal(await selectionOptions.evaluate(node => node.open), true);
    assert.equal(await page.locator(".candidate-checkbox:checked").count(), 1);
    await page.locator('[data-candidate-filter="excluded"]').click();
    assert.equal(await selectionOptions.evaluate(node => node.open), true);
    assert.equal(await page.locator(".candidate-checkbox").count(), 3);
    await page.locator('[data-candidate-filter="excluded"]').click();
    assert.equal(await selectionOptions.evaluate(node => node.open), true);
    assert.equal(await page.locator(".candidate-checkbox").count(), 4);
    await page.locator('[data-candidate-action="all"]').click();
    await selectionOptions.locator("summary").click();
    await page.locator("#btnImportConfirm").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#btnCloseImportOperationResult").evaluate(node => node === document.activeElement), true);
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.locator("#btnImportConfirm").evaluate(node => node === document.activeElement), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#importOperationResultModal").isVisible(), false);
    assert.equal(await page.locator("#btnImportPreview").evaluate(node => node === document.activeElement), true);
    await page.locator("#btnImportPreview").click();
    await page.locator("#btnImportConfirm").waitFor({ state: "visible" });
    await page.locator("[data-import-dismiss]").click();
    assert.equal(await page.locator("#importOperationResultModal").isVisible(), false);
    assert.equal(await page.locator("#btnImportPreview").evaluate(node => node === document.activeElement), true);
    assert.equal(await page.locator("#importPath").inputValue(), source);
    assert.equal((await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes")).json.items.length, 0);
    assert.deepEqual(await snapshot(source), original);

    await page.locator("#btnImportPreview").click();
    await page.locator("#btnImportConfirm").waitFor({ state: "visible" });
    await page.locator("#btnImportConfirm").click();
    await page.locator('#importResult .result-card[data-result-stage="confirm"]').waitFor();
    assert.equal(await page.locator("#importPreviewActions").isVisible(), false);
    assert.equal(await page.locator("#btnCloseImportOperationResult").evaluate(node => node === document.activeElement), true);
    const notes = await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes");
    assert.ok(notes.json.items.length > 0, JSON.stringify(notes.json));
    assert.deepEqual(await snapshot(source), original);
    await page.locator("#btnCloseImportOperationResult").click();
    await page.locator("#importWorkspaceTabExport").click();
    assert.equal(await page.locator("#exportCardMount").isVisible(), true);
    await assertFits(page, "#btnExportMarkdown");
    await page.locator("#exportTargetPath").fill(destination);
    assert.ok((await page.locator("#exportTargetHint").innerText()).includes(destination));
    await assertFits(page, "#btnExportMarkdown");
    await page.screenshot({ path: `output/playwright/settings-goal/export-first-${width}.png` });
    await page.locator("#btnExportMarkdown").click();
    await page.locator('#exportResult .result-card[data-result-stage="export_markdown"]').waitFor();
    assert.equal(await page.locator("#importPreviewActions").isVisible(), false);
    const exported = await snapshot(destination);
    assert.ok(exported.some(([file]) => file.endsWith(".md")));
    assert.ok(exported.some(([, content]) => content.toString("utf8").includes("Spacing helps memory")));
    await page.locator("#btnCloseImportOperationResult").click();
    const createdDirectory = await postJson(apiBase, "/api/v1/directories", {
      title: "Export child", parentDirectoryId: "dir_original_default", directoryType: "custom", fsPath: path.join(vaultPath, "notes/original/export-child")
    });
    assert.equal(createdDirectory.status, 201, JSON.stringify(createdDirectory.json));
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('.rail-btn[data-module="settings"]').click();
    if (width === 1366) await page.locator('[data-settings-item="import-export"]').click();
    else await page.locator("#settingsMobileItemSelect").selectOption("import-export");
    await page.locator("#importWorkspaceTabExport").click();
    await page.locator("#exportDirectoryId").selectOption(createdDirectory.json.item.id);
    await page.locator("#exportTargetPath").fill(destination);
    await page.evaluate(() => window.__prototypeImport.renderPage());
    assert.equal(await page.locator("#exportDirectoryId").inputValue(), createdDirectory.json.item.id);
    assert.equal(await page.locator("#exportTargetPath").inputValue(), destination);
    assert.deepEqual(errors, []);
  });
}
