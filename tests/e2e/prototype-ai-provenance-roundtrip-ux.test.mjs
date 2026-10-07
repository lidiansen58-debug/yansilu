import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { parseMarkdownWithFrontmatter, serializeMarkdownWithFrontmatter } from "../../packages/domain/src/frontmatter.mjs";
import { optionalPlaywright, startPrototypeStack, fetchJson, postJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 320]) {
  test(`AI provenance survives real viewpoint saves and Markdown roundtrip without automatic author confirmation (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, vaultPath } = stack;
    page.setDefaultTimeout(15000);
    const source = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-ai-origin-source-"));
    const destination = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-ai-origin-export-"));
    const secondVault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-ai-origin-reimport-"));
    t.after(async () => { for (const dir of [source, destination, secondVault]) await fs.rm(dir, { recursive: true, force: true }); });
    const title = "解释结论时需要核对条件";
    const originalBody = `# ${title}\n\n我的判断来自阅读后的思考，曾使用 AI 辅助整理。`;
    const original = serializeMarkdownWithFrontmatter({ id: "pn_ai_origin", type: "permanent", title,
      thesis: "解释结论时，要核对它成立的条件。", distillation_status: "confirmed",
      authorship: { user_confirmed: true, ai_assisted: true } }, originalBody);
    await fs.writeFile(path.join(source, "claim.md"), original, "utf8");
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    const settings = async () => {
      await page.locator('.rail-btn[data-module="settings"]').click();
      if (width === 1366) await page.locator('[data-settings-item="import-export"]').click();
      else await page.locator("#settingsMobileItemSelect").selectOption("import-export");
    };
    const importFrom = async directory => {
      await settings();
      await page.locator("#importWorkspaceTabImport").click();
      await page.locator("#importPath").fill(directory);
      const pending = page.waitForResponse(r => r.url().includes("/imports/preview") && r.request().method() === "POST");
      await page.locator("#btnImportPreview").click();
      const preview = await (await pending).json();
      const candidate = preview.candidatePreview.permanentNotes.find(note => note.title === title);
      assert.ok(candidate);
      const saved = page.waitForResponse(r => /\/imports\/[^/]+\/confirm/.test(r.url()) && r.request().method() === "POST");
      await page.locator("#btnImportConfirm").click();
      assert.equal((await saved).status(), 200);
      await page.locator('[data-import-writing-action="open-today"]').click();
      return candidate.id;
    };
    const read = async id => {
      const response = await fetchJson(apiBase, `/api/v1/notes/${id}`);
      assert.equal(response.status, 200);
      return response.json.item;
    };
    const id = await importFrom(source);
    assert.deepEqual((await read(id)).authorship, { user_confirmed: false, ai_assisted: true });
    assert.ok((await read(id)).body.includes("我的判断来自阅读后的思考"));
    await page.locator("#btnToggleSearch").click();
    await page.locator("#globalNoteSearchInput").fill(title);
    await page.locator(`[data-search-note="${id}"]`).click();
    await page.locator("#btnShowRelated").click();
    const panel = page.locator("#relatedPanel");
    for (const [index, question] of ["这条解释什么时候不成立？", "这条解释还需要核对哪些条件？"].entries()) {
      await panel.locator('textarea[name="startingQuestion"]').fill(question);
      const confirming = page.waitForResponse(r => r.url().includes(`/permanent-notes/${id}/distillation/confirm`) && r.request().method() === "POST");
      await panel.getByRole("button", { name: "保存当前观点", exact: true }).click();
      assert.equal((await confirming).status(), 200);
      await waitFor(async () => assert.equal((await read(id)).startingQuestion, question));
      const note = await read(id);
      assert.deepEqual(note.authorship, { user_confirmed: true, ai_assisted: true });
      assert.equal(note.startingQuestion, question);
      assert.equal(note.distillationStatus, "confirmed");
      assert.ok(note.body.includes("我的判断来自阅读后的思考"), "Confirming a viewpoint must retain the original note prose");
      if (index === 0) await panel.locator('[data-note-association-next="edit"]').click();
    }
    await panel.locator("#btnHideRelated").click();
    await page.reload({ waitUntil: "networkidle" });
    await settings();
    await page.locator("#importWorkspaceTabExport").click();
    await page.locator("#exportDirectoryId").selectOption("dir_original_default");
    await page.locator("#exportTargetPath").fill(destination);
    await page.locator("#btnExportMarkdown").click();
    await page.locator('#exportResult .result-card[data-result-stage="export_markdown"]').waitFor();
    const file = (await fs.readdir(destination, { recursive: true })).find(file => file.endsWith(".md"));
    const exported = await fs.readFile(path.join(destination, file), "utf8");
    const metadata = parseMarkdownWithFrontmatter(exported).frontmatter;
    assert.equal(metadata.ai_assisted, true);
    assert.equal(metadata.authorship, undefined);
    assert.equal(metadata.distillation_status, undefined);
    const savedNote = await read(id);
    const savedBytes = await fs.readFile(path.join(vaultPath, savedNote.markdownPath), "utf8");
    assert.equal((await postJson(apiBase, "/api/v1/vault", { vaultPath: secondVault })).status, 200);
    await page.reload({ waitUntil: "networkidle" });
    const nextId = await importFrom(destination);
    assert.notEqual(nextId, id);
    assert.deepEqual((await read(nextId)).authorship, { user_confirmed: false, ai_assisted: true });
    assert.notEqual((await read(nextId)).distillationStatus, "confirmed");
    assert.equal(await fs.readFile(path.join(source, "claim.md"), "utf8"), original);
    assert.equal(await fs.readFile(path.join(vaultPath, savedNote.markdownPath), "utf8"), savedBytes);
    assert.equal(await fs.readFile(path.join(destination, file), "utf8"), exported);
    await waitFor(async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)));
  });
}
