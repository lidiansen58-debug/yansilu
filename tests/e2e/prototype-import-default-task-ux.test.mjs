import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390, 320]) {
  for (const includePermanent of [true, false]) {
  test(`default ${includePermanent ? "guarded" : "ordinary"} import preserves source files and continues into a real judgment (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, vaultPath } = stack;
    page.setDefaultTimeout(12000);
    const source = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-default-import-"));
    t.after(() => fs.rm(source, { recursive: true, force: true }));
    const originals = new Map([
      ["reading.md", "# 读书交流记录\n\n松柏读书组发现：能够复述结论，不代表能解释结论成立的前提。\n"],
      ["claim.md", `${includePermanent ? "---\ntype: permanent\n---\n\n" : ""}# 检验理解的方法\n\n${includePermanent ? "## 一句话论点\n解释之后核对材料，才能发现理解的遗漏。\n\n## 原文\n" : ""}解释之后核对材料，才能发现理解的遗漏。\n`]
    ]);
    for (const [name, body] of originals) await fs.writeFile(path.join(source, name), body, "utf8");
    const assertSourceUnchanged = async () => {
      assert.deepEqual((await fs.readdir(source)).sort(), [...originals.keys()].sort());
      for (const [name, body] of originals) assert.equal(await fs.readFile(path.join(source, name), "utf8"), body);
    };
    const read = async id => {
      const response = await fetchJson(apiBase, `/api/v1/notes/${id}`);
      assert.equal(response.status, 200, JSON.stringify(response.json));
      return response.json.item;
    };
    const output = `output/playwright/core-default-import/${includePermanent ? "guarded" : "ordinary"}`;
    await fs.mkdir(output, { recursive: true });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    await page.locator('.rail-btn[data-module="settings"]').click();
    assert.equal(await page.locator("#importOperationResultModal").isVisible(), false, "Returning to settings must not reopen a completed result");
    if (width === 1366) await page.locator('[data-settings-item="import-export"]').click();
    else await page.locator("#settingsMobileItemSelect").selectOption("import-export");
    assert.equal(await page.locator(".import-compat-details").evaluate(el => el.open), false);
    assert.equal(await page.locator("#importOptions").inputValue(), "");
    if (width === 320 && !includePermanent) {
      await page.locator("#importPath").fill(path.join(source, "missing"));
      await page.locator("#btnImportPreview").click();
      await page.locator('#importResult .result-card[data-result-stage="preview"]').waitFor();
      assert.equal(await page.locator("#btnImportConfirm").isDisabled(), true);
      assert.match(await page.locator("#importResult .result-brief").innerText(), /没有可确认导入/);
      assert.match(await page.locator("#importResult .result-warnings").innerText(), /路径无法读取/);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#importPath").inputValue(), path.join(source, "missing"));
      await assertSourceUnchanged();
    }
    await page.locator("#importPath").fill(source);
    const previewResponse = page.waitForResponse(response => response.url().includes("/imports/preview") && response.request().method() === "POST");
    await page.locator("#btnImportPreview").click();
    const preview = await (await previewResponse).json();
    assert.deepEqual(preview.summary, { sources: 2, literatureNotes: 2, permanentNotes: includePermanent ? 1 : 0, warnings: includePermanent ? 1 : 0 });
    await page.locator("#btnImportConfirm:visible").waitFor();
    assert.equal(await page.locator(".candidate-checkbox").count(), includePermanent ? 5 : 4);
    assert.equal(await page.locator(".candidate-checkbox:checked").count(), 4);
    assert.equal(await page.locator(".candidate-checkbox:disabled").count(), includePermanent ? 1 : 0);
    if (includePermanent) assert.match(await page.locator("#importResult .result-brief").innerText(), /永久笔记暂不导入/);
    assert.equal((await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes")).json.items.length, 0);
    await assertSourceUnchanged();
    await page.screenshot({ path: `${output}/preview-${width}.png` });
    const confirmationResponse = page.waitForResponse(response => /\/imports\/[^/]+\/confirm/.test(response.url()) && response.request().method() === "POST");
    await page.locator("#btnImportConfirm").click();
    const confirmation = await (await confirmationResponse).json();
    await page.locator('#importResult .result-card[data-result-stage="confirm"]').waitFor();
    if (includePermanent) assert.match(await page.locator("#importResult .result-brief").innerText(), /未选择的笔记没有写入/);
    const created = confirmation.result?.createdFiles || [];
    assert.equal(created.filter(item => item.noteType === "permanent").length, 0);
    assert.equal(created.filter(item => item.noteType === "literature").length, 2);
    assert.equal(created.filter(item => item.noteType === "source").length, 2);
    const submitted = (await confirmationResponse).request().postDataJSON();
    assert.equal(submitted.overrideOriginality, undefined);
    assert.equal(submitted.originalityPlan, undefined);
    await assertSourceUnchanged();
    await page.screenshot({ path: `${output}/confirmed-${width}.png` });
    const followup = page.locator('[data-import-writing-action="open-literature-queue"]');
    const primaryCount = await page.locator("#importResult [data-import-writing-action].primary:visible").count();
    await followup.click();
    const first = created.find(item => item.noteType === "literature");
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, first.noteId);
    const modalVisible = await page.locator("#importOperationResultModal").isVisible();
    t.diagnostic(`followup primaryCount=${primaryCount}, modalVisible=${modalVisible}`);
    assert.equal(modalVisible, false, "The import result must not cover the editor after continuing");
    assert.equal(primaryCount, 1, "Completed import has exactly one primary next action");
    const imported = await read(first.noteId);
    assert.match(imported.body, /检验理解|读书交流/);
    const body = `# 整理导入的阅读记录\n\n## 出处\n\n- 标题：读书交流记录\n- 链接 / 文件：${source}/reading.md\n- 页码 / 定位：交流记录第一段\n\n## 原文\n\n松柏读书组发现：能够复述结论，不代表能解释结论成立的前提。\n\n## 我的理解\n\n复述结论只是记住文字，解释前提才是在检验理解。\n`;
    if (!await page.locator("#editorHost .cm-content:visible").isVisible()) await page.locator("#btnModeToggle").click();
    await page.locator("#editorHost .cm-content:visible").click();
    await page.keyboard.press("Control+a");
    await page.keyboard.insertText(body);
    await page.keyboard.press("Control+s");
    await waitFor(async () => assert.equal((await read(first.noteId)).body.trim(), body.trim()));
    await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
    await page.locator("#btnRecordPermanent").click();
    await page.locator("#permanentNoteCreate").click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id !== id && !window.__prototypeEditor.savingPromise, first.noteId);
    const judgmentId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
    await page.locator("#btnShowRelated").click();
    const panel = page.locator("#relatedPanel");
    const claim = "讲清结论成立的前提，才能检查自己是否真正理解。";
    await panel.locator('textarea[name="thesis"]').fill(claim);
    await panel.locator('textarea[name="startingQuestion"]').fill("怎样知道自己读懂了？");
    if (await panel.locator('textarea[name="thesisChangeReason"]').isVisible()) await panel.locator('textarea[name="thesisChangeReason"]').fill("从复述文字转为解释条件。");
    await panel.getByRole("button", { name: "保存当前观点", exact: true }).click();
    await waitFor(async () => assert.equal((await read(judgmentId)).thesis, claim));
    const judgment = await read(judgmentId);
    assert.ok(judgment.body.includes(`[[${first.noteId}|`));
    assert.match(await fs.readFile(path.join(vaultPath, judgment.markdownPath), "utf8"), new RegExp(claim));
    assert.ok((await read(first.noteId)).body.includes(`[[${judgmentId}|`));
    await assertSourceUnchanged();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `${output}/judgment-${width}.png` });
    await panel.locator("#btnHideRelated").click();
    const destination = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-default-export-"));
    t.after(() => fs.rm(destination, { recursive: true, force: true }));
    await page.locator('.rail-btn[data-module="settings"]').click();
    assert.equal(await page.locator("#importOperationResultModal").isVisible(), false, "A completed result stays dismissed on return");
    if (width === 1366) await page.locator('[data-settings-item="import-export"]').click();
    else await page.locator("#settingsMobileItemSelect").selectOption("import-export");
    await page.locator("#importWorkspaceTabExport").click();
    await page.locator("#exportDirectoryId").selectOption("dir_original_default");
    await page.locator("#exportTargetPath").fill(destination);
    await page.locator("#btnExportMarkdown").click();
    await page.locator('#exportResult .result-card[data-result-stage="export_markdown"]').waitFor();
    const exported = await fs.readdir(destination, { recursive: true });
    const exportedBodies = await Promise.all(exported.filter(file => file.endsWith(".md")).map(file => fs.readFile(path.join(destination, file), "utf8")));
    assert.ok(exportedBodies.some(body => body.includes(claim)));
    await assertSourceUnchanged();
    assert.deepEqual(errors, []);
  });
  }
}
