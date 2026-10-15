import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createWritingReadyPermanentNote, optionalPlaywright, fetchJson, startPrototypeStack } from "./prototype-copy-test-helpers.mjs";
import { addWritingSupportNotes, createManualWritingTheme, findWritingProject } from "./prototype-writing-flow-helpers.mjs";

test("visible writing outline and downloaded brief use Chinese readiness labels", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;
  const note = (await createWritingReadyPermanentNote(apiBase, {
    title: "解释与核对", body: "# 解释与核对\n\n解释后需要回到材料核对。",
    thesis: "回到材料核对能够发现解释中的遗漏。",
    threeLineSummary: ["先尝试解释。", "再核对依据。", "根据适用条件调整解释。"],
    boundaryOrCounterpoint: "尚未阅读材料时，需要先阅读。"
  })).json.item;
  const notes = await addWritingSupportNotes(apiBase, note);
  const title = "理解与依据的写作验收";
  await createManualWritingTheme(stack, notes, { title });
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = await findWritingProject(stack, notes, title);
  const scaffold = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
  assert.ok(project.intent);
  assert.ok(project.desired_reader_takeaway);
  for (const [id, label] of [["writing_intent", "写作意图"], ["reader_takeaway", "读者收获"]]) {
    const check = scaffold.preflight.checks.find(item => item.id === id);
    assert.equal(check.label, label);
    assert.equal(check.status, "pass");
    assert.match(check.message, /[\u4e00-\u9fff]/);
  }
  assert.equal(await page.locator("#writingResult").isVisible(), false);
  assert.doesNotMatch(await page.locator("#writingPanel").innerText(), /desired_reader_takeaway|writing_intent|reader_takeaway/);
  const downloaded = page.waitForEvent("download");
  await page.locator("#writingMoreMenu > summary").click();
  await page.locator("#btnWritingExportScaffold").click();
  const download = await downloaded;
  assert.match(download.suggestedFilename(), /\.md$/);
  const markdown = await fs.readFile(await download.path(), "utf8");
  for (const [label, value] of [["写作意图", project.intent], ["读者收获", project.desired_reader_takeaway]]) {
    assert.ok(markdown.includes(`${label}：${value}`));
    assert.equal(markdown.split(`${label}：`).length, 2);
  }
  assert.match(markdown, /## 文章提纲/);
  for (const source of notes) {
    assert.ok(markdown.includes(`[[${source.title}]]`));
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body, source.body);
  }
  assert.doesNotMatch(markdown, /desired_reader_takeaway|writing_intent|reader_takeaway|wp_[a-f0-9]+|pn_[a-f0-9]+/);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item, scaffold);
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
});
