import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("moving a note through the explorer retains attachment locators after reload", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const { page, apiBase, webBase, vaultPath } = await startPrototypeStack(t, pw);
  page.setDefaultTimeout(7000);
  const directory = (await postJson(apiBase, "/api/v1/directories", { title: "附件定位目标目录", parentDirectoryId: "dir_original_default", directoryType: "custom", fsPath: path.join(vaultPath, "notes/original/deep") })).json.item;
  const literal = "`![[../../assets/files/代码.pdf#示例^block|字面量]]`";
  const source = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_original_default", body: `# 移动附件定位验证\n\n[第二页](<../../assets/files/材料 (最终).pdf#page=2>)\n\n![[../../assets/files/材料 (最终).pdf#第二页^block-1|我的材料]]\n\n${literal}` })).json.item;
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-original"]').click();
  const row = page.locator('.explorer-item[data-kind="file"]', { hasText: "移动附件定位验证" });
  await row.click({ button: "right" });
  await page.locator('#contextMenu button[data-action="move"]').click();
  await page.locator("#permanentNoteTargetFolder").selectOption(directory.id);
  await page.locator("#permanentNoteCreate").click();
  await waitFor(async () => {
    const moved = (await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item;
    assert.equal(moved.directoryId, directory.id);
    assert.ok(moved.body.includes("[第二页](<../../../assets/files/材料 (最终).pdf#page=2>)"));
    assert.ok(moved.body.includes("![[../../../assets/files/材料 (最终).pdf#第二页^block-1|我的材料]]"));
    assert.ok(moved.body.includes(literal));
    assert.ok((await fs.readFile(path.join(vaultPath, moved.markdownPath), "utf8")).includes("#第二页^block-1|我的材料"));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${source.id}"]`).click();
  await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, source.id);
  const body = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
  assert.ok(body.includes("#page=2>"));
  assert.ok(body.includes("#第二页^block-1|我的材料]]"));
  assert.ok(body.includes(literal));
});
