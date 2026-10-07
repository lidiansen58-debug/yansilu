import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { optionalPlaywright, startPrototypeStack, waitFor, fetchJson } from "./prototype-copy-test-helpers.mjs";

async function selectTemplate(page, kind, width) {
  const item = `${kind}-template`;
  if (width > 920) await page.locator(`[data-settings-item="${item}"]`).click();
  else await page.locator("#settingsMobileItemSelect").selectOption(item);
  await page.locator(`#settings${kind === "permanent" ? "Permanent" : "Literature"}TemplateEditor`).waitFor({ state: "visible" });
}

for (const width of [1366, 390, 320]) {
  test(`template editing, failure/retry, preview focus and persistence at ${width}px`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase } = stack;
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    await page.locator('.rail-btn[data-module="settings"]').click();
    await selectTemplate(page, "permanent", width);
    const editor = page.locator("#settingsPermanentTemplateEditor");
    const original = await editor.inputValue();
    const draft = `${original}\n\n## 我的例子\n\n用反馈检验自己是否真正理解。`;
    await editor.fill(draft);
    await waitFor(async () => assert.equal(await page.locator("#settingsPermanentTemplateFeedback").isVisible(), true));
    assert.match(await page.locator("#settingsPermanentTemplateFeedbackText").innerText(), /未保存/);
    await selectTemplate(page, "literature", width);
    await selectTemplate(page, "permanent", width);
    assert.equal(await editor.inputValue(), draft);
    await page.evaluate(() => {
      window.__templateSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key.startsWith("yansilu:settings:note-template:")) throw new DOMException("验收模拟空间不足", "QuotaExceededError");
        return window.__templateSetItem.call(this, key, value);
      };
    });
    const save = page.locator('[data-settings-template-kind="permanent"] [data-settings-template-action="save"]');
    await save.click();
    await waitFor(async () => assert.match(await page.locator("#settingsPermanentTemplateFeedbackText").innerText(), /保存失败.*验收模拟空间不足/));
    assert.equal(await editor.inputValue(), draft);
    assert.equal(await page.evaluate(() => Object.values(localStorage).some(value => value.includes("## 我的例子"))), false);
    await page.evaluate(() => { Storage.prototype.setItem = window.__templateSetItem; });
    await save.click();
    await waitFor(async () => assert.match(await page.locator("#settingsPermanentTemplateFeedbackText").innerText(), /已保存/));
    assert.equal(await page.evaluate(() => Object.values(localStorage).some(value => value.includes("## 我的例子"))), true);

    const preview = page.locator('[data-settings-template-kind="permanent"] [data-settings-template-action="preview"]');
    await preview.click();
    await page.locator("#settingsTemplatePreviewModal.is-open").waitFor();
    assert.match(await page.locator("#settingsTemplatePreviewBody").innerText(), /我的例子/);
    assert.equal(await page.locator("#settingsTemplatePreviewClose").evaluate(node => node === document.activeElement), true);
    const modalLayout = await page.locator(".settings-template-preview-dialog").evaluate(node => {
      const rect = node.getBoundingClientRect();
      const close = document.querySelector("#settingsTemplatePreviewClose").getBoundingClientRect();
      return { left: rect.left, right: rect.right, scroll: node.scrollWidth, width: node.clientWidth, closeBottom: close.bottom, height: innerHeight };
    });
    assert.ok(modalLayout.left >= 0 && modalLayout.right <= width && modalLayout.scroll <= modalLayout.width + 1 && modalLayout.closeBottom <= modalLayout.height, JSON.stringify(modalLayout));
    assert.equal(await page.locator("#settingsTemplatePreviewTitle").evaluate(node => {
      const rect = node.getBoundingClientRect();
      return document.elementFromPoint(rect.left + 2, rect.top + rect.height / 2) === node;
    }), true, "Preview title must not be covered by navigation");
    await fs.mkdir("output/playwright/settings-goal", { recursive: true });
    await page.screenshot({ path: `output/playwright/settings-goal/template-preview-${width}.png` });
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#settingsTemplatePreviewClose").evaluate(node => node === document.activeElement), true);
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.locator("#settingsTemplatePreviewClose").evaluate(node => node === document.activeElement), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#settingsTemplatePreviewModal").isVisible(), false);
    assert.equal(await preview.evaluate(node => node === document.activeElement), true);
    const layout = await page.evaluate(() => {
      const stage = document.querySelector("#moduleWorkspace .module-stage");
      return { scroll: stage.scrollWidth, width: stage.clientWidth, duplicateHead: !!document.querySelector(".settings-template-editor-head"), primary: [...document.querySelectorAll('#moduleWorkspace .primary')].filter(node => node.getClientRects().length).length };
    });
    assert.ok(layout.scroll <= layout.width + 1, JSON.stringify(layout));
    assert.equal(layout.duplicateHead, false);
    assert.equal(layout.primary, 1);
    await fs.mkdir("output/playwright/settings-goal", { recursive: true });
    await page.screenshot({ path: `output/playwright/settings-goal/template-${width}.png` });
    if (width === 1366) {
      await page.locator("#settingsSidebarBackToApp").click();
      await page.locator('[data-action="quick-original"]').click();
      await page.locator("#btnNewNote").click();
      await waitFor(async () => assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), /## 我的例子/));
      const id = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
      await waitFor(async () => assert.match((await fetchJson(apiBase, `/api/v1/notes/${id}`)).json.item.body, /## 我的例子/));
    }
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('.rail-btn[data-module="settings"]').click();
    await selectTemplate(page, "permanent", width);
    assert.equal((await editor.inputValue()).trim(), draft.trim());
    await page.locator('[data-settings-template-kind="permanent"] [data-settings-template-action="reset"]').click();
    await waitFor(async () => assert.match(await page.locator("#settingsPermanentTemplateFeedbackText").innerText(), /恢复默认/));
    assert.equal((await editor.inputValue()).trim(), original.trim());

    await selectTemplate(page, "literature", width);
    const literature = page.locator("#settingsLiteratureTemplateEditor");
    const valid = await literature.inputValue();
    await literature.fill("# 不完整的文献模板\n\n## 核心观点\n\n## 为什么成立");
    assert.equal(await page.locator('[data-settings-template-kind="literature"] [data-settings-template-action="save"]').isDisabled(), true);
    assert.match(await page.locator("#settingsLiteratureTemplateFeedbackText").innerText(), /不能保存/);
    await literature.fill(`${valid}\n\n### 自定来源说明\n\n保留页码便于查证。`);
    await page.locator('[data-settings-template-kind="literature"] [data-settings-template-action="save"]').click();
    await waitFor(async () => assert.match(await page.locator("#settingsLiteratureTemplateFeedbackText").innerText(), /已保存/));
    assert.deepEqual(errors, []);
  });
}
