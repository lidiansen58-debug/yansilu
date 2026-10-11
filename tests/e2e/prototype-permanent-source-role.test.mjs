import test from "node:test";
import assert from "node:assert/strict";
import { defaultPermanentTemplateSource } from "../../apps/web/src/prototype-note-templates.js";
import {
  optionalPlaywright, startPrototypeStack, createWritingReadyPermanentNote, fetchJson, waitFor
} from "./prototype-copy-test-helpers.mjs";

test("permanent editor saves and reopens distinct source and related sections", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  const title = "来源和相关笔记保存验证";
  const created = await createWritingReadyPermanentNote(apiBase, {
    title, body: defaultPermanentTemplateSource(title), thesis: "来源与延伸笔记用途不同。"
  });
  const id = created.json.item.id;
  const open = async () => {
    await page.locator("#btnToggleSearch").click();
    await page.locator("#globalNoteSearchInput").fill(title);
    await page.locator(`[data-search-note="${id}"]`).click();
    await page.waitForFunction((id) => window.__prototypeEditor.activeNote()?.id === id, id);
  };
  await open();
  if (!await page.locator("#markdownSplit").evaluate((node) => node.classList.contains("editor-mode-source"))) {
    await page.locator("#btnModeToggle").click();
  }
  const draft = defaultPermanentTemplateSource(title)
    .replace("来自哪条文献笔记、经验、案例或观察？", "来源 [[source-note]]。")
    .replace("它接下来适合连接到哪些已有笔记、可写主题或写作方向？", "延伸 [[related-note]]。");
  const content = page.locator("#editorHost .cm-content");
  await content.click();
  await content.press("Control+a");
  await page.keyboard.insertText(draft);
  await waitFor(async () => assert.equal(
    await page.evaluate(() => window.__prototypeEditor.getEditorValue()), draft
  ));
  await content.press("Control+s");
  const verify = async () => {
    const result = await fetchJson(apiBase, `/api/v1/notes/${id}`);
    assert.equal(result.status, 200);
    const body = result.json.item.body;
    assert.match(body, /## 证据 \/ 来源\s+来源 \[\[source-note\]\]。/);
    assert.match(body, /## 相关笔记\s+延伸 \[\[related-note\]\]。/);
    assert.equal(body.split("\n").filter((line) => line === "## 相关笔记").length, 1);
  };
  await waitFor(verify, 10000);
  await page.reload();
  await open();
  await waitFor(async () => {
    const value = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
    assert.match(value, /## 证据 \/ 来源/);
    assert.match(value, /来源 \[\[source-note\]\]。/);
    assert.match(value, /延伸 \[\[related-note\]\]。/);
  });
  await verify();
});
