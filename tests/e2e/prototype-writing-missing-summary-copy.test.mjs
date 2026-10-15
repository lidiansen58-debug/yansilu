import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, postJson, putJson, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";
import { addWritingSupportNotes, createManualWritingTheme, findWritingProject } from "./prototype-writing-flow-helpers.mjs";

async function createPermanentNote(baseUrl, payload = {}) {
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    title: payload.title,
    body: payload.body,
    thesis: payload.thesis,
    threeLineSummary: payload.threeLineSummary,
    distillationStatus: "draft"
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));

  const noteId = created.json.item.id;
  const updated = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    title: payload.title,
    body: payload.body,
    status: "active",
    thesis: payload.thesis,
    threeLineSummary: payload.threeLineSummary,
    distillationStatus: "confirmed",
    originalityStatus: "pass",
    authorship: { user_confirmed: true, ai_assisted: false },
    authorshipConfirmed: true,
    authorshipAiAssisted: false
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
}

test("prototype missing-summary readiness message uses Chinese copy", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  const note = await createPermanentNote(apiBase, {
    title: "Writing Missing Summary Note",
    body: "# Writing Missing Summary Note\n\nA note still missing one summary line.",
    thesis: "A note with only two summary lines should show a Chinese warning.",
    threeLineSummary: ["one", "two"]
  });

  const notes = await addWritingSupportNotes(apiBase, note.json.item);
  await createManualWritingTheme(stack, notes, { title: "Missing Summary Project" });

  await page.click("#btnWritingCreateScaffold");
  await waitFor(async () => {
    const resultText = await page.locator("#writingPanel").innerText();
    assert.match(String(resultText || ""), /1 条相关笔记还需要补齐三句话提纯。/);
    assert.doesNotMatch(String(resultText || ""), /1 basket note\(s\) still need a three-line summary\./);
  }, 10000);
  const project = await findWritingProject(stack, notes, "Missing Summary Project");
  const scaffold = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
  assert.deepEqual(scaffold.preflight.checks.find(check => check.id === "basket_notes_missing_three_line_summary").targetNoteIds, [note.json.item.id]);
  await page.locator(`#writingScaffoldPreview [data-writing-outline-source-note="${note.json.item.id}"]`).click();
  await page.waitForFunction(id => window.__prototypeState.module === "explorer" && window.__prototypeState.selectedFileId === id, note.json.item.id);
  const fresh = (await fetchJson(apiBase, `/api/v1/notes/${note.json.item.id}`)).json.item;
  assert.equal(fresh.body, note.json.item.body);
  assert.deepEqual(fresh.threeLineSummary, ["one", "two"]);
});
