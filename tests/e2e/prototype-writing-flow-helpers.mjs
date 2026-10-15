import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, fetchJson, postJson, waitFor } from "./prototype-copy-test-helpers.mjs";

export async function addWritingSupportNotes(apiBase, source) {
  const notes = [source];
  for (const [title, thesis] of [["核对材料", "回到材料能够核对解释中遗漏的依据。"], ["考虑边界", "尚未理解材料时，需要先阅读再解释。"]]) {
    notes.push((await createWritingReadyPermanentNote(apiBase, {
      title, body: `# ${title}\n\n${thesis}\n\n这是一条独立合成的写作依据。`, thesis,
      threeLineSummary: [thesis, "判断需要联系明确的依据。", "适用条件不同，需要调整解释的方法。"],
      boundaryOrCounterpoint: "这不适用于尚未阅读材料的情况。"
    })).json.item);
  }
  for (let index = 1; index < notes.length; index++) {
    const relation = await postJson(apiBase, `/api/v1/notes/${source.id}/relations`, {
      toNoteId: notes[index].id, relationType: index === 1 ? "supports" : "qualifies",
      rationale: "材料核对与适用边界补充了当前判断的依据。", status: "confirmed"
    });
    assert.equal(relation.status, 201);
  }
  return notes;
}

export async function createManualWritingTheme(stack, notes, { title, centralQuestion = "怎样结合材料核对与适用边界检验理解？" }) {
  const { page, webBase } = stack;
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator('[data-writing-sidebar-action="related"]').click();
  await page.locator('#writingCandidateDetails > summary').click();
  for (const note of notes) {
    await page.locator(`#writingCandidateList [data-writing-action="add"][data-writing-note-id="${note.id}"]`).click();
  }
  await page.locator('#writingRelatedNotesPanel [data-writing-related-close]').click();
  await page.locator('#btnWritingSaveThemeIndex').click();
  for (const value of [title, centralQuestion]) {
    await page.locator('[data-text-input-field]:visible').fill(value);
    await page.locator('[data-text-input-confirm]:visible').click();
  }
  await page.locator('#writingTitle:visible').waitFor();
  assert.equal(await page.locator('#writingTitle').inputValue(), title);
}

export async function findWritingProject(stack, notes, title) {
  let project;
  await waitFor(async () => {
    project = (await fetchJson(stack.apiBase, "/api/v1/writing-projects?limit=50")).json.items.find(item => item.title === title);
    assert.ok(project?.id);
    assert.deepEqual([...project.basket_note_ids].sort(), notes.map(note => note.id).sort());
  }, 15000);
  return project;
}
