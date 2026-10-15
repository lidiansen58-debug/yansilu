import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createWritingReadyPermanentNote, optionalPlaywright, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";
import { addWritingSupportNotes, createManualWritingTheme, findWritingProject } from "./prototype-writing-flow-helpers.mjs";

test("prototype outline copy and export failures are visible and retry without altering saved content", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, apiBase } = stack;
  const source = (await createWritingReadyPermanentNote(apiBase, {
    title: "理解需要依据", body: "# 理解需要依据\n\n解释应当回到材料核对。", thesis: "回到材料能核对解释的依据。",
    threeLineSummary: ["写出解释。", "核对材料。", "根据适用条件调整。"], boundaryOrCounterpoint: "先阅读再解释。"
  })).json.item;
  const notes = await addWritingSupportNotes(apiBase, source);
  await createManualWritingTheme(stack, notes, { title: "提纲输出失败验收" });
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = await findWritingProject(stack, notes, "提纲输出失败验收");
  const readOutline = async () => (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
  const original = await readOutline();
  await page.evaluate(() => {
    const clipboard = navigator.clipboard;
    const write = clipboard.writeText.bind(clipboard);
    clipboard.writeText = async () => { throw new Error("剪贴板暂时不可用"); };
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = () => { throw new Error("下载暂时不可用"); };
    window.__restoreOutlineOutputTest = () => { clipboard.writeText = write; URL.createObjectURL = create; };
  });
  for (const [selector, message] of [["#btnWritingCopyScaffold", "复制文章提纲失败：剪贴板暂时不可用"],
    ["#btnWritingExportScaffold", "导出文章提纲失败：下载暂时不可用"]]) {
    await page.locator("#writingMoreMenu > summary").click();
    await page.locator(selector).click();
    await waitFor(async () => {
      assert.equal(await page.locator("#statusText").isVisible(), true);
      assert.equal(await page.locator("#statusText").innerText(), message);
    });
    assert.equal(await page.locator("#writingMoreMenu").evaluate(menu => menu.open), false);
    assert.deepEqual(await readOutline(), original);
  }
  await page.evaluate(() => { window.__restoreOutlineOutputTest(); delete window.__restoreOutlineOutputTest; });
  const downloaded = page.waitForEvent("download");
  await page.locator("#writingMoreMenu > summary").click();
  await page.locator("#btnWritingExportScaffold").click();
  const download = await downloaded;
  assert.match(download.suggestedFilename(), /\.md$/);
  const output = await fs.readFile(await download.path(), "utf8");
  assert.match(output, /文章提纲/);
  assert.match(output, /理解需要依据/);
  assert.deepEqual(await readOutline(), original);
  for (const note of notes) assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.body, note.body);
});
