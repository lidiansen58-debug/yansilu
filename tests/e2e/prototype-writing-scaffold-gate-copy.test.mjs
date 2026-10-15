import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";
import { addWritingSupportNotes, createManualWritingTheme, findWritingProject } from "./prototype-writing-flow-helpers.mjs";

test("prototype visible outline action prepares one project and reuses it on regeneration", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, apiBase } = stack;
  const source = (await createWritingReadyPermanentNote(apiBase, {
    title: "检验理解", body: "# 检验理解\n\n用自己的话解释能够暴露理解中的缺口。",
    thesis: "解释能够暴露理解中的缺口。", threeLineSummary: ["写出自己的解释。", "核对遗漏的依据。", "先阅读材料再检验理解。"],
    boundaryOrCounterpoint: "这不适用于尚未阅读材料的情形。"
  })).json.item;
  const notes = await addWritingSupportNotes(apiBase, source);
  const title = "提纲自动准备文章";
  await createManualWritingTheme(stack, notes, { title });
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  assert.equal(await page.locator("#btnWritingCreateProject").isVisible(), false);
  assert.equal(await page.locator("#btnWritingCreateScaffold").isEnabled(), true);
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const project = await findWritingProject(stack, notes, title);
  assert.ok(project.scaffold_id);
  const first = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
  assert.deepEqual([...new Set(first.sections.flatMap(section => section.evidence_note_ids))].sort(), notes.map(note => note.id).sort());
  await page.locator('[data-writing-tab="theme"]').click();
  await page.locator("#btnWritingCreateScaffold").click();
  await waitFor(async () => {
    const projects = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items;
    assert.equal(projects.length, 1);
    assert.equal(projects[0].id, project.id);
    assert.notEqual(projects[0].scaffold_id, first.id);
  });
  const versions = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}/scaffolds?limit=50`)).json.items;
  assert.equal(versions.length, 2);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/draft-scaffolds/${first.id}`)).json.item.sections, first.sections);
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${source.id}`)).json.item.body, source.body);
});
