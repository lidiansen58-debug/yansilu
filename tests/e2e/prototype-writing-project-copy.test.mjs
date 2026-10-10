import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { optionalPlaywright, startPrototypeStack, fetchJson } from "./prototype-copy-test-helpers.mjs";
import { createManualWritingTheme, findWritingProject } from "./prototype-writing-flow-helpers.mjs";
import { createWritingSourceFixture, captureWritingSources } from "./prototype-writing-topic-repair-flow-helpers.mjs";

test("the visible article flow derives intent and takeaway and exports Chinese source and boundary guidance", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack, notes = await createWritingSourceFixture(stack), title = "组织理解与依据";
  await createManualWritingTheme(stack, notes, { title });
  const assertSourcesUnchanged = await captureWritingSources(stack, notes);
  let aiExecutions = 0;
  page.on("request", req => { if (req.method() === "POST" && new URL(req.url()).pathname === "/api/v1/writing/ai-analysis") aiExecutions++; });
  assert.equal(await page.locator("#btnWritingCreateProject").isVisible(), false);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = await findWritingProject(stack, notes, title);
  assert.ok(project.intent.trim()); assert.ok(project.desired_reader_takeaway.trim());
  const scaffold = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
  for (const [id, label] of [["writing_intent", "写作意图"], ["reader_takeaway", "读者收获"], ["counterpoint_boundary", "反方与边界"]]) {
    const check = scaffold.preflight.checks.find(item => item.id === id);
    assert.equal(check.status, "pass"); assert.equal(check.label, label); assert.match(check.message, /[\u4e00-\u9fff]/);
  }
  assert.equal(await page.locator("#writingResult").isVisible(), false);
  assert.doesNotMatch(await page.locator("#writingPanel").innerText(), /写作篮|脚手架|scaffold|desired_reader_takeaway|writing_intent|wp_[a-f0-9]+/);
  const downloaded = page.waitForEvent("download");
  await page.locator("#writingMoreMenu > summary").click();
  await page.locator("#btnWritingExportScaffold").click();
  const markdown = await fs.readFile(await (await downloaded).path(), "utf8");
  assert.ok(markdown.includes(`写作意图：${project.intent}`));
  assert.ok(markdown.includes(`读者收获：${project.desired_reader_takeaway}`));
  assert.match(markdown, /## 文章提纲/);
  for (const note of notes) { assert.ok(markdown.includes(`[[${note.title}]]`)); assert.ok(markdown.includes(note.boundaryOrCounterpoint)); }
  assert.doesNotMatch(markdown, /Writing intent|Reader takeaway|Which disagreement|desired_reader_takeaway|wp_[a-f0-9]+/);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item, scaffold);
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
  await assertSourcesUnchanged(); assert.equal(aiExecutions, 0);
});
