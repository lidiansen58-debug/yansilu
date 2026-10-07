import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

const title = "阅读记录：解释后还要核对";
const quote = "一次读书交流中，记录者发现自己可以复述结论，却说不清这个结论成立的前提。";
const paraphrase = "记住结论还不够，能讲清它需要什么条件，才更接近真正理解。";
const claim = "解释自己的理解之后核对原文，可以发现遗漏的前提。";

for (const width of [1366, 390, 320]) {
  test(`literature task preserves the original and retelling while forming a traceable judgment (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, vaultPath } = stack;
    page.setDefaultTimeout(10000);
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const read = async id => {
      const result = await fetchJson(apiBase, `/api/v1/notes/${id}`);
      assert.equal(result.status, 200);
      return result.json.item;
    };
    const write = async text => {
      if (!await page.locator("#editorHost .cm-content:visible").isVisible()) await page.locator("#btnModeToggle").click();
      await page.locator("#editorHost .cm-content:visible").click();
      await page.keyboard.press("Control+a");
      await page.keyboard.insertText(text);
      await page.keyboard.press("Control+s");
      await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
    };
    const shot = async name => {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await fs.mkdir("output/playwright/core-literature", { recursive: true });
      await page.screenshot({ path: `output/playwright/core-literature/${name}-${width}.png`, fullPage: true });
    };
    try {
      await page.locator('[data-action="quick-literature"]').click();
      await page.locator(width > 920 ? "#btnNewNote" : "#btnMobileNewNote").click();
      await page.waitForFunction(() => window.__prototypeEditor.activeNote()?.noteType === "literature");
      const sourceId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
      const template = await page.evaluate(() => window.__prototypeEditor.getEditorValue());
      assert.deepEqual([...template.matchAll(/^## (.+)$/gm)].map(match => match[1]), ["出处", "原文", "我的理解"]);
      assert.equal((template.match(/^- /gm) || []).length, 3);
      assert.doesNotMatch(template, /判断种子|容器|年份|保留原因|DOI/);
      const emptyCompletion = await page.evaluate(() => window.__prototypeEditor.literatureCompletionState());
      assert.equal(emptyCompletion.hasOriginalText, false);
      assert.equal(emptyCompletion.hasParaphrase, false);
      assert.equal(emptyCompletion.readyForOriginal, false);
      await shot("00-default");
      const base = template.replace(/^# [^\n]+/, `# ${title}`)
        .replace("- 标题：", "- 标题：读书交流观察记录")
        .replace("## 原文\n", `## 原文\n\n${quote}`)
        .replace("## 我的理解\n", `## 我的理解\n\n${paraphrase}`);
      await write(base);
      const missing = await page.evaluate(() => window.__prototypeEditor.literatureCompletionState());
      assert.equal(missing.readyForOriginal, false);
      assert.deepEqual(missing.missingCitationFields, ["页码、章节或链接"]);
      assert.doesNotMatch(missing.hint, /作者|年份|判断种子/);
      const locator = width === 390 ? "https://example.test/reading-observation" : "第二次交流，第 2 段";
      const sourceBody = width === 390 ? base.replace("- 链接 / 文件：", `- 链接 / 文件：${locator}`)
        : base.replace("- 页码 / 定位：", `- 页码 / 定位：${locator}`);
      await write(sourceBody);
      await waitFor(async () => assert.equal((await read(sourceId)).body.trim(), sourceBody.trim()));
      const ready = await page.evaluate(() => ({
        completion: window.__prototypeEditor.literatureCompletionState(),
        lane: window.__prototypeEditor.literatureQueueRecord(window.__prototypeEditor.activeNote()).lane
      }));
      assert.equal(ready.completion.readyForOriginal, true);
      assert.equal(ready.completion.hasJudgmentSeed, false);
      assert.equal(ready.completion.hasQuestion, false);
      assert.equal(ready.lane, "ready");
      const source = await read(sourceId);
      assert.equal(source.noteType, "literature");
      assert.match(await fs.readFile(path.join(vaultPath, source.markdownPath), "utf8"), new RegExp(quote));
      await shot("01-source");
      await page.locator("#btnRecordPermanent").click();
      await page.locator("#permanentNoteCreate").click();
      await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id !== id && !window.__prototypeEditor.savingPromise, sourceId);
      const permanentId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
      const permanent = await read(permanentId);
      assert.equal(permanent.noteType, "permanent");
      assert.ok(permanent.body.includes(`[[${sourceId}|${title}]]`));
      assert.ok(permanent.body.includes(locator));
      assert.ok(!permanent.body.includes(quote), "The original quote must not become the user's claim");
      const linkedSource = await read(sourceId);
      assert.ok(linkedSource.body.includes(quote));
      assert.ok(linkedSource.body.includes(paraphrase));
      assert.ok(linkedSource.body.includes(`[[${permanentId}|`));
      await page.locator("#btnShowRelated").click();
      const panel = page.locator("#relatedPanel");
      await panel.locator('textarea[name="thesis"]').fill(claim);
      await panel.locator('textarea[name="startingQuestion"]').fill("怎样发现自己理解中的遗漏？");
      if (await panel.locator('textarea[name="thesisChangeReason"]').isVisible()) {
        await panel.locator('textarea[name="thesisChangeReason"]').fill("这次交流表明，记住结论并不等于理解前提。");
      }
      await panel.getByRole("button", { name: "保存当前观点", exact: true }).click();
      await waitFor(async () => {
        const saved = await read(permanentId);
        assert.equal(saved.thesis, claim);
        assert.ok(saved.body.includes(claim));
      });
      await shot("02-judgment");
      await panel.locator("#btnHideRelated").click();
      await waitFor(async () => assert.ok((await page.locator("#editorHost .cm-content:visible").innerText()).includes(claim)), 2000);
      await page.locator("#btnModeToggle").click();
      await page.locator(`#wysiwygHost [data-wikilink="${sourceId}|${title}"]:visible`).click();
      await page.locator(`.note-peek-actions [data-open-linked-note="${sourceId}"]`).click();
      await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, sourceId);
      assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), new RegExp(quote));
      await page.reload({ waitUntil: "networkidle" });
      await page.locator("#btnToggleSearch").click();
      await page.locator("#globalNoteSearchInput").fill("读书交流观察记录");
      await page.locator(`[data-search-note="${sourceId}"]`).click();
      await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, sourceId);
      assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), new RegExp(paraphrase));
      assert.equal((await read(permanentId)).thesis, claim);
      assert.match(await fs.readFile(path.join(vaultPath, linkedSource.markdownPath), "utf8"), new RegExp(paraphrase));
      assert.deepEqual(errors, []);
    } catch (error) {
      const client = await page.evaluate(() => ({
        note: window.__prototypeEditor.activeNote(),
        tab: window.__prototypeEditor.activeTab(),
        value: window.__prototypeEditor.getEditorValue(),
        status: document.querySelector("#statusBar")?.innerText
      })).catch(() => null);
      t.diagnostic(JSON.stringify({ client, persisted: client?.note?.id ? await read(client.note.id).catch(() => null) : null }));
      await shot("failure").catch(() => {});
      throw error;
    }
  });
}
