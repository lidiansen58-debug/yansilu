import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createWritingReadyPermanentNote, fetchJson, postJson, waitFor } from "./prototype-copy-test-helpers.mjs";

export async function runVisibleWritingReadinessFlow({ page, apiBase, webBase }, { prepared, sourceBoundary = "" }) {
  const prefix = prepared ? "Readiness Project" : "Readiness Basket";
  const create = async (suffix, link = "") => {
    const title = `${prefix} ${suffix}`;
    const thesis = {
      Note: "用自己的话解释后再核对材料，能够发现表达中遗漏的事实依据。",
      Target: "回到原有材料核对事实，能够区分自己的解释与材料实际给出的证据。",
      Context: "将每次核对记录下来，能够保留判断变更的依据，方便后续文章追溯。"
    }[suffix];
    const boundary = {
      Note: "没有阅读材料时，应先阅读，不能以表达流畅代替事实依据。",
      Target: "来源无法访问时，暂不将这条判断作为已经证实的事实。",
      Context: "此处只保存核对依据，不替代更全面的论证或事实验证。"
    }[suffix];
    const response = await createWritingReadyPermanentNote(apiBase, {
      title, body: `# ${title}\n\n${link}先用自己的话解释，再回到材料核对遗漏的依据。\n\n${thesis}`,
      thesis,
      threeLineSummary: [
        thesis,
        "核对记录与原有材料让自己的解释有明确的参照，不只凭表达是否流畅判断。",
        "将这项记录用于组织文章段落，可以在后来写作时回到具体依据。"
      ],
      boundaryOrCounterpoint: prepared ? (suffix === "Note" && sourceBoundary ? sourceBoundary : boundary) : ""
    });
    const note = response.json.item;
    assert.equal(note.status, "active");
    assert.equal(note.authorship.user_confirmed, true);
    assert.equal(note.originalityStatus, "pass");
    assert.equal(note.distillationStatus, "confirmed");
    assert.equal(Boolean(note.boundaryOrCounterpoint), prepared);
    if (!prepared) assert.doesNotMatch(note.body, /边界|反例|不成立|适用条件|反方|counterpoint|boundary|counterexample/i);
    return note;
  };
  const target = await create("Target");
  const source = await create("Note", prepared ? `[[${target.title}]]\n\n` : "");
  const third = await create("Context");
  const notes = [source, target, third];
  if (prepared) assert.equal((await postJson(apiBase, `/api/v1/notes/${source.id}/relations`, {
    toNoteId: target.id, relationType: "supports", rationale: "核对原有材料能够为自己的解释提供可追溯的事实依据。"
  })).status, 201);
  const before = await Promise.all(notes.map(async note => (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item));
  const beforeRelations = (await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`)).json.item;
  if (prepared) assert.equal(beforeRelations.outgoingLinks.filter(link => link.relationType === "supports").length, 1);
  else assert.deepEqual(beforeRelations.outgoingLinks, []);
  let aiExecutions = 0;
  page.on("request", request => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/v1/writing/ai-analysis") aiExecutions++;
  });

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${source.id}"]`).click();
  await waitFor(async () => assert.match(await page.locator("#wysiwygHost:visible").innerText(), /先用自己的话解释/));
  await page.locator('.rail-btn[data-module="writing"]').click();
  const openCandidates = async () => {
    await page.locator('[data-writing-sidebar-action="related"]').click();
    if (!(await page.locator("#writingCandidateList:visible").isVisible())) await page.locator("#writingCandidateDetails > summary").click();
  };
  const add = note => page.locator(`#writingCandidateList [data-writing-action="add"][data-writing-note-id="${note.id}"]`).click();
  await openCandidates();
  await add(source);
  await waitFor(async () => assert.equal(await page.locator(`#writingBasketList article[data-writing-note-id="${source.id}"]`).isVisible(), true));
  await page.locator("#writingRelatedNotesPanel [data-writing-related-close]").click();
  if (!prepared) {
    await page.locator("#btnWritingSaveThemeIndex").click();
    await waitFor(async () => assert.match(await page.locator("#statusText").innerText(), /选择至少 3 条永久笔记/));
    assert.equal(await page.locator("[data-text-input-field]:visible").count(), 0);
    assert.equal(await page.locator("#btnWritingCreateScaffold").isVisible(), false);
    assert.equal(await page.locator("#btnWritingOutlineCheckPlaceholder").isVisible(), false);
    assert.deepEqual((await fetchJson(apiBase, "/api/v1/index-cards?limit=50")).json.items, []);
    assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  }
  await openCandidates();
  await add(target); await add(third);
  await page.locator("#writingRelatedNotesPanel [data-writing-related-close]").click();
  await page.locator("#btnWritingSaveThemeIndex").click();
  const title = `${prefix} visible theme`;
  for (const value of [title, "怎样通过材料核对检验自己的解释？"]) {
    await page.locator("[data-text-input-field]:visible").fill(value);
    await page.locator("[data-text-input-confirm]:visible").click();
  }
  await page.locator("#writingTitle:visible").waitFor();
  assert.equal(await page.locator("#writingTitle").inputValue(), title);
  assert.equal(await page.locator("#btnWritingCreateProject").isVisible(), false);
  assert.equal(await page.locator("#btnWritingStrongModelAnalysis").isVisible(), false);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const projects = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items;
  assert.equal(projects.length, 1);
  const project = projects[0];
  assert.equal(project.title, title);
  assert.deepEqual([...project.basket_note_ids].sort(), notes.map(note => note.id).sort());
  const scaffold = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
  for (const id of ["source_files", "source_note_types", "confirmed_distillation", "topic_entry"]) {
    assert.equal(scaffold.preflight.checks.find(check => check.id === id).status, "pass", id);
  }
  const boundary = scaffold.preflight.checks.find(check => check.id === "counterpoint_boundary");
  assert.equal(boundary.status, prepared ? "pass" : "warning");
  assert.equal(boundary.count, prepared ? 3 : 0);
  assert.match(boundary.message, prepared ? /3 条相关笔记已经带有反方或边界/ : /至少先补一条反方或边界/);
  assert.equal(scaffold.preflight.checks.find(check => check.id === "distillation_quality").status, prepared ? "pass" : "warning");
  assert.equal(scaffold.preflight.status, prepared ? "ready" : "needs_attention");
  assert.deepEqual([...new Set(scaffold.sections.flatMap(section => section.evidence_note_ids))].sort(), notes.map(note => note.id).sort());
  assert.equal(await page.locator('[data-writing-outline-field="heading"]:visible').count(), scaffold.sections.length);
  const downloaded = page.waitForEvent("download");
  await page.locator("#writingMoreMenu > summary").click();
  await page.locator("#btnWritingExportScaffold").click();
  const markdown = await fs.readFile(await (await downloaded).path(), "utf8");
  for (const note of notes) assert.ok(markdown.includes(`[[${note.title}]]`));
  assert.ok(markdown.includes(prepared
    ? `在「${source.title}」这一段里，要正面处理哪条反方或边界：${source.boundaryOrCounterpoint}`
    : `「${source.title}」这一段还应该补出哪条反方、限制或例外？`));
  assert.deepEqual(await Promise.all(notes.map(async note => (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item)), before);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`)).json.item, beforeRelations);
  assert.equal(aiExecutions, 0, "Local note selection, theme and outline must not execute AI automatically");
  return { source, project, scaffold, markdown };
}
