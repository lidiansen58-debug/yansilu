import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createWritingReadyPermanentNote, fetchJson, putJson, postJson, waitFor } from "./prototype-copy-test-helpers.mjs";
import { createManualWritingTheme, findWritingProject } from "./prototype-writing-flow-helpers.mjs";
import { collectDistillationQualityWarnings } from "../../packages/domain/src/distillation-quality.mjs";

export async function runVisibleWritingQualityFlow(stack, mode) {
  const { page, apiBase, webBase, vaultPath } = stack;
  const checkId = mode === "unconfirmed" ? "confirmed_distillation" : "distillation_quality";
  const notes = [], healthy = [];
  for (const [index, title] of ["表达判断", "核对依据", "记录边界"].entries()) {
    const payload = { title, body: `# ${title}\n\n保留作者的中文 café 🌿 正文与 [[内部链接]]。`,
      thesis: ["用自己的话解释能够暴露理解中的遗漏。", "回到材料核对能够区分事实和自己的解释。", "记录适用条件能够说明判断在何处成立。"][index],
      threeLineSummary: ["解释和核对材料能够检验理解中的遗漏。", "明确的依据能够帮助区分表达流畅和真正理解。", "保留核对过程可以让后续文章回到具体来源。"],
      boundaryOrCounterpoint: "尚未阅读材料时，需要先阅读，不能只凭表达是否流畅判断。" };
    healthy.push(payload);
    notes.push((await createWritingReadyPermanentNote(apiBase, { ...payload,
      ...(index === 0 && mode === "unconfirmed" ? { distillationStatus: "draft" } : {}),
      ...(index === 0 && mode === "repetitive" ? { threeLineSummary: ["重复的概括没有区分理由和用途。", "重复的概括没有区分理由和用途。", "重复的概括没有区分理由和用途。"] } : {})
    })).json.item);
  }
  for (const note of notes.slice(1)) assert.deepEqual(collectDistillationQualityWarnings(note), []);
  assert.deepEqual(collectDistillationQualityWarnings(notes[0]).map(item => item.id), mode === "repetitive" ? ["summary_repetitive"] : []);
  for (const target of notes.slice(1)) assert.equal((await postJson(apiBase, `/api/v1/notes/${notes[0].id}/relations`, {
    toNoteId: target.id, relationType: "supports", rationale: "核对依据与适用条件支撑对理解的判断。"
  })).status, 201);
  let aiExecutions = 0;
  page.on("request", req => { if (req.method() === "POST" && new URL(req.url()).pathname === "/api/v1/writing/ai-analysis") aiExecutions++; });
  const title = mode === "unconfirmed" ? "确认观点后再核对提纲" : "区分概括中的理由和用途";
  await createManualWritingTheme(stack, notes, { title });
  const baseline = await Promise.all(notes.map(async note => (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item));
  const files = await Promise.all(notes.map(note => fs.readFile(path.join(vaultPath, note.markdownPath))));
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = await findWritingProject(stack, notes, title);
  const readScaffold = async () => (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
  const scaffold = await readScaffold(), issue = scaffold.preflight.checks.find(item => item.id === checkId);
  assert.equal(issue.status, "warning"); assert.deepEqual(issue.targetNoteIds, [notes[0].id]);
  if (mode === "unconfirmed") { assert.equal(issue.count, 2); assert.equal(issue.total, 3); }
  else assert.deepEqual(issue.warningIds, ["summary_repetitive"]);
  const notices = page.locator("#writingScaffoldPreview .writing-outline-source-notices");
  await waitFor(async () => {
    assert.equal(await notices.isVisible(), true);
    const text = await notices.innerText();
    assert.match(text, mode === "unconfirmed" ? /1 条相关笔记.*观点.*确认/ : /1 条相关笔记.*观点.*完善/);
    assert.doesNotMatch(text, /thesis|distillation|basket|提纯|scaffold/);
    assert.equal(await notices.locator(`[data-writing-outline-source-note="${notes[0].id}"]`).count(), 1);
    assert.equal(await notices.locator("[data-writing-outline-source-note]").count(), 1);
  });
  const screenshotDir = process.env.WRITING_QUALITY_SCREENSHOT_DIR;
  if (screenshotDir) {
    await fs.mkdir(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, `${mode}-desktop.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  const sourceLink = notices.locator(`[data-writing-outline-source-note="${notes[0].id}"]`);
  await sourceLink.scrollIntoViewIfNeeded();
  const bounds = await sourceLink.boundingBox();
  assert.ok(bounds && bounds.height >= 44 && bounds.x >= 0 && bounds.x + bounds.width <= 321, JSON.stringify(bounds));
  if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, `${mode}-mobile.png`), fullPage: true });
  await sourceLink.click();
  await page.locator("#wysiwygHost:visible").waitFor();
  await waitFor(async () => assert.match(await page.locator("#wysiwygHost").innerText(), /保留作者的中文/));
  assert.deepEqual(await readScaffold(), scaffold);
  assert.deepEqual(await Promise.all(notes.map(async note => (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item)), baseline);
  for (const [index, note] of notes.entries()) assert.deepEqual(await fs.readFile(path.join(vaultPath, note.markdownPath)), files[index]);
  const repaired = await putJson(apiBase, `/api/v1/notes/${notes[0].id}`, { distillationStatus: "confirmed", threeLineSummary: healthy[0].threeLineSummary });
  assert.equal(repaired.status, 200, JSON.stringify(repaired.json)); assert.equal(repaired.json.item.body, notes[0].body);
  const repairedBytes = await fs.readFile(path.join(vaultPath, notes[0].markdownPath));
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator(`[data-writing-index-card-id="${project.related_index_ids[0]}"] button[data-writing-project-id="${project.id}"]`).click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  assert.equal(await page.locator("#writingScaffoldPreview [data-writing-outline-source-note]").count(), 0);
  const refreshed = await readScaffold();
  assert.equal(refreshed.preflight.checks.find(item => item.id === checkId).status, "pass");
  assert.deepEqual(refreshed.sections, scaffold.sections); assert.equal(refreshed.id, scaffold.id);
  assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
  assert.deepEqual(await fs.readFile(path.join(vaultPath, notes[0].markdownPath)), repairedBytes);
  for (const [index, note] of notes.entries()) if (index) assert.deepEqual(await fs.readFile(path.join(vaultPath, note.markdownPath)), files[index]);
  assert.equal(aiExecutions, 0);
}
